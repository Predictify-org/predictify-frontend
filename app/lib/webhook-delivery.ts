import crypto from 'crypto';
import { logger, withWebhookContext, getCorrelationContext } from './logger';

/**
 * Idempotent webhook delivery with exponential backoff and DLQ support
 */

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret?: string;
  previousSecrets?: string[];
  maxRetries: number;
  circuitBreakerThreshold?: number; // consecutive failures before circuit opens
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

/**
 * Exponential backoff configuration
 */
export interface RetryConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  maxRetries: number;
  jitterFactor: number; // 0.0-1.0, portion of delay to randomize
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  initialDelayMs: 1000,      // 1 second
  maxDelayMs: 3600000,       // 1 hour
  maxRetries: 10,
  jitterFactor: 0.2,         // 20% jitter
  backoffMultiplier: 2,
};

/**
 * Calculate next retry delay with exponential backoff and jitter
 */
export function calculateNextRetryDelay(
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Exponential backoff: delay = initialDelay * (backoffMultiplier ^ attemptNumber)
  let delay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber),
    config.maxDelayMs
  );

  // Add jitter: randomize a portion of the delay to avoid thundering herd
  const jitterAmount = delay * config.jitterFactor;
  const jitter = Math.random() * jitterAmount;
  delay = delay + jitter;

  return Math.floor(delay);
}

/**
 * Generate HMAC-SHA256 signature for webhook
 */
export function generateWebhookSignature(
  payload: string,
  secret: string | string[],
  timestamp: string,
  deliveryId: string
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

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  secret: string | string[],
  signatureHeader: string,
  timestamp: string,
  deliveryId: string,
  toleranceMs: number = 300000 // 5 minutes
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

/**
 * HTTP status code classification
 */
export function isRetryableStatus(statusCode?: number): boolean {
  if (!statusCode) return true; // Network errors are retryable

  // Retry on 5xx and specific 4xx errors
  if (statusCode >= 500) return true;
  if (statusCode === 408) return true; // Request Timeout
  if (statusCode === 429) return true; // Too Many Requests

  // Do not retry on other 4xx errors (client errors)
  if (statusCode >= 400 && statusCode < 500) return false;

  // Success status codes
  if (statusCode >= 200 && statusCode < 300) return false;

  return false;
}

/**
 * Webhook delivery client with exponential backoff, jitter, and DLQ support
 */
export class WebhookDeliveryClient {
  private retryConfig: RetryConfig;
  private circuitBreakers: Map<string, { failures: number; openedAt?: number }> = new Map();
  private circuitBreakerTimeout = 300000; // 5 minutes

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Check if endpoint circuit breaker is open
   */
  isCircuitOpen(endpointId: string, threshold: number = 5): boolean {
    const breaker = this.circuitBreakers.get(endpointId);
    if (!breaker) return false;

    // Circuit is open if failures exceed threshold and timeout hasn't passed
    if (breaker.failures >= threshold && breaker.openedAt) {
      const elapsed = Date.now() - breaker.openedAt;
      if (elapsed < this.circuitBreakerTimeout) {
        return true;
      }
      // Reset circuit breaker after timeout
      this.circuitBreakers.delete(endpointId);
      return false;
    }

    return false;
  }

  /**
   * Record failed delivery attempt for circuit breaker
   */
  recordFailure(endpointId: string): void {
    const breaker = this.circuitBreakers.get(endpointId) || { failures: 0 };
    breaker.failures += 1;
    if (!breaker.openedAt) {
      breaker.openedAt = Date.now();
    }
    this.circuitBreakers.set(endpointId, breaker);
  }

  /**
   * Record successful delivery for circuit breaker
   */
  recordSuccess(endpointId: string): void {
    this.circuitBreakers.delete(endpointId);
  }

  /**
   * Attempt delivery with timeout and retry logic
   */
  async attemptDelivery(
    endpoint: WebhookEndpoint,
    event: WebhookEvent,
    deliveryId: string,
    attemptNumber: number,
    previousAttempts: WebhookDeliveryAttempt[] = []
  ): Promise<{
    success: boolean;
    statusCode?: number;
    error?: string;
    shouldRetry: boolean;
    nextRetryAt?: string;
  }> {
    const context = getCorrelationContext();
    withWebhookContext(deliveryId);

    // Check circuit breaker
    if (this.isCircuitOpen(endpoint.id, endpoint.circuitBreakerThreshold)) {
      const error = 'Circuit breaker open: endpoint experiencing repeated failures';
      logger.warn('Webhook delivery blocked by circuit breaker', {
        delivery_id: deliveryId,
        endpoint_id: endpoint.id,
        endpoint_url: endpoint.url,
        event_id: event.id,
        correlation_id: context?.correlation_id,
      });
      return {
        success: false,
        error,
        shouldRetry: false,
      };
    }

    const payload = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000).toString();

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

      // Prepare headers
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

      // Sign with HMAC per attempt
      if (endpoint.secret) {
        const signature = generateWebhookSignature(
          payload,
          [endpoint.secret, ...(endpoint.previousSecrets ?? [])],
          timestamp,
          deliveryId
        );
        headers['X-StreamPay-Signature'] = signature;
      }

      // Make HTTP request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers,
          body: payload,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const statusCode = response.status;
        const success = statusCode >= 200 && statusCode < 300;

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

        if (shouldRetry && attemptNumber < this.retryConfig.maxRetries) {
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

          if (attemptNumber < this.retryConfig.maxRetries) {
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

        if (attemptNumber < this.retryConfig.maxRetries) {
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
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Webhook delivery fatal error', {
        delivery_id: deliveryId,
        endpoint_id: endpoint.id,
        endpoint_url: endpoint.url,
        event_id: event.id,
        error: errorMsg,
        correlation_id: context?.correlation_id,
      });

      return {
        success: false,
        shouldRetry: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Schedule next retry with exponential backoff
   */
  calculateNextRetryTime(attemptNumber: number): string {
    const delayMs = calculateNextRetryDelay(attemptNumber, this.retryConfig);
    return new Date(Date.now() + delayMs).toISOString();
  }
}

// Singleton instance
export const webhookDeliveryClient = new WebhookDeliveryClient();
