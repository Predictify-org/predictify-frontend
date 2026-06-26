import crypto from 'crypto';
import { logger, withWebhookContext, getCorrelationContext } from './logger';
import { getActiveSigningSecrets } from '@/app/lib/webhook-secrets';

/**
 * Idempotent webhook delivery with exponential backoff + full jitter and DLQ support.
 *
 * ## Retry schedule
 * Delay formula (full-jitter variant — best for avoiding thundering herd):
 *
 *   cap   = min(maxDelayMs, initialDelayMs * backoffMultiplier ^ attempt)
 *   delay = random_between(0, cap)
 *
 * Full jitter spreads retries uniformly across [0, cap] rather than adding a
 * small random fraction on top of a deterministic base. This is the approach
 * recommended by the AWS Architecture Blog ("Exponential Backoff And Jitter").
 *
 * ## Status classification
 * - 2xx              → success, no retry
 * - 4xx (except 408, 429) → non-retryable client error, go straight to DLQ
 * - 408, 429, 5xx    → retryable server/transient error
 * - network timeout  → retryable
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret?: string;
  previousSecrets?: string[];
  maxRetries: number;
  circuitBreakerThreshold?: number;
}

export interface WebhookEvent {
  id: string;
  eventType: string;
  streamId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface WebhookDeliveryAttempt {
  attemptNumber: number;
  timestamp: string;
  statusCode?: number;
  error?: string;
  nextRetryAt?: string;
  /** Whether this attempt was retryable (false = terminal 4xx or max exceeded). */
  retryable?: boolean;
}

export interface WebhookDeliveryRecord {
  deliveryId: string;
  endpointId: string;
  endpointUrl: string;
  eventId: string;
  status: 'pending' | 'delivered' | 'failed' | 'dlq';
  attempts: WebhookDeliveryAttempt[];
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
}

export interface DLQEntry {
  id: string;
  deliveryId: string;
  endpointId: string;
  endpointUrl: string;
  eventId: string;
  eventType: string;
  payload: WebhookEvent;
  reason: string;
  /** Full attempt history — all attempts recorded before DLQ. */
  allAttempts: WebhookDeliveryAttempt[];
  lastAttempt: WebhookDeliveryAttempt;
  createdAt: string;
  /**
   * Set when this DLQ entry has been successfully replayed.
   * The value is the new deliveryId created by the replay.
   * Presence of this field is the idempotency guard — a replayed entry
   * will never be re-enqueued.
   */
  replayedDeliveryId?: string;
  /** ISO-8601 timestamp of the successful replay. */
  replayedAt?: string;
}

// ── Retry config ──────────────────────────────────────────────────────────────

/**
 * Exponential backoff configuration.
 *
 * Defaults are production-grade:
 *   attempt 1 →   0–1 s
 *   attempt 2 →   0–2 s
 *   attempt 3 →   0–4 s
 *   …
 *   attempt 10 →  0–512 s  (capped at maxDelayMs = 1 h)
 */
export interface RetryConfig {
  /** Base delay for attempt 1 (ms). */
  initialDelayMs: number;
  /** Hard cap on computed delay (ms). */
  maxDelayMs: number;
  /** Maximum number of delivery attempts before DLQ. */
  maxAttempts: number;
  /** Backoff multiplier (default 2 = binary exponential). */
  backoffMultiplier: number;
  /**
   * @deprecated Use maxAttempts. Kept for backward compatibility.
   * If both are set, maxAttempts takes precedence.
   */
  maxRetries?: number;
  /**
   * @deprecated jitterFactor is no longer used — full jitter is always applied.
   */
  jitterFactor?: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  initialDelayMs:   1_000,       // 1 s
  maxDelayMs:       3_600_000,   // 1 h
  maxAttempts:      10,
  backoffMultiplier: 2,
};

// ── Core backoff math ─────────────────────────────────────────────────────────

/**
 * Compute the next retry delay using **full jitter** exponential backoff.
 *
 * Formula:
 *   cap   = min(maxDelayMs, initialDelayMs * backoffMultiplier ^ attemptNumber)
 *   delay = random_between(0, cap)          ← full jitter
 *
 * Full jitter is preferred over "equal jitter" or "decorrelated jitter" for
 * webhook retries because it produces the lowest mean delay while still
 * preventing thundering-herd bursts when many deliveries fail simultaneously.
 *
 * @param attemptNumber  1-based attempt index (1 = first retry after failure).
 * @param config         Retry configuration (defaults to DEFAULT_RETRY_CONFIG).
 * @returns              Delay in milliseconds (integer, ≥ 0).
 */
export function calculateNextRetryDelay(
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Exponential cap: initialDelay * multiplier^attempt, bounded by maxDelay.
  const cap = Math.min(
    config.maxDelayMs,
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber),
  );

  // Full jitter: uniform random in [0, cap].
  return Math.floor(Math.random() * cap);
}

/**
 * Returns true when the delay for `attemptNumber` is within the expected
 * bounds [0, cap]. Useful for assertions in tests.
 */
export function isDelayWithinBounds(
  delayMs: number,
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): boolean {
  const cap = Math.min(
    config.maxDelayMs,
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber),
  );
  return delayMs >= 0 && delayMs <= cap;
}

// ── Status classification ─────────────────────────────────────────────────────

/**
 * Returns true when the HTTP status code (or absence thereof) indicates the
 * delivery should be retried.
 *
 * | Status          | Retryable | Reason                          |
 * |---|---|---|
 * | undefined/null  | ✅        | Network error — always retry    |
 * | 2xx             | ❌        | Success                         |
 * | 408             | ✅        | Request Timeout                 |
 * | 429             | ✅        | Too Many Requests               |
 * | 4xx (other)     | ❌        | Client error — fix the payload  |
 * | 5xx             | ✅        | Server error — transient        |
 */
export function isRetryableStatus(statusCode?: number): boolean {
  if (!statusCode) return true;
  if (statusCode >= 200 && statusCode < 300) return false;
  if (statusCode === 408 || statusCode === 429) return true;
  if (statusCode >= 400 && statusCode < 500) return false; // non-retryable 4xx
  if (statusCode >= 500) return true;
  return false;
}

// ── Signature helpers ─────────────────────────────────────────────────────────

export function generateWebhookSignature(
  payload: string,
  secret: string | string[],
  timestamp: string,
  deliveryId: string,
): string {
  // Signature format: `t=timestamp,id=deliveryId,v1=signature[,v1=previousSignature]`
  const signableContent = `${timestamp}.${deliveryId}.${payload}`;
  const signatures = normalizeSigningSecrets(secret).map((signingSecret) => {
    const signature = crypto
      .createHmac('sha256', signingSecret)
      .update(signableContent)
      .digest('hex');

    return `v1=${signature}`;
  });

  return `t=${timestamp},id=${deliveryId},${signatures.join(',')}`;
}

export function verifyWebhookSignature(
  payload: string,
  secret: string | string[],
  signatureHeader: string,
  timestamp: string,
  deliveryId: string,
  toleranceMs = 300_000,
): boolean {
  // Check timestamp freshness
  const requestTime = parseWebhookTimestampMs(timestamp);
  const now = Date.now();
  if (!requestTime || Math.abs(now - requestTime) > toleranceMs) {
    return false;
  }

  const parts = parseWebhookSignatureHeader(signatureHeader);

  if (parts.signatures.length === 0 || parts.id !== deliveryId || parts.t !== timestamp) {
    return false;
  }

  const expectedSignatures = normalizeSigningSecrets(secret)
    .map((signingSecret) => generateWebhookSignature(payload, signingSecret, timestamp, deliveryId))
    .flatMap((header) => parseWebhookSignatureHeader(header).signatures);

  return parts.signatures.some((providedSignature) =>
    expectedSignatures.some((expectedSignature) =>
      signaturesMatch(providedSignature, expectedSignature)
    )
  );
}

function normalizeSigningSecrets(secret: string | string[]): string[] {
  const secrets = Array.isArray(secret) ? secret : [secret];
  return secrets.filter((value) => value.length > 0);
}

function parseWebhookTimestampMs(timestamp: string): number | null {
  if (!/^\d+$/.test(timestamp)) {
    return null;
  }

  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds)) {
    return null;
  }

  return seconds * 1000;
}

function parseWebhookSignatureHeader(signatureHeader: string): {
  t?: string;
  id?: string;
  signatures: string[];
} {
  return signatureHeader.split(',').reduce(
    (acc, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) {
        return acc;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();

      if (key === 'v1') {
        acc.signatures.push(value);
      } else if (key === 't' || key === 'id') {
        acc[key] = value;
      }

      return acc;
    },
    { signatures: [] } as { t?: string; id?: string; signatures: string[] }
  );
}

function signaturesMatch(providedSignature: string, expectedSignature: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(providedSignature) || !/^[a-f0-9]{64}$/i.test(expectedSignature)) {
    return false;
  }

  const provided = Buffer.from(providedSignature, 'hex');
  const expected = Buffer.from(expectedSignature, 'hex');

  if (provided.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, expected);
}

export function applyWebhookSecretsFromStore(
  endpoint: WebhookEndpoint,
): WebhookEndpoint {
  const secrets = getActiveSigningSecrets();
  return {
    ...endpoint,
    secret: secrets[0],
    previousSecrets: secrets.slice(1),
  };
}

export class WebhookDeliveryClient {
  private retryConfig: RetryConfig;
  private circuitBreakers: Map<string, { failures: number; openedAt?: number }> = new Map();
  private readonly circuitBreakerTimeout = 300_000; // 5 min

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  isCircuitOpen(endpointId: string, threshold = 5): boolean {
    const breaker = this.circuitBreakers.get(endpointId);
    if (!breaker) return false;
    if (breaker.failures >= threshold && breaker.openedAt) {
      if (Date.now() - breaker.openedAt < this.circuitBreakerTimeout) return true;
      this.circuitBreakers.delete(endpointId);
    }
    return false;
  }

  recordFailure(endpointId: string): void {
    const breaker = this.circuitBreakers.get(endpointId) ?? { failures: 0 };
    breaker.failures += 1;
    breaker.openedAt ??= Date.now();
    this.circuitBreakers.set(endpointId, breaker);
  }

  recordSuccess(endpointId: string): void {
    this.circuitBreakers.delete(endpointId);
  }

  /**
   * Attempt a single delivery. Returns whether it succeeded, whether it is
   * retryable, and the computed next-retry timestamp.
   */
  async attemptDelivery(
    endpoint: WebhookEndpoint,
    event: WebhookEvent,
    deliveryId: string,
    attemptNumber: number,
    _previousAttempts: WebhookDeliveryAttempt[] = [],
  ): Promise<{
    success: boolean;
    statusCode?: number;
    error?: string;
    shouldRetry: boolean;
    nextRetryAt?: string;
  }> {
    const context = getCorrelationContext();
    withWebhookContext(deliveryId);

    if (this.isCircuitOpen(endpoint.id, endpoint.circuitBreakerThreshold)) {
      const error = 'Circuit breaker open: endpoint experiencing repeated failures';
      logger.warn('Webhook delivery blocked by circuit breaker', {
        delivery_id: deliveryId,
        endpoint_id: endpoint.id,
        endpoint_url: endpoint.url,
        event_id: event.id,
        correlation_id: context?.correlation_id,
      });
      return { success: false, error, shouldRetry: false };
    }

    const payload   = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const maxAttempts = this.retryConfig.maxAttempts ?? this.retryConfig.maxRetries ?? 10;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'StreamPay-Webhook-Client/1.0',
      'X-StreamPay-Delivery-Id': deliveryId,
      'X-StreamPay-Event-Id': event.id,
      'X-StreamPay-Event-Type': event.eventType,
      'X-StreamPay-Nonce': `${event.id}:${deliveryId}:${attemptNumber}`,
      'X-StreamPay-Timestamp': timestamp,
      'X-StreamPay-Attempt': attemptNumber.toString(),
    };

    if (endpoint.secret) {
      headers['X-StreamPay-Signature'] = generateWebhookSignature(
        payload,
        [endpoint.secret, ...(endpoint.previousSecrets ?? [])],
        timestamp,
        deliveryId
      );
    }

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 30_000);

    try {
      logger.info('Webhook delivery attempt starting', {
        delivery_id: deliveryId,
        endpoint_id: endpoint.id,
        endpoint_url: endpoint.url,
        event_id: event.id,
        event_type: event.eventType,
        attempt: attemptNumber,
        correlation_id: context?.correlation_id,
      });

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: payload,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const statusCode = response.status;
      const success    = statusCode >= 200 && statusCode < 300;

      logger.info('Webhook delivery attempt completed', {
        delivery_id: deliveryId,
        endpoint_id: endpoint.id,
        endpoint_url: endpoint.url,
        event_id: event.id,
        attempt: attemptNumber,
        status_code: statusCode,
        success,
        correlation_id: context?.correlation_id,
      });

      if (success) {
        this.recordSuccess(endpoint.id);
        return { success: true, statusCode, shouldRetry: false };
      }

      const shouldRetry = isRetryableStatus(statusCode);
      this.recordFailure(endpoint.id);

      if (shouldRetry && attemptNumber < maxAttempts) {
        const nextDelay = calculateNextRetryDelay(attemptNumber, this.retryConfig);
        const nextRetryAt = new Date(Date.now() + nextDelay).toISOString();
        return {
          success: false,
          statusCode,
          shouldRetry: true,
          nextRetryAt,
          error: `HTTP ${statusCode}`,
        };
      }

      return {
        success: false,
        statusCode,
        shouldRetry: false,
        error: `HTTP ${statusCode}: ${response.statusText}`,
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        const errorMsg = 'Request timeout (30s)';
        logger.warn('Webhook delivery timeout', {
          delivery_id: deliveryId,
          endpoint_id: endpoint.id,
          endpoint_url: endpoint.url,
          event_id: event.id,
          attempt: attemptNumber,
          correlation_id: context?.correlation_id,
        });

        this.recordFailure(endpoint.id);

        if (attemptNumber < maxAttempts) {
          const nextDelay = calculateNextRetryDelay(attemptNumber, this.retryConfig);
          const nextRetryAt = new Date(Date.now() + nextDelay).toISOString();
          return {
            success: false,
            shouldRetry: true,
            nextRetryAt,
            error: errorMsg,
          };
        }

        return {
          success: false,
          shouldRetry: false,
          error: errorMsg,
        };
      }

      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Webhook delivery error', {
        delivery_id: deliveryId,
        endpoint_id: endpoint.id,
        endpoint_url: endpoint.url,
        event_id: event.id,
        attempt: attemptNumber,
        error: errorMsg,
        correlation_id: context?.correlation_id,
      });

      this.recordFailure(endpoint.id);

      if (attemptNumber < maxAttempts) {
        const nextDelay = calculateNextRetryDelay(attemptNumber, this.retryConfig);
        const nextRetryAt = new Date(Date.now() + nextDelay).toISOString();
        return {
          success: false,
          shouldRetry: true,
          nextRetryAt,
          error: errorMsg,
        };
      }

      return {
        success: false,
        shouldRetry: false,
        error: errorMsg,
      };
    }
  }

  calculateNextRetryTime(attemptNumber: number): string {
    const delayMs = calculateNextRetryDelay(attemptNumber, this.retryConfig);
    return new Date(Date.now() + delayMs).toISOString();
  }
}

export const webhookDeliveryClient = new WebhookDeliveryClient();
