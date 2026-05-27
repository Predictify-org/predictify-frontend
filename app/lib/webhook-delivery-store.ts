import { logger, getCorrelationContext } from './logger';
import {
  WebhookDeliveryRecord,
  WebhookDeliveryAttempt,
  DLQEntry,
  WebhookEndpoint,
  WebhookEvent,
} from './webhook-delivery';

/**
 * In-memory storage for webhook deliveries and DLQ entries.
 * In production, this would use PostgreSQL or similar.
 */
export class WebhookDeliveryStore {
  private deliveries: Map<string, WebhookDeliveryRecord> = new Map();
  private dlq: Map<string, DLQEntry> = new Map();
  private attemptSchedule: Map<string, { retryAt: string; deliveryId: string }> = new Map();

  /**
   * Create a new delivery record
   */
  createDelivery(
    deliveryId: string,
    endpoint: WebhookEndpoint,
    event: WebhookEvent
  ): WebhookDeliveryRecord {
    const now = new Date().toISOString();
    const record: WebhookDeliveryRecord = {
      deliveryId,
      endpointId: endpoint.id,
      endpointUrl: endpoint.url,
      eventId: event.id,
      status: 'pending',
      attempts: [],
      createdAt: now,
      updatedAt: now,
    };

    this.deliveries.set(deliveryId, record);

    const context = getCorrelationContext();
    logger.info('Webhook delivery record created', {
      delivery_id: deliveryId,
      endpoint_id: endpoint.id,
      event_id: event.id,
      correlation_id: context?.correlation_id,
    });

    return record;
  }

  /**
   * Record a delivery attempt
   */
  recordAttempt(
    deliveryId: string,
    attempt: WebhookDeliveryAttempt
  ): WebhookDeliveryRecord | undefined {
    const record = this.deliveries.get(deliveryId);
    if (!record) {
      logger.warn('Delivery record not found for attempt recording', {
        delivery_id: deliveryId,
      });
      return undefined;
    }

    record.attempts.push(attempt);
    record.updatedAt = new Date().toISOString();

    // Schedule next retry if provided
    if (attempt.nextRetryAt) {
      const scheduleId = `${deliveryId}:attempt-${record.attempts.length}`;
      this.attemptSchedule.set(scheduleId, {
        retryAt: attempt.nextRetryAt,
        deliveryId,
      });
    }

    this.deliveries.set(deliveryId, record);

    const context = getCorrelationContext();
    logger.info('Webhook delivery attempt recorded', {
      delivery_id: deliveryId,
      attempt_number: record.attempts.length,
      status_code: attempt.statusCode,
      correlation_id: context?.correlation_id,
    });

    return record;
  }

  /**
   * Mark delivery as successful
   */
  markDelivered(deliveryId: string): WebhookDeliveryRecord | undefined {
    const record = this.deliveries.get(deliveryId);
    if (!record) return undefined;

    record.status = 'delivered';
    record.finalizedAt = new Date().toISOString();
    record.updatedAt = record.finalizedAt;

    this.deliveries.set(deliveryId, record);

    const context = getCorrelationContext();
    logger.info('Webhook delivery marked successful', {
      delivery_id: deliveryId,
      total_attempts: record.attempts.length,
      correlation_id: context?.correlation_id,
    });

    return record;
  }

  /**
   * Move delivery to DLQ on final failure
   */
  moveToDLQ(
    deliveryId: string,
    reason: string
  ): DLQEntry | undefined {
    const record = this.deliveries.get(deliveryId);
    if (!record || record.attempts.length === 0) {
      logger.warn('Cannot move delivery to DLQ: record not found or no attempts', {
        delivery_id: deliveryId,
      });
      return undefined;
    }

    const lastAttempt = record.attempts[record.attempts.length - 1];

    // Find the original event by looking at delivery metadata
    // In production, this would be stored in the record
    const dlqEntry: DLQEntry = {
      id: `dlq-${crypto.randomUUID()}`,
      deliveryId,
      endpointId: record.endpointId,
      endpointUrl: record.endpointUrl,
      eventId: record.eventId,
      eventType: 'unknown', // Would come from the event
      payload: {
        id: record.eventId,
        eventType: 'unknown',
        streamId: '',
        data: {},
        timestamp: new Date().toISOString(),
      },
      reason,
      lastAttempt,
      createdAt: new Date().toISOString(),
    };

    this.dlq.set(dlqEntry.id, dlqEntry);

    // Update delivery record
    record.status = 'dlq';
    record.finalizedAt = new Date().toISOString();
    record.updatedAt = record.finalizedAt;
    this.deliveries.set(deliveryId, record);

    const context = getCorrelationContext();
    logger.error('Webhook delivery moved to DLQ', {
      delivery_id: deliveryId,
      dlq_id: dlqEntry.id,
      reason,
      total_attempts: record.attempts.length,
      endpoint_url: record.endpointUrl,
      correlation_id: context?.correlation_id,
    });

    return dlqEntry;
  }

  /**
   * Get delivery record
   */
  getDelivery(deliveryId: string): WebhookDeliveryRecord | undefined {
    return this.deliveries.get(deliveryId);
  }

  /**
   * Get all delivery records
   */
  getAllDeliveries(): WebhookDeliveryRecord[] {
    return Array.from(this.deliveries.values());
  }

  /**
   * Get all deliveries for an endpoint
   */
  getDeliveriesByEndpoint(endpointId: string): WebhookDeliveryRecord[] {
    return Array.from(this.deliveries.values()).filter(d => d.endpointId === endpointId);
  }

  /**
   * Get pending deliveries that need retry
   */
  getPendingRetries(): Array<{ deliveryId: string; retryAt: string }> {
    const now = new Date();
    return Array.from(this.attemptSchedule.entries())
      .filter(([_, scheduled]) => new Date(scheduled.retryAt) <= now)
      .map(([_, scheduled]) => ({
        deliveryId: scheduled.deliveryId,
        retryAt: scheduled.retryAt,
      }));
  }

  /**
   * Clear completed schedule entries
   */
  clearScheduleEntry(deliveryId: string, attemptNumber: number): void {
    const scheduleId = `${deliveryId}:attempt-${attemptNumber}`;
    this.attemptSchedule.delete(scheduleId);
  }

  /**
   * Mark a DLQ entry as replayed and link it to the new delivery.
   *
   * This is the idempotency anchor for the replay endpoint:
   * once `replayedDeliveryId` is set, subsequent replay calls return the
   * existing result without re-enqueuing.
   *
   * @param dlqId          The DLQ entry to mark.
   * @param newDeliveryId  The delivery ID created by the replay worker.
   * @returns The updated DLQEntry, or undefined if not found.
   */
  markReplayed(dlqId: string, newDeliveryId: string): DLQEntry | undefined {
    const entry = this.dlq.get(dlqId);
    if (!entry) return undefined;

    const updated: DLQEntry = {
      ...entry,
      replayedDeliveryId: newDeliveryId,
      replayedAt: new Date().toISOString(),
    };
    this.dlq.set(dlqId, updated);

    const context = getCorrelationContext();
    logger.info('DLQ entry marked as replayed', {
      dlq_id: dlqId,
      new_delivery_id: newDeliveryId,
      correlation_id: context?.correlation_id,
    });

    return updated;
  }

  /**
   * Get DLQ entry
   */
  getDLQEntry(dlqId: string): DLQEntry | undefined {
    return this.dlq.get(dlqId);
  }

  /**
   * Get all DLQ entries
   */
  getAllDLQEntries(): DLQEntry[] {
    return Array.from(this.dlq.values());
  }

  /**
   * Get DLQ entries by status/date range for observability
   */
  getDLQEntriesSince(sinceTime: Date): DLQEntry[] {
    return Array.from(this.dlq.values()).filter(
      entry => new Date(entry.createdAt) >= sinceTime
    );
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.deliveries.clear();
    this.dlq.clear();
    this.attemptSchedule.clear();
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const deliveries = Array.from(this.deliveries.values());
    return {
      totalDeliveries: deliveries.length,
      delivered: deliveries.filter(d => d.status === 'delivered').length,
      pending: deliveries.filter(d => d.status === 'pending').length,
      dlq: deliveries.filter(d => d.status === 'dlq').length,
      totalAttempts: deliveries.reduce((sum, d) => sum + d.attempts.length, 0),
      dlqEntries: this.dlq.size,
    };
  }
}

// Singleton instance
export const webhookDeliveryStore = new WebhookDeliveryStore();
