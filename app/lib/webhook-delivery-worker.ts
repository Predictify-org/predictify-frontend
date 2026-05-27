import { logger, getCorrelationContext, withWebhookContext } from './logger';
import {
  WebhookDeliveryClient,
  WebhookEndpoint,
  WebhookEvent,
  WebhookDeliveryAttempt,
  calculateNextRetryDelay,
  DEFAULT_RETRY_CONFIG,
} from './webhook-delivery';
import { webhookDeliveryStore } from './webhook-delivery-store';

/**
 * Webhook delivery worker that handles retry logic and DLQ management
 */
export class WebhookDeliveryWorker {
  private client: WebhookDeliveryClient;
  private maxRetries: number;

  constructor(maxRetries: number = DEFAULT_RETRY_CONFIG.maxRetries) {
    this.client = new WebhookDeliveryClient();
    this.maxRetries = maxRetries;
  }

  /**
   * Process webhook delivery with full retry logic
   */
  async processDelivery(
    endpoint: WebhookEndpoint,
    event: WebhookEvent,
    deliveryId: string
  ): Promise<{
    success: boolean;
    deliveryId: string;
    attempts: number;
    dlqed?: boolean;
  }> {
    const context = getCorrelationContext();
    withWebhookContext(deliveryId);

    logger.info('Starting webhook delivery process', {
      delivery_id: deliveryId,
      endpoint_id: endpoint.id,
      endpoint_url: endpoint.url,
      event_id: event.id,
      event_type: event.eventType,
      correlation_id: context?.correlation_id,
    });

    try {
      // Create delivery record
      const delivery = webhookDeliveryStore.createDelivery(deliveryId, endpoint, event);

      // Attempt delivery with exponential backoff
      let currentAttempt = 1;
      let lastResult = null;

      while (currentAttempt <= this.maxRetries) {
        const result = await this.client.attemptDelivery(
          endpoint,
          event,
          deliveryId,
          currentAttempt,
          delivery.attempts
        );

        lastResult = result;

        // Record attempt
        const attempt: WebhookDeliveryAttempt = {
          attemptNumber: currentAttempt,
          timestamp: new Date().toISOString(),
          statusCode: result.statusCode,
          error: result.error,
          nextRetryAt: result.nextRetryAt,
        };

        webhookDeliveryStore.recordAttempt(deliveryId, attempt);

        if (result.success) {
          // Success! Mark delivery as delivered
          webhookDeliveryStore.markDelivered(deliveryId);

          logger.info('Webhook delivery succeeded', {
            delivery_id: deliveryId,
            endpoint_id: endpoint.id,
            event_id: event.id,
            total_attempts: currentAttempt,
            correlation_id: context?.correlation_id,
          });

          return {
            success: true,
            deliveryId,
            attempts: currentAttempt,
          };
        }

        if (!result.shouldRetry) {
          // Final failure - move to DLQ
          const dlqEntry = webhookDeliveryStore.moveToDLQ(
            deliveryId,
            `Failed after ${currentAttempt} attempts: ${result.error}`
          );

          logger.error('Webhook delivery failed and moved to DLQ', {
            delivery_id: deliveryId,
            dlq_id: dlqEntry?.id,
            endpoint_id: endpoint.id,
            event_id: event.id,
            total_attempts: currentAttempt,
            reason: result.error,
            correlation_id: context?.correlation_id,
          });

          return {
            success: false,
            deliveryId,
            attempts: currentAttempt,
            dlqed: true,
          };
        }

        // Should retry - wait before next attempt
        if (result.nextRetryAt) {
          const nextAttemptTime = new Date(result.nextRetryAt);
          const delayMs = nextAttemptTime.getTime() - Date.now();

          logger.info('Webhook delivery scheduled for retry', {
            delivery_id: deliveryId,
            endpoint_id: endpoint.id,
            event_id: event.id,
            attempt: currentAttempt,
            next_attempt: currentAttempt + 1,
            retry_at: result.nextRetryAt,
            delay_ms: delayMs,
            correlation_id: context?.correlation_id,
          });

          // In production, this would be a background job/queue
          // For now, we're simulating the retry delay
          if (delayMs > 0) {
            await this.delay(Math.min(delayMs, 5000)); // Cap delay for testing
          }
        }

        currentAttempt++;
      }

      // Max retries exceeded - move to DLQ
      const dlqEntry = webhookDeliveryStore.moveToDLQ(
        deliveryId,
        `Max retries (${this.maxRetries}) exceeded: ${lastResult?.error}`
      );

      logger.error('Webhook delivery exhausted all retries and moved to DLQ', {
        delivery_id: deliveryId,
        dlq_id: dlqEntry?.id,
        endpoint_id: endpoint.id,
        event_id: event.id,
        max_retries: this.maxRetries,
        correlation_id: context?.correlation_id,
      });

      return {
        success: false,
        deliveryId,
        attempts: currentAttempt - 1,
        dlqed: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Move to DLQ on unexpected errors
      const dlqEntry = webhookDeliveryStore.moveToDLQ(
        deliveryId,
        `Unexpected error: ${errorMsg}`
      );

      logger.error('Webhook delivery worker error', {
        delivery_id: deliveryId,
        dlq_id: dlqEntry?.id,
        endpoint_id: endpoint.id,
        event_id: event.id,
        error: errorMsg,
        correlation_id: context?.correlation_id,
      });

      return {
        success: false,
        deliveryId,
        attempts: 0,
        dlqed: true,
      };
    }
  }

  /**
   * Re-enqueue a DLQ entry through the delivery worker idempotently.
   *
   * This is the core of the DLQ replay feature (issue #234).
   *
   * ## Idempotency
   * If the DLQ entry already has a `replayedDeliveryId` the method returns
   * the existing result immediately — a double-click never double-delivers.
   *
   * ## Auth
   * The caller (route handler) is responsible for verifying internal-service
   * or admin auth before calling this method.
   *
   * @param dlqId  The DLQ entry to replay.
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
      logger.info('DLQ replay skipped — already replayed (idempotent)', {
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

    logger.info('Replaying DLQ entry', {
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
      logger.error('DLQ replay delivery failed unexpectedly', {
        dlq_id:          dlqId,
        new_delivery_id: newDeliveryId,
        error:           err instanceof Error ? err.message : String(err),
        correlation_id:  context?.correlation_id,
      });
    });

    return { ok: true, alreadyReplayed: false, newDeliveryId };
  }

  /**
   * Retry failed delivery from retry queue
   * This would typically be called by a background job scheduler
   */
  async retryDelivery(
    deliveryId: string,
    endpoint: WebhookEndpoint,
    event: WebhookEvent
  ): Promise<{
    success: boolean;
    attempts: number;
    dlqed?: boolean;
  }> {
    const context = getCorrelationContext();
    withWebhookContext(deliveryId);

    const delivery = webhookDeliveryStore.getDelivery(deliveryId);
    if (!delivery) {
      logger.warn('Delivery not found for retry', {
        delivery_id: deliveryId,
        correlation_id: context?.correlation_id,
      });
      return { success: false, attempts: 0 };
    }

    const attemptNumber = delivery.attempts.length + 1;

    logger.info('Retrying webhook delivery', {
      delivery_id: deliveryId,
      endpoint_id: endpoint.id,
      event_id: event.id,
      attempt: attemptNumber,
      correlation_id: context?.correlation_id,
    });

    const result = await this.client.attemptDelivery(
      endpoint,
      event,
      deliveryId,
      attemptNumber,
      delivery.attempts
    );

    const attempt: WebhookDeliveryAttempt = {
      attemptNumber,
      timestamp: new Date().toISOString(),
      statusCode: result.statusCode,
      error: result.error,
      nextRetryAt: result.nextRetryAt,
    };

    webhookDeliveryStore.recordAttempt(deliveryId, attempt);

    if (result.success) {
      webhookDeliveryStore.markDelivered(deliveryId);
      return { success: true, attempts: attemptNumber };
    }

    if (!result.shouldRetry || attemptNumber >= this.maxRetries) {
      webhookDeliveryStore.moveToDLQ(
        deliveryId,
        `Failed after ${attemptNumber} attempts: ${result.error}`
      );
      return {
        success: false,
        attempts: attemptNumber,
        dlqed: true,
      };
    }

    // Schedule next retry if needed
    return {
      success: false,
      attempts: attemptNumber,
    };
  }

  /**
   * Get delivery status
   */
  getDeliveryStatus(deliveryId: string) {
    return webhookDeliveryStore.getDelivery(deliveryId);
  }

  /**
   * Get all pending retries ready for processing
   */
  getPendingRetries() {
    return webhookDeliveryStore.getPendingRetries();
  }

  /**
   * Get DLQ statistics
   */
  getDLQStats() {
    const stats = webhookDeliveryStore.getStatistics();
    return {
      totalDLQEntries: stats.dlqEntries,
      dlqedDeliveries: stats.dlq,
      dlqEntries: webhookDeliveryStore.getAllDLQEntries(),
    };
  }

  /**
   * Helper: delay for testing
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const webhookDeliveryWorker = new WebhookDeliveryWorker();
