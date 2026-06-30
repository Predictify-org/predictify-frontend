import { withWebhookContext, logger, getCorrelationContext } from "./logger";
import { WebhookEndpoint, WebhookEvent } from "./webhook-delivery";
import { webhookOutboxStore } from "./webhook-outbox";

// Mock webhook payload
export interface WebhookPayload {
  eventType: string;
  streamId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// Mock webhook delivery result
export interface WebhookDelivery {
  webhookId: string;
  url: string;
  status: "success" | "failed";
  statusCode?: number;
  attempt: number;
  deliveredAt: string;
}

/**
 * Mock webhook emission service with correlation logging
 */
export class MockWebhookService {
  /**
   * Emit a webhook event via the transactional outbox
   */
  async emitWebhook(params: {
    endpoint: WebhookEndpoint;
    event: WebhookEvent;
  }): Promise<string> {
    const context = getCorrelationContext();
    const { endpoint, event } = params;

    withWebhookContext(event.id);

    logger.info("Adding webhook event to outbox", {
      endpoint_id: endpoint.id,
      endpoint_url: endpoint.url,
      event_id: event.id,
      event_type: event.eventType,
      correlation_id: context?.correlation_id,
    });

    const outboxEntry = webhookOutboxStore.addToOutbox(endpoint, event);

    logger.info("Webhook event added to outbox successfully", {
      outbox_id: outboxEntry.id,
      correlation_id: context?.correlation_id,
    });

    return outboxEntry.id;
  }

  /**
   * Emit a webhook with failure simulation (kept for backwards compatibility)
   */
  async emitWebhookWithFailure(params: {
    endpoint: WebhookEndpoint;
    event: WebhookEvent;
  }): Promise<string> {
    return this.emitWebhook(params);
  }

  /**
   * Strip internal headers before sending to external webhook (kept for backwards compatibility)
   */
  private stripInternalHeaders(headers: Headers): Headers {
    const safeHeaders = new Headers();
    const internalHeaders = ["x-internal-auth", "x-service-token", "x-correlation-id-internal"];

    headers.forEach((value, key) => {
      if (!internalHeaders.includes(key.toLowerCase())) {
        safeHeaders.set(key, value);
      }
    });

    return safeHeaders;
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const webhookService = new MockWebhookService();
