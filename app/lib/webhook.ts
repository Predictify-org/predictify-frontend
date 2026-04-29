import { withWebhookContext, logger, getCorrelationContext } from './logger';

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
  status: 'success' | 'failed';
  statusCode?: number;
  attempt: number;
  deliveredAt: string;
}

/**
 * Mock webhook emission service with correlation logging
 */
export class MockWebhookService {
  /**
   * Emit a webhook event
   */
  async emitWebhook(params: {
    url: string;
    payload: WebhookPayload;
  }): Promise<WebhookDelivery> {
    const context = getCorrelationContext();
    
    const webhookId = `webhook-${crypto.randomUUID().slice(0, 8)}`;
    
    // Add webhook context to correlation
    withWebhookContext(webhookId);

    logger.info('Webhook emission started', {
      webhook_id: webhookId,
      url: params.url,
      event_type: params.payload.eventType,
      stream_id: params.payload.streamId,
      correlation_id: context?.correlation_id,
    });

    // Simulate HTTP request
    await this.simulateDelay(150);

    // Simulate successful delivery
    const delivery: WebhookDelivery = {
      webhookId,
      url: params.url,
      status: 'success',
      statusCode: 200,
      attempt: 1,
      deliveredAt: new Date().toISOString(),
    };

    logger.info('Webhook delivered successfully', {
      webhook_id: webhookId,
      url: params.url,
      status_code: 200,
      stream_id: params.payload.streamId,
      correlation_id: context?.correlation_id,
    });

    return delivery;
  }

  /**
   * Emit a webhook with failure simulation
   */
  async emitWebhookWithFailure(params: {
    url: string;
    payload: WebhookPayload;
  }): Promise<WebhookDelivery> {
    const context = getCorrelationContext();
    
    const webhookId = `webhook-${crypto.randomUUID().slice(0, 8)}`;
    withWebhookContext(webhookId);

    logger.info('Webhook emission started', {
      webhook_id: webhookId,
      url: params.url,
      event_type: params.payload.eventType,
      stream_id: params.payload.streamId,
      correlation_id: context?.correlation_id,
    });

    await this.simulateDelay(150);

    // Simulate failed delivery
    const delivery: WebhookDelivery = {
      webhookId,
      url: params.url,
      status: 'failed',
      statusCode: 503,
      attempt: 1,
      deliveredAt: new Date().toISOString(),
    };

    logger.error('Webhook delivery failed', {
      webhook_id: webhookId,
      url: params.url,
      status_code: 503,
      stream_id: params.payload.streamId,
      correlation_id: context?.correlation_id,
      error: 'Service unavailable',
    });

    return delivery;
  }

  /**
   * Strip internal headers before sending to external webhook
   */
  private stripInternalHeaders(headers: Headers): Headers {
    const safeHeaders = new Headers();
    const internalHeaders = ['x-internal-auth', 'x-service-token', 'x-correlation-id-internal'];
    
    headers.forEach((value, key) => {
      if (!internalHeaders.includes(key.toLowerCase())) {
        safeHeaders.set(key, value);
      }
    });

    return safeHeaders;
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const webhookService = new MockWebhookService();
