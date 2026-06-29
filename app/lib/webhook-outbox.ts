import crypto from "crypto";
import { logger, withWebhookContext, getCorrelationContext } from "./logger";
import {
  WebhookEndpoint,
  WebhookEvent,
} from "./webhook-delivery";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WebhookOutboxEntry {
  /** Unique outbox entry ID */
  id: string;
  /** The webhook endpoint to deliver to */
  endpoint: WebhookEndpoint;
  /** The webhook event payload */
  event: WebhookEvent;
  /** Status of the outbox entry */
  status: "pending" | "processing" | "delivered" | "failed" | "dlq";
  /** When the entry was created */
  createdAt: string;
  /** When the entry was last updated */
  updatedAt: string;
  /** Number of delivery attempts made */
  attempts: number;
  /** When to next attempt should be made (if applicable) */
  nextAttemptAt?: string;
  /** Error message if failed */
  lastError?: string;
};

// ── Outbox Store ─────────────────────────────────────────────────────────────────

/**
 * In-memory transactional outbox for webhook events.
 *
 * This stores events that need to be delivered as webhooks, ensuring
 * atomicity with the transaction that generated the event.
 */
export class WebhookOutboxStore {
  private entries: Map<string, WebhookOutboxEntry> = new Map();

  /**
   * Add a new event to the outbox (atomic operation with the transaction
   * that generated the event.
   */
  addToOutbox(
    endpoint: WebhookEndpoint,
    event: WebhookEvent,
  ): WebhookOutboxEntry {
    const id = `outbox-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const entry: WebhookOutboxEntry = {
      id,
      endpoint,
      event,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      attempts: 0,
    };

    this.entries.set(id, entry);

    const context = getCorrelationContext();
    logger.info("Webhook event added to outbox", {
      outbox_id: id,
      endpoint_id: endpoint.id,
      event_id: event.id,
      event_type: event.eventType,
      correlation_id: context?.correlation_id,
    });

    return entry;
  }

  /**
   * Get a single outbox entry by ID
   */
  getOutboxEntry(id: string): WebhookOutboxEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Get all outbox entries
   */
  getAllOutboxEntries(): WebhookOutboxEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get pending outbox entries ready for processing
   */
  getPendingOutboxEntries(limit: number = 100): WebhookOutboxEntry[] {
    const now = new Date();
    return Array.from(this.entries.values())
      .filter((entry) => {
        if (entry.status !== "pending" && entry.status !== "processing") return false;
        if (entry.nextAttemptAt && new Date(entry.nextAttemptAt) > now) return false;
        return true;
      })
      .slice(0, limit);
  }

  /**
   * Update an outbox entry's status
   */
  updateOutboxEntry(
    id: string,
    updates: Partial<Omit<WebhookOutboxEntry, "id" | "endpoint" | "event" | "createdAt">>,
  ): WebhookOutboxEntry | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;

    const updated: WebhookOutboxEntry = {
      ...entry,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.entries.set(id, updated);

    logger.info("Webhook outbox entry updated", {
      outbox_id: id,
      status: updated.status,
      attempts: updated.attempts,
    });

    return updated;
  }

  /**
   * Delete an outbox entry (for testing/cleanup)
   */
  deleteOutboxEntry(id: string): boolean {
    return this.entries.delete(id);
  }

  /**
   * Clear all outbox entries (for testing)
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Get outbox statistics
   */
  getStatistics() {
    const entries = Array.from(this.entries.values());
    return {
      total: entries.length,
      pending: entries.filter((e) => e.status === "pending").length,
      processing: entries.filter((e) => e.status === "processing").length,
      delivered: entries.filter((e) => e.status === "delivered").length,
      failed: entries.filter((e) => e.status === "failed").length,
      dlq: entries.filter((e) => e.status === "dlq").length,
    };
  }
}

export const webhookOutboxStore = new WebhookOutboxStore();
