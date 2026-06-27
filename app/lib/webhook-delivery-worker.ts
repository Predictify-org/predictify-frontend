import crypto from "crypto";
import { logger, getCorrelationContext, withWebhookContext } from "./logger";
import {
  WebhookDeliveryClient,
  WebhookEndpoint,
  WebhookEvent,
  WebhookDeliveryAttempt,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  calculateNextRetryDelay,
} from "./webhook-delivery";
import { webhookDeliveryStore } from "./webhook-delivery-store";
import { webhookOutboxStore, WebhookOutboxEntry } from "./webhook-outbox";

export class WebhookDeliveryWorker {
  private client: WebhookDeliveryClient;
  private retryConfig: RetryConfig;

  /**
   * @param retryConfig  - Full retry config. Pass `{ maxAttempts: N }` to
   *                       override the default 10-attempt cap.
   * @param delayFn      - Injectable sleep function — pass `() => Promise.resolve()`
   *                       in tests to skip real delays without capping production.
   */
  constructor(
    retryConfig: Partial<RetryConfig> = {},
    private readonly delayFn: (ms: number) => Promise<void> = (ms) =>
      new Promise((r) => setTimeout(r, ms)),
  ) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.client = new WebhookDeliveryClient(this.retryConfig);
  }

  get maxRetries(): number {
    return this.retryConfig.maxAttempts ?? this.retryConfig.maxRetries ?? 10;
  }

  /**
   * Process a webhook delivery with full exponential-backoff retry loop.
   *
   * - Retryable failures (5xx, 408, 429, network) are retried up to
   *   `retryConfig.maxAttempts` times with full-jitter backoff.
   * - Non-retryable failures (4xx except 408/429) go straight to DLQ.
   * - After maxAttempts the delivery is moved to DLQ with the complete
   *   attempt history attached.
   */
  async processDelivery(
    endpoint: WebhookEndpoint,
    event: WebhookEvent,
    deliveryId: string,
    reissuedFrom?: string,
  ): Promise<{ success: boolean; deliveryId: string; attempts: number; dlqed?: boolean }> {
    const ctx = getCorrelationContext();
    withWebhookContext(deliveryId);
    const maxAttempts = this.maxRetries;

    logger.info("Starting webhook delivery", {
      delivery_id: deliveryId, endpoint_id: endpoint.id,
      event_id: event.id, event_type: event.eventType,
      max_attempts: maxAttempts, correlation_id: ctx?.correlation_id,
    });

    try {
      webhookDeliveryStore.createDelivery(deliveryId, endpoint, event, reissuedFrom);

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const result = await this.client.attemptDelivery(
          endpoint, event, deliveryId, attempt,
          webhookDeliveryStore.getDelivery(deliveryId)?.attempts ?? [],
        );

        const attemptRecord: WebhookDeliveryAttempt = {
          attemptNumber: attempt,
          timestamp:     new Date().toISOString(),
          statusCode:    result.statusCode,
          error:         result.error,
          nextRetryAt:   result.nextRetryAt,
          retryable:     result.shouldRetry,
        };
        webhookDeliveryStore.recordAttempt(deliveryId, attemptRecord);

        // ── Success ──────────────────────────────────────────────────────────
        if (result.success) {
          webhookDeliveryStore.markDelivered(deliveryId);
          logger.info("Webhook delivery succeeded", {
            delivery_id: deliveryId, total_attempts: attempt,
            correlation_id: ctx?.correlation_id,
          });
          return { success: true, deliveryId, attempts: attempt };
        }

        // ── Non-retryable (4xx) → immediate DLQ ──────────────────────────────
        if (!result.shouldRetry) {
          const dlq = webhookDeliveryStore.moveToDLQ(
            deliveryId,
            `Non-retryable failure on attempt ${attempt}: ${result.error}`,
          );
          logger.error("Webhook delivery non-retryable — moved to DLQ", {
            delivery_id: deliveryId, dlq_id: dlq?.id, attempt,
            error: result.error, status_code: result.statusCode,
            correlation_id: ctx?.correlation_id,
          });
          return { success: false, deliveryId, attempts: attempt, dlqed: true };
        }

        // ── Max attempts reached → DLQ ────────────────────────────────────────
        if (attempt === maxAttempts) {
          const dlq = webhookDeliveryStore.moveToDLQ(
            deliveryId,
            `Max attempts (${maxAttempts}) exhausted: ${result.error}`,
          );
          logger.error("Webhook delivery exhausted max attempts — moved to DLQ", {
            delivery_id: deliveryId, dlq_id: dlq?.id,
            max_attempts: maxAttempts, error: result.error,
            correlation_id: ctx?.correlation_id,
          });
          return { success: false, deliveryId, attempts: attempt, dlqed: true };
        }

        // ── Schedule next retry with full-jitter backoff ─────────────────────
        const delayMs = calculateNextRetryDelay(attempt, this.retryConfig);
        logger.info("Webhook delivery retry scheduled", {
          delivery_id: deliveryId, attempt, next_attempt: attempt + 1,
          delay_ms: delayMs, retry_at: result.nextRetryAt,
          correlation_id: ctx?.correlation_id,
        });
        await this.delayFn(delayMs);
      }

      // Should never reach here, but guard anyway.
      webhookDeliveryStore.moveToDLQ(deliveryId, "Retry loop exited unexpectedly");
      return { success: false, deliveryId, attempts: maxAttempts, dlqed: true };

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const dlq = webhookDeliveryStore.moveToDLQ(deliveryId, `Unexpected error: ${msg}`);
      logger.error("Webhook delivery worker unexpected error", {
        delivery_id: deliveryId, dlq_id: dlq?.id, error: msg,
        correlation_id: ctx?.correlation_id,
      });
      return { success: false, deliveryId, attempts: 0, dlqed: true };
    }
  }

  /**
   * Process a single outbox entry
   */
  async processOutboxEntry(
    entry: WebhookOutboxEntry,
  ): Promise<void> {
    // Mark as processing first
    webhookOutboxStore.updateOutboxEntry(entry.id, { status: "processing" });

    const deliveryId = `delivery-${crypto.randomUUID()}`;
    const result = await this.processDelivery(
      entry.endpoint,
      entry.event,
      deliveryId,
    );

    if (result.success) {
      webhookOutboxStore.updateOutboxEntry(entry.id, {
        status: "delivered",
        attempts: result.attempts,
      });
    } else if (result.dlqed) {
      webhookOutboxStore.updateOutboxEntry(entry.id, {
        status: "dlq",
        attempts: result.attempts,
      });
    } else {
      // Shouldn't happen, but just in case
      webhookOutboxStore.updateOutboxEntry(entry.id, {
        status: "failed",
        attempts: result.attempts,
        lastError: "Unknown failure",
      });
    }
  }

  /**
   * Drain the outbox: process all pending entries
   */
  async drainOutbox(limit: number = 100): Promise<void> {
    const entries = webhookOutboxStore.getPendingOutboxEntries(limit);

    logger.info("Draining webhook outbox", {
      pending_count: entries.length,
    });

    for (const entry of entries) {
      await this.processOutboxEntry(entry);
    }

    logger.info("Outbox drain complete");
  }

  /**
   * Start a background worker that drains the outbox periodically
   */
  startOutboxWorker(intervalMs: number = 1000): () => void {
    let running = true;
    let timeout: NodeJS.Timeout | null = null;

    const run = async () => {
      if (!running) return;
      try {
        await this.drainOutbox();
      } catch (err) {
        logger.error("Outbox worker error", {
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (running) {
          timeout = setTimeout(run, intervalMs);
        }
      }
    };

    // Start immediately
    run();

    return () => {
      running = false;
      if (timeout) clearTimeout(timeout);
    };
  }

  /**
   * Re-enqueue a DLQ entry through the delivery worker idempotently.
   *
   * This is the core of the DLQ replay feature (issue #234).
   *
   * **Idempotency:** If the DLQ entry already has a `replayedDeliveryId` the method returns
   * the existing result immediately — a double-click never double-delivers.
   *
   * **Auth:** The caller (route handler) is responsible for verifying internal-service
   * or admin auth before calling this method.
   *
   * @param dlqId  - The DLQ entry to replay.
   * @returns Result object with the new deliveryId and success flag.
   */
  async replayFromDLQ(dlqId: string): Promise<{
    ok: boolean;
    alreadyReplayed: boolean;
    newDeliveryId?: string;
    existingDeliveryId?: string;
    error?: string;
  }> {
    const context = getCorrelationContext();

    const dlqEntry = webhookDeliveryStore.getDLQEntry(dlqId);
    if (!dlqEntry) {
      return { ok: false, alreadyReplayed: false, error: `DLQ entry '${dlqId}' not found.` };
    }

    // ── Idempotency guard ────────────────────────────────────────────────────
    // If already replayed, return the existing delivery ID without re-enqueuing.
    if (dlqEntry.replayedDeliveryId) {
      logger.info("DLQ replay skipped — already replayed (idempotent)", {
        dlq_id: dlqId,
        existing_delivery_id: dlqEntry.replayedDeliveryId,
        replayed_at: dlqEntry.replayedAt,
        correlation_id: context?.correlation_id,
      });
      return {
        ok: true,
        alreadyReplayed: true,
        existingDeliveryId: dlqEntry.replayedDeliveryId,
      };
    }

    // ── Re-enqueue ───────────────────────────────────────────────────────────
    const newDeliveryId = `dlq-replay-${crypto.randomUUID()}`;

    const endpoint: WebhookEndpoint = {
      id:         dlqEntry.endpointId,
      url:        dlqEntry.endpointUrl,
      maxRetries: this.maxRetries,
    };

    logger.info("Replaying DLQ entry", {
      dlq_id:          dlqId,
      new_delivery_id: newDeliveryId,
      endpoint_id:     endpoint.id,
      endpoint_url:    endpoint.url,
      event_id:        dlqEntry.eventId,
      event_type:      dlqEntry.eventType,
      correlation_id:  context?.correlation_id,
    });

    // Mark as replayed BEFORE dispatching to prevent a race where two
    // concurrent replay requests both pass the idempotency check.
    webhookDeliveryStore.markReplayed(dlqId, newDeliveryId);

    // Fire-and-forget: processDelivery manages its own retry/DLQ lifecycle.
    // We do not await here so the HTTP response returns immediately.
    this.processDelivery(endpoint, dlqEntry.payload, newDeliveryId).catch((err) => {
      logger.error("DLQ replay delivery failed unexpectedly", {
        dlq_id:          dlqId,
        new_delivery_id: newDeliveryId,
        error:           err instanceof Error ? err.message : String(err),
        correlation_id:  context?.correlation_id,
      });
    });

    return { ok: true, alreadyReplayed: false, newDeliveryId };
  }

  getDeliveryStatus(deliveryId: string) { return webhookDeliveryStore.getDelivery(deliveryId); }
  getPendingRetries()                   { return webhookDeliveryStore.getPendingRetries(); }
  getDLQStats() {
    const s = webhookDeliveryStore.getStatistics();
    return { totalDLQEntries: s.dlqEntries, dlqedDeliveries: s.dlq,
             dlqEntries: webhookDeliveryStore.getAllDLQEntries() };
  }

  /**
   * Reissue a webhook delivery for a given delivery ID.
   *
   * Creates a brand-new delivery with the same endpoint and event payload
   * as the original delivery, then processes it through the standard retry
   * lifecycle. The original delivery record is left unchanged — its status
   * and attempt history are preserved for audit purposes.
   *
   * **Data availability:** The original delivery must have been created
   * after the introduction of full event/endpoint snapshots (i.e. the
   * `event` and `endpoint` fields on `WebhookDeliveryRecord`). Deliveries
   * created before this change will not have the necessary data and cannot
   * be reissued. In that case the caller should use the DLQ replay route
   * (`POST /api/webhooks/dlq/:dlqId/replay`) instead, which works from
   * DLQ entries that always carry the full payload.
   *
   * **Idempotency:** Not enforced at this level — the route handler may
   * layer its own idempotency key check (e.g. `Idempotency-Key` header).
   * A single delivery ID may be reissued multiple times; each call creates
   * a separate new delivery.
   *
   * **Auth:** The caller (route handler) is responsible for verifying
   * admin or internal-service auth before calling this method.
   *
   * @param deliveryId  - The ID of the delivery to reissue.
   * @returns Result object with the new deliveryId and success flag.
   */
  async reissueDelivery(deliveryId: string): Promise<{
    ok: boolean;
    newDeliveryId?: string;
    error?: string;
  }> {
    const context = getCorrelationContext();

    const record = webhookDeliveryStore.getDelivery(deliveryId);
    if (!record) {
      return { ok: false, error: `Delivery '${deliveryId}' not found.` };
    }

    if (!record.event || !record.endpoint) {
      return {
        ok: false,
        error: `Delivery '${deliveryId}' does not have full event/endpoint data. ` +
               "Use the DLQ replay endpoint for older deliveries.",
      };
    }

    const newDeliveryId = `redeliver-${crypto.randomUUID()}`;

    logger.info("Reissuing webhook delivery", {
      original_delivery_id: deliveryId,
      new_delivery_id:      newDeliveryId,
      endpoint_id:          record.endpoint.id,
      endpoint_url:         record.endpoint.url,
      event_id:             record.event.id,
      event_type:           record.event.eventType,
      correlation_id:       context?.correlation_id,
    });

    // Fire-and-forget: processDelivery manages its own retry/DLQ lifecycle.
    // We do not await here so the HTTP response returns immediately.
    this.processDelivery(
      record.endpoint,
      record.event,
      newDeliveryId,
      deliveryId, // reissuedFrom
    ).catch((err) => {
      logger.error("Reissued delivery failed unexpectedly", {
        original_delivery_id: deliveryId,
        new_delivery_id:      newDeliveryId,
        error:                err instanceof Error ? err.message : String(err),
        correlation_id:       context?.correlation_id,
      });
    });

    return { ok: true, newDeliveryId };
  }
}
