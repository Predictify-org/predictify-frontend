import { Pool } from 'pg';
import crypto from 'crypto';
import { logger, getCorrelationContext } from './logger';
import { SqlExecutor } from './repositories/postgres';
import {
  WebhookDeliveryRecord,
  WebhookDeliveryAttempt,
  DLQEntry,
  WebhookEndpoint,
  WebhookEvent,
} from './webhook-delivery';

/**
 * PostgreSQL-backed durable store for webhook deliveries, DLQ entries, and scheduling.
 * Supports row-level locking for worker claims and throws on startup if DATABASE_URL is missing in non-test envs.
 */
export class WebhookDeliveryStore {
  private deliveries: Map<string, WebhookDeliveryRecord> = new Map();
  private dlq: Map<string, DLQEntry> = new Map();
  private attemptSchedule: Map<string, { retryAt: string; deliveryId: string }> = new Map();

  private pool: Pool | null = null;
  private executor: SqlExecutor | null = null;
  private useMemoryFallback = false;

  constructor(executor?: SqlExecutor) {
    const isTest = process.env.NODE_ENV === 'test';
    const dbUrl = process.env.DATABASE_URL;

    if (executor) {
      this.executor = executor;
    } else if (dbUrl) {
      this.pool = new Pool({ connectionString: dbUrl });
      this.executor = this.pool;
    } else if (isTest) {
      this.useMemoryFallback = true;
    } else {
      throw new Error("DATABASE_URL environment variable is required in production/development modes.");
    }
  }

  /**
   * Inject a custom SqlExecutor dynamically (for tests).
   */
  setExecutor(executor: SqlExecutor): void {
    this.executor = executor;
    this.useMemoryFallback = false;
  }

  /**
   * Close the PostgreSQL connection pool.
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.executor = null;
    }
  }

  /**
   * Create a new delivery record
   */
  async createDelivery(
    deliveryId: string,
    endpoint: WebhookEndpoint,
    event: WebhookEvent
  ): Promise<WebhookDeliveryRecord> {
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

    if (this.useMemoryFallback) {
      this.deliveries.set(deliveryId, record);
    } else {
      const query = `
        INSERT INTO webhook_deliveries (delivery_id, endpoint_id, endpoint_url, event_id, status, attempts, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (delivery_id) DO UPDATE SET
          endpoint_id = EXCLUDED.endpoint_id,
          endpoint_url = EXCLUDED.endpoint_url,
          event_id = EXCLUDED.event_id,
          status = EXCLUDED.status,
          attempts = EXCLUDED.attempts,
          updated_at = EXCLUDED.updated_at
        RETURNING *;
      `;
      await this.executor!.query(query, [
        deliveryId,
        endpoint.id,
        endpoint.url,
        event.id,
        'pending',
        JSON.stringify([]),
        now,
        now
      ]);
    }

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
  async recordAttempt(
    deliveryId: string,
    attempt: WebhookDeliveryAttempt
  ): Promise<WebhookDeliveryRecord | undefined> {
    if (this.useMemoryFallback) {
      const record = this.deliveries.get(deliveryId);
      if (!record) {
        logger.warn('Delivery record not found for attempt recording', {
          delivery_id: deliveryId,
        });
        return undefined;
      }

      record.attempts.push(attempt);
      record.updatedAt = new Date().toISOString();

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
    } else {
      const record = await this.getDelivery(deliveryId);
      if (!record) {
        logger.warn('Delivery record not found for attempt recording', {
          delivery_id: deliveryId,
        });
        return undefined;
      }

      record.attempts.push(attempt);
      record.updatedAt = new Date().toISOString();

      const updateQuery = `
        UPDATE webhook_deliveries
        SET attempts = $2, updated_at = $3
        WHERE delivery_id = $1
        RETURNING *;
      `;
      await this.executor!.query(updateQuery, [
        deliveryId,
        JSON.stringify(record.attempts),
        record.updatedAt
      ]);

      if (attempt.nextRetryAt) {
        const scheduleId = `${deliveryId}:attempt-${record.attempts.length}`;
        const scheduleQuery = `
          INSERT INTO webhook_attempt_schedule (schedule_id, delivery_id, retry_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (schedule_id) DO UPDATE SET retry_at = EXCLUDED.retry_at;
        `;
        await this.executor!.query(scheduleQuery, [
          scheduleId,
          deliveryId,
          attempt.nextRetryAt
        ]);
      }

      const context = getCorrelationContext();
      logger.info('Webhook delivery attempt recorded', {
        delivery_id: deliveryId,
        attempt_number: record.attempts.length,
        status_code: attempt.statusCode,
        correlation_id: context?.correlation_id,
      });

      return record;
    }
  }

  /**
   * Mark delivery as successful
   */
  async markDelivered(deliveryId: string): Promise<WebhookDeliveryRecord | undefined> {
    const now = new Date().toISOString();
    if (this.useMemoryFallback) {
      const record = this.deliveries.get(deliveryId);
      if (!record) return undefined;

      record.status = 'delivered';
      record.finalizedAt = now;
      record.updatedAt = now;

      this.deliveries.set(deliveryId, record);

      const context = getCorrelationContext();
      logger.info('Webhook delivery marked successful', {
        delivery_id: deliveryId,
        total_attempts: record.attempts.length,
        correlation_id: context?.correlation_id,
      });

      return record;
    } else {
      const query = `
        UPDATE webhook_deliveries
        SET status = 'succeeded', finalized_at = $2, updated_at = $2
        WHERE delivery_id = $1
        RETURNING *;
      `;
      const result = await this.executor!.query<any>(query, [deliveryId, now]);
      if (result.rows.length === 0) return undefined;
      const record = this.mapRowToRecord(result.rows[0]);

      const context = getCorrelationContext();
      logger.info('Webhook delivery marked successful', {
        delivery_id: deliveryId,
        total_attempts: record.attempts.length,
        correlation_id: context?.correlation_id,
      });

      return record;
    }
  }

  /**
   * Move delivery to DLQ on final failure
   */
  async moveToDLQ(deliveryId: string, reason: string): Promise<DLQEntry | undefined> {
    const now = new Date().toISOString();
    if (this.useMemoryFallback) {
      const record = this.deliveries.get(deliveryId);
      if (!record) {
        logger.warn('Cannot move delivery to DLQ: record not found', { delivery_id: deliveryId });
        return undefined;
      }

      const lastAttempt = record.attempts[record.attempts.length - 1] || null;

      const dlqEntry: DLQEntry = {
        id: `dlq-${crypto.randomUUID()}`,
        deliveryId,
        endpointId:  record.endpointId,
        endpointUrl: record.endpointUrl,
        eventId:     record.eventId,
        eventType:   'unknown',
        payload: {
          id: record.eventId, eventType: 'unknown',
          streamId: '', data: {}, timestamp: now,
        },
        reason,
        allAttempts: [...record.attempts],
        lastAttempt,
        createdAt: now,
      };

      this.dlq.set(dlqEntry.id, dlqEntry);
      record.status      = 'dlq';
      record.finalizedAt = now;
      record.updatedAt   = now;
      this.deliveries.set(deliveryId, record);

      const context = getCorrelationContext();
      logger.error('Webhook delivery moved to DLQ', {
        delivery_id: deliveryId, dlq_id: dlqEntry.id, reason,
        total_attempts: record.attempts.length, endpoint_url: record.endpointUrl,
        correlation_id: context?.correlation_id,
      });

      return dlqEntry;
    } else {
      const record = await this.getDelivery(deliveryId);
      if (!record) {
        logger.warn('Cannot move delivery to DLQ: record not found', { delivery_id: deliveryId });
        return undefined;
      }

      const lastAttempt = record.attempts[record.attempts.length - 1] || null;
      const dlqId = `dlq-${crypto.randomUUID()}`;
      const dlqEntry: DLQEntry = {
        id: dlqId,
        deliveryId,
        endpointId: record.endpointId,
        endpointUrl: record.endpointUrl,
        eventId: record.eventId,
        eventType: 'unknown',
        payload: {
          id: record.eventId, eventType: 'unknown',
          streamId: '', data: {}, timestamp: now,
        },
        reason,
        allAttempts: [...record.attempts],
        lastAttempt,
        createdAt: now,
      };

      await this.executor!.query(`
        UPDATE webhook_deliveries
        SET status = 'dlq', finalized_at = $2, updated_at = $2
        WHERE delivery_id = $1;
      `, [deliveryId, now]);

      await this.executor!.query(`
        DELETE FROM webhook_attempt_schedule WHERE delivery_id = $1;
      `, [deliveryId]);

      await this.executor!.query(`
        INSERT INTO webhook_dlq (id, delivery_id, endpoint_id, endpoint_url, event_id, event_type, payload, reason, all_attempts, last_attempt, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
      `, [
        dlqId,
        deliveryId,
        record.endpointId,
        record.endpointUrl,
        record.eventId,
        'unknown',
        JSON.stringify(dlqEntry.payload),
        reason,
        JSON.stringify(dlqEntry.allAttempts),
        dlqEntry.lastAttempt ? JSON.stringify(dlqEntry.lastAttempt) : null,
        now
      ]);

      const context = getCorrelationContext();
      logger.error('Webhook delivery moved to DLQ', {
        delivery_id: deliveryId, dlq_id: dlqEntry.id, reason,
        total_attempts: record.attempts.length, endpoint_url: record.endpointUrl,
        correlation_id: context?.correlation_id,
      });

      return dlqEntry;
    }
  }

  /**
   * Get delivery record
   */
  async getDelivery(deliveryId: string): Promise<WebhookDeliveryRecord | undefined> {
    if (this.useMemoryFallback) {
      return this.deliveries.get(deliveryId);
    } else {
      const query = `SELECT * FROM webhook_deliveries WHERE delivery_id = $1;`;
      const result = await this.executor!.query<any>(query, [deliveryId]);
      if (result.rows.length === 0) return undefined;
      return this.mapRowToRecord(result.rows[0]);
    }
  }

  /**
   * Get all delivery records
   */
  async getAllDeliveries(): Promise<WebhookDeliveryRecord[]> {
    if (this.useMemoryFallback) {
      return Array.from(this.deliveries.values());
    } else {
      const query = `SELECT * FROM webhook_deliveries ORDER BY created_at DESC;`;
      const result = await this.executor!.query<any>(query);
      return result.rows.map(row => this.mapRowToRecord(row));
    }
  }

  /**
   * Get all deliveries for an endpoint
   */
  async getDeliveriesByEndpoint(endpointId: string): Promise<WebhookDeliveryRecord[]> {
    if (this.useMemoryFallback) {
      return Array.from(this.deliveries.values()).filter(d => d.endpointId === endpointId);
    } else {
      const query = `SELECT * FROM webhook_deliveries WHERE endpoint_id = $1 ORDER BY created_at DESC;`;
      const result = await this.executor!.query<any>(query, [endpointId]);
      return result.rows.map(row => this.mapRowToRecord(row));
    }
  }

  /**
   * Get pending deliveries that need retry
   */
  async getPendingRetries(): Promise<Array<{ deliveryId: string; retryAt: string }>> {
    if (this.useMemoryFallback) {
      const now = new Date();
      return Array.from(this.attemptSchedule.entries())
        .filter(([_, scheduled]) => new Date(scheduled.retryAt) <= now)
        .map(([_, scheduled]) => ({
          deliveryId: scheduled.deliveryId,
          retryAt: scheduled.retryAt,
        }));
    } else {
      const query = `
        SELECT delivery_id, retry_at
        FROM webhook_attempt_schedule
        WHERE retry_at <= $1
        ORDER BY retry_at ASC;
      `;
      const result = await this.executor!.query<any>(query, [new Date().toISOString()]);
      return result.rows.map(row => ({
        deliveryId: row.delivery_id,
        retryAt: new Date(row.retry_at).toISOString(),
      }));
    }
  }

  /**
   * Clear completed schedule entries
   */
  async clearScheduleEntry(deliveryId: string, attemptNumber: number): Promise<void> {
    if (this.useMemoryFallback) {
      const scheduleId = `${deliveryId}:attempt-${attemptNumber}`;
      this.attemptSchedule.delete(scheduleId);
    } else {
      const scheduleId = `${deliveryId}:attempt-${attemptNumber}`;
      await this.executor!.query(`
        DELETE FROM webhook_attempt_schedule WHERE schedule_id = $1;
      `, [scheduleId]);
    }
  }

  /**
   * Mark a DLQ entry as replayed and link it to the new delivery.
   */
  async markReplayed(dlqId: string, newDeliveryId: string): Promise<DLQEntry | undefined> {
    const now = new Date().toISOString();
    if (this.useMemoryFallback) {
      const entry = this.dlq.get(dlqId);
      if (!entry) return undefined;

      const updated: DLQEntry = {
        ...entry,
        replayedDeliveryId: newDeliveryId,
        replayedAt: now,
      };
      this.dlq.set(dlqId, updated);

      const context = getCorrelationContext();
      logger.info('DLQ entry marked as replayed', {
        dlq_id: dlqId,
        new_delivery_id: newDeliveryId,
        correlation_id: context?.correlation_id,
      });

      return updated;
    } else {
      const query = `
        UPDATE webhook_dlq
        SET replayed_delivery_id = $2, replayed_at = $3
        WHERE id = $1
        RETURNING *;
      `;
      const result = await this.executor!.query<any>(query, [dlqId, newDeliveryId, now]);
      if (result.rows.length === 0) return undefined;
      const updated = this.mapRowToDLQEntry(result.rows[0]);

      const context = getCorrelationContext();
      logger.info('DLQ entry marked as replayed', {
        dlq_id: dlqId,
        new_delivery_id: newDeliveryId,
        correlation_id: context?.correlation_id,
      });

      return updated;
    }
  }

  /**
   * Get DLQ entry
   */
  async getDLQEntry(dlqId: string): Promise<DLQEntry | undefined> {
    if (this.useMemoryFallback) {
      return this.dlq.get(dlqId);
    } else {
      const query = `SELECT * FROM webhook_dlq WHERE id = $1;`;
      const result = await this.executor!.query<any>(query, [dlqId]);
      if (result.rows.length === 0) return undefined;
      return this.mapRowToDLQEntry(result.rows[0]);
    }
  }

  /**
   * Get all DLQ entries
   */
  async getAllDLQEntries(): Promise<DLQEntry[]> {
    if (this.useMemoryFallback) {
      return Array.from(this.dlq.values());
    } else {
      const query = `SELECT * FROM webhook_dlq ORDER BY created_at DESC;`;
      const result = await this.executor!.query<any>(query);
      return result.rows.map(row => this.mapRowToDLQEntry(row));
    }
  }

  /**
   * Get DLQ entries by status/date range for observability
   */
  async getDLQEntriesSince(sinceTime: Date): Promise<DLQEntry[]> {
    if (this.useMemoryFallback) {
      return Array.from(this.dlq.values()).filter(
        entry => new Date(entry.createdAt) >= sinceTime
      );
    } else {
      const query = `SELECT * FROM webhook_dlq WHERE created_at >= $1 ORDER BY created_at DESC;`;
      const result = await this.executor!.query<any>(query, [sinceTime.toISOString()]);
      return result.rows.map(row => this.mapRowToDLQEntry(row));
    }
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    if (this.useMemoryFallback) {
      this.deliveries.clear();
      this.dlq.clear();
      this.attemptSchedule.clear();
    } else {
      await this.executor!.query(`DELETE FROM webhook_attempt_schedule;`);
      await this.executor!.query(`DELETE FROM webhook_dlq;`);
      await this.executor!.query(`DELETE FROM webhook_deliveries;`);
    }
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    if (this.useMemoryFallback) {
      const deliveries = Array.from(this.deliveries.values());
      return {
        totalDeliveries: deliveries.length,
        delivered: deliveries.filter(d => d.status === 'delivered').length,
        pending: deliveries.filter(d => d.status === 'pending').length,
        dlq: deliveries.filter(d => d.status === 'dlq').length,
        totalAttempts: deliveries.reduce((sum, d) => sum + d.attempts.length, 0),
        dlqEntries: this.dlq.size,
      };
    } else {
      const countsResult = await this.executor!.query<any>(`
        SELECT
          COUNT(*) as total_deliveries,
          COUNT(*) FILTER (WHERE status = 'succeeded') as succeeded,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'dlq') as dlq,
          COUNT(*) FILTER (WHERE status = 'processing') as processing
        FROM webhook_deliveries;
      `);
      
      const dlqResult = await this.executor!.query<any>(`
        SELECT COUNT(*) as dlq_entries FROM webhook_dlq;
      `);

      const attemptsResult = await this.executor!.query<any>(`
        SELECT attempts FROM webhook_deliveries;
      `);

      const counts = countsResult.rows[0] || {};
      const dlqCount = dlqResult.rows[0]?.dlq_entries || 0;
      let totalAttempts = 0;
      for (const row of attemptsResult.rows) {
        const attempts = Array.isArray(row.attempts) ? row.attempts : JSON.parse(row.attempts || '[]');
        totalAttempts += attempts.length;
      }

      return {
        totalDeliveries: parseInt(counts.total_deliveries || '0', 10),
        delivered: parseInt(counts.succeeded || '0', 10),
        pending: parseInt(counts.pending || '0', 10),
        dlq: parseInt(counts.dlq || '0', 10),
        totalAttempts,
        dlqEntries: parseInt(dlqCount || '0', 10),
      };
    }
  }

  /**
   * Claim deliveries using row-level locking.
   * SELECT ... FOR UPDATE SKIP LOCKED is used with an explicit LIMIT.
   */
  async claimDeliveries(limit: number): Promise<WebhookDeliveryRecord[]> {
    if (this.useMemoryFallback) {
      const claimed: WebhookDeliveryRecord[] = [];
      for (const record of this.deliveries.values()) {
        if (record.status === 'pending') {
          record.status = 'processing';
          record.updatedAt = new Date().toISOString();
          claimed.push({ ...record });
          if (claimed.length >= limit) break;
        }
      }
      return claimed;
    } else {
      // Locking logic: SELECT ... FOR UPDATE SKIP LOCKED with explicit LIMIT
      // This is inside an UPDATE statement which performs the atomic state change
      const query = `
        UPDATE webhook_deliveries
        SET status = 'processing', updated_at = NOW()
        WHERE delivery_id IN (
          SELECT delivery_id
          FROM webhook_deliveries
          WHERE status = 'pending'
          ORDER BY created_at ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *;
      `;
      const result = await this.executor!.query<any>(query, [limit]);
      return result.rows.map(row => this.mapRowToRecord(row));
    }
  }

  private mapRowToRecord(row: any): WebhookDeliveryRecord {
    let attempts = row.attempts;
    if (typeof attempts === 'string') {
      attempts = JSON.parse(attempts);
    }
    let status = row.status;
    if (status === 'succeeded') {
      status = 'delivered';
    } else if (status === 'failed') {
      status = 'dlq';
    }
    return {
      deliveryId: row.delivery_id,
      endpointId: row.endpoint_id,
      endpointUrl: row.endpoint_url,
      eventId: row.event_id,
      status: status,
      attempts: attempts || [],
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      finalizedAt: row.finalized_at ? new Date(row.finalized_at).toISOString() : undefined,
    };
  }

  private mapRowToDLQEntry(row: any): DLQEntry {
    let payload = row.payload;
    if (typeof payload === 'string') {
      payload = JSON.parse(payload);
    }
    let allAttempts = row.all_attempts;
    if (typeof allAttempts === 'string') {
      allAttempts = JSON.parse(allAttempts);
    }
    let lastAttempt = row.last_attempt;
    if (typeof lastAttempt === 'string') {
      lastAttempt = JSON.parse(lastAttempt);
    }
    return {
      id: row.id,
      deliveryId: row.delivery_id,
      endpointId: row.endpoint_id,
      endpointUrl: row.endpoint_url,
      eventId: row.event_id,
      eventType: row.event_type,
      payload,
      reason: row.reason,
      allAttempts: allAttempts || [],
      lastAttempt,
      createdAt: new Date(row.created_at).toISOString(),
      replayedDeliveryId: row.replayed_delivery_id || undefined,
      replayedAt: row.replayed_at ? new Date(row.replayed_at).toISOString() : undefined,
    };
  }
}

// Singleton instance
export const webhookDeliveryStore = new WebhookDeliveryStore();
