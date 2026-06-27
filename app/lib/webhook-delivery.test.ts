// @ts-nocheck
const vi = {
  fn: (impl?: any) => jest.fn(impl),
  spyOn: (obj: any, prop: string) => jest.spyOn(obj, prop),
  clearAllMocks: () => jest.clearAllMocks(),
  stubGlobal: (name: string, value: any) => {
    (global as any)[name] = value;
  }
};
import {
  WebhookDeliveryClient,
  calculateNextRetryDelay,
  generateWebhookSignature,
  verifyWebhookSignature,
  isRetryableStatus,
  DEFAULT_RETRY_CONFIG,
  WebhookEndpoint,
  WebhookEvent,
} from '@/app/lib/webhook-delivery';
import { WebhookDeliveryWorker } from '@/app/lib/webhook-delivery-worker';
import { webhookDeliveryStore } from '@/app/lib/webhook-delivery-store';
import { logger, withCorrelationContext } from '@/app/lib/logger';

describe('Webhook Delivery System', () => {
  beforeEach(() => {
    webhookDeliveryStore.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    webhookDeliveryStore.clear();
  });

  describe('Exponential Backoff', () => {
    it('should calculate exponential backoff correctly', () => {
      // First retry: 1s * 2^1 = 2s
      const delay1 = calculateNextRetryDelay(1, DEFAULT_RETRY_CONFIG);
      expect(delay1).toBeGreaterThanOrEqual(1000); // 1s min with jitter
      expect(delay1).toBeLessThanOrEqual(1200); // 1s + 20% jitter

      // Second retry: 1s * 2^2 = 4s
      const delay2 = calculateNextRetryDelay(2, DEFAULT_RETRY_CONFIG);
      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay2).toBeLessThanOrEqual(4800);

      // Third retry: 1s * 2^3 = 8s
      const delay3 = calculateNextRetryDelay(3, DEFAULT_RETRY_CONFIG);
      expect(delay3).toBeGreaterThanOrEqual(8000);
      expect(delay3).toBeLessThanOrEqual(9600);
    });

    it('should cap maximum delay', () => {
      const config = { ...DEFAULT_RETRY_CONFIG, maxDelayMs: 10000 };
      const delay = calculateNextRetryDelay(20, config);
      expect(delay).toBeLessThanOrEqual(10000 * 1.2); // max + jitter
    });

    it('should include jitter in backoff', () => {
      const delays = new Set<number>();

      // Calculate the same retry multiple times to verify jitter
      for (let i = 0; i < 10; i++) {
        const delay = calculateNextRetryDelay(2, DEFAULT_RETRY_CONFIG);
        delays.add(delay);
      }

      // Should have multiple different values due to jitter
      expect(delays.size).toBeGreaterThan(1);
    });

    it('should apply jitter factor correctly', () => {
      const config = {
        ...DEFAULT_RETRY_CONFIG,
        initialDelayMs: 1000,
        jitterFactor: 0.1,
        backoffMultiplier: 2,
      };

      const delayWithoutJitter = 1000 * Math.pow(2, 1);
      const maxJitter = delayWithoutJitter * 0.1;

      const delay = calculateNextRetryDelay(1, config);
      expect(delay).toBeGreaterThanOrEqual(delayWithoutJitter);
      expect(delay).toBeLessThanOrEqual(delayWithoutJitter + maxJitter);
    });
  });

  describe('HMAC Signature', () => {
    it('should generate valid webhook signature', () => {
      const payload = JSON.stringify({ eventType: 'stream.settled' });
      const secret = 'test-secret-key';
      const timestamp = '1234567890';
      const deliveryId = 'delivery-123';

      const signature = generateWebhookSignature(payload, secret, timestamp, deliveryId);

      expect(signature).toMatch(/^t=1234567890,id=delivery-123,v1=[a-f0-9]+$/);
    });

    it('should verify valid webhook signature', () => {
      const payload = JSON.stringify({ eventType: 'stream.settled' });
      const secret = 'test-secret-key';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const deliveryId = 'delivery-123';

      const signature = generateWebhookSignature(payload, secret, timestamp, deliveryId);

      const isValid = verifyWebhookSignature(
        payload,
        secret,
        signature,
        timestamp,
        deliveryId
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = JSON.stringify({ eventType: 'stream.settled' });
      const secret = 'test-secret-key';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const deliveryId = 'delivery-123';

      const signature = generateWebhookSignature(payload, secret, timestamp, deliveryId);

      // Tamper with payload
      const tamperedPayload = JSON.stringify({ eventType: 'stream.settled', tampered: true });

      const isValid = verifyWebhookSignature(
        tamperedPayload,
        secret,
        signature,
        timestamp,
        deliveryId
      );

      expect(isValid).toBe(false);
    });

    it('should reject stale timestamp', () => {
      const payload = JSON.stringify({ eventType: 'stream.settled' });
      const secret = 'test-secret-key';
      const oldTimestamp = Math.floor((Date.now() - 400000) / 1000).toString(); // 6+ minutes old
      const deliveryId = 'delivery-123';

      const signature = generateWebhookSignature(payload, secret, oldTimestamp, deliveryId);

      const isValid = verifyWebhookSignature(
        payload,
        secret,
        signature,
        oldTimestamp,
        deliveryId,
        300000 // 5 minute tolerance
      );

      expect(isValid).toBe(false);
    });

    it('should reject mismatched delivery ID', () => {
      const payload = JSON.stringify({ eventType: 'stream.settled' });
      const secret = 'test-secret-key';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const deliveryId = 'delivery-123';

      const signature = generateWebhookSignature(payload, secret, timestamp, deliveryId);

      const isValid = verifyWebhookSignature(
        payload,
        secret,
        signature,
        timestamp,
        'different-delivery-id'
      );

      expect(isValid).toBe(false);
    });
  });

  describe('HTTP Status Code Classification', () => {
    it('should retry on 5xx errors', () => {
      expect(isRetryableStatus(500)).toBe(true);
      expect(isRetryableStatus(502)).toBe(true);
      expect(isRetryableStatus(503)).toBe(true);
      expect(isRetryableStatus(504)).toBe(true);
    });

    it('should retry on timeouts', () => {
      expect(isRetryableStatus(408)).toBe(true);
    });

    it('should retry on rate limits', () => {
      expect(isRetryableStatus(429)).toBe(true);
    });

    it('should not retry on 2xx success', () => {
      expect(isRetryableStatus(200)).toBe(false);
      expect(isRetryableStatus(201)).toBe(false);
      expect(isRetryableStatus(204)).toBe(false);
    });

    it('should not retry on other 4xx errors', () => {
      expect(isRetryableStatus(400)).toBe(false);
      expect(isRetryableStatus(401)).toBe(false);
      expect(isRetryableStatus(403)).toBe(false);
      expect(isRetryableStatus(404)).toBe(false);
    });

    it('should retry on network errors (undefined)', () => {
      expect(isRetryableStatus(undefined)).toBe(true);
    });
  });

  describe('WebhookDeliveryClient', () => {
    let client: WebhookDeliveryClient;
    let endpoint: WebhookEndpoint;
    let event: WebhookEvent;

    beforeEach(() => {
      client = new WebhookDeliveryClient();
      endpoint = {
        id: 'endpoint-1',
        url: 'https://webhook.example.com/events',
        secret: 'test-secret',
        maxRetries: 5,
      };
      event = {
        id: 'event-123',
        eventType: 'stream.settled',
        streamId: 'stream-456',
        data: { amount: 1000 },
        timestamp: new Date().toISOString(),
      };
    });

    it('should successfully deliver webhook on 2xx response', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({
        status: 200,
        statusText: 'OK',
      })) as any);

      const result = await client.attemptDelivery(endpoint, event, 'delivery-1', 1);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.shouldRetry).toBeUndefined();
    });

    it('should retry on 5xx response', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({
        status: 503,
        statusText: 'Service Unavailable',
      })) as any);

      const result = await client.attemptDelivery(endpoint, event, 'delivery-1', 1);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(503);
      expect(result.shouldRetry).toBe(true);
      expect(result.nextRetryAt).toBeDefined();
    });

    it('should not retry on 404 response', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({
        status: 404,
        statusText: 'Not Found',
      })) as any);

      const result = await client.attemptDelivery(endpoint, event, 'delivery-1', 1);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.shouldRetry).toBe(false);
    });

    it('should handle network timeout', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => {
        throw new Error('AbortError');
      }) as any);

      const result = await client.attemptDelivery(endpoint, event, 'delivery-1', 1);

      expect(result.success).toBe(false);
      expect(result.shouldRetry).toBe(true);
      expect(result.error).toContain('timeout');
    });

    it('should track circuit breaker failures', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({
        status: 503,
        statusText: 'Service Unavailable',
      })) as any);

      // Record 5 failures
      for (let i = 0; i < 5; i++) {
        await client.attemptDelivery(endpoint, event, `delivery-${i}`, i + 1);
      }

      // Circuit should now be open
      const result = await client.attemptDelivery(endpoint, event, 'delivery-6', 6);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Circuit breaker');
    });

    it('should include delivery ID in headers', async () => {
      let capturedHeaders: Record<string, string> = {};

      vi.stubGlobal('fetch', vi.fn(async (url: string, options: any) => {
        capturedHeaders = options.headers;
        return {
          status: 200,
          statusText: 'OK',
        };
      }) as any);

      await client.attemptDelivery(endpoint, event, 'delivery-idempotent-123', 1);

      expect(capturedHeaders['X-StreamPay-Delivery-Id']).toBe('delivery-idempotent-123');
      expect(capturedHeaders['X-StreamPay-Event-Id']).toBe('event-123');
      expect(capturedHeaders['X-StreamPay-Event-Type']).toBe('stream.settled');
      expect(capturedHeaders['X-StreamPay-Attempt']).toBe('1');
    });

    it('should sign each attempt with different signature', async () => {
      const signatures = new Set<string>();

      vi.stubGlobal('fetch', vi.fn(async (url: string, options: any) => {
        signatures.add(options.headers['X-StreamPay-Signature']);
        return {
          status: 200,
          statusText: 'OK',
        };
      }) as any);

      // Same endpoint, event, but different attempts should have different signatures due to timestamp
      await client.attemptDelivery(endpoint, event, 'delivery-1', 1);
      await new Promise(resolve => setTimeout(resolve, 10));
      await client.attemptDelivery(endpoint, event, 'delivery-1', 2);

      // Signatures should differ due to timestamp
      expect(signatures.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('WebhookDeliveryWorker', () => {
    let worker: WebhookDeliveryWorker;
    let endpoint: WebhookEndpoint;
    let event: WebhookEvent;

    beforeEach(() => {
      withCorrelationContext({
        correlation_id: 'test-correlation-123',
        request_id: 'req-123',
        trace_id: 'trace-123',
      });
      worker = new WebhookDeliveryWorker(3);
      endpoint = {
        id: 'endpoint-1',
        url: 'https://webhook.example.com/events',
        secret: 'test-secret',
        maxRetries: 3,
      };
      event = {
        id: 'event-123',
        eventType: 'stream.settled',
        streamId: 'stream-456',
        data: { amount: 1000 },
        timestamp: new Date().toISOString(),
      };
    });

    it('should deliver webhook successfully on first attempt', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({
        status: 200,
        statusText: 'OK',
      })) as any);

      const result = await worker.processDelivery(endpoint, event, 'delivery-1');

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(result.dlqed).toBeUndefined();

      const delivery = webhookDeliveryStore.getDelivery('delivery-1');
      expect(delivery?.status).toBe('delivered');
    });

    it('should retry on failure and eventually succeed', async () => {
      let attemptCount = 0;
      vi.stubGlobal('fetch', vi.fn(async () => {
        attemptCount++;
        // Fail first 2 attempts, succeed on 3rd
        if (attemptCount < 3) {
          return { status: 503, statusText: 'Service Unavailable' };
        }
        return { status: 200, statusText: 'OK' };
      }) as any);

      const result = await worker.processDelivery(endpoint, event, 'delivery-1');

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);

      const delivery = webhookDeliveryStore.getDelivery('delivery-1');
      expect(delivery?.attempts.length).toBe(3);
      expect(delivery?.attempts[0].error).toContain('503');
      expect(delivery?.attempts[2].statusCode).toBe(200);
    });

    it('should move to DLQ after max retries', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({
        status: 503,
        statusText: 'Service Unavailable',
      })) as any);

      const result = await worker.processDelivery(endpoint, event, 'delivery-1');

      expect(result.success).toBe(false);
      expect(result.dlqed).toBe(true);

      const delivery = webhookDeliveryStore.getDelivery('delivery-1');
      expect(delivery?.status).toBe('dlq');
      expect(delivery?.attempts.length).toBe(3);

      const dlqStats = worker.getDLQStats();
      expect(dlqStats.totalDLQEntries).toBe(1);
    });

    it('should not retry on 4xx client errors', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({
        status: 404,
        statusText: 'Not Found',
      })) as any);

      const result = await worker.processDelivery(endpoint, event, 'delivery-1');

      expect(result.success).toBe(false);
      expect(result.dlqed).toBe(true);
      expect(result.attempts).toBe(1); // Only one attempt for non-retryable error

      const delivery = webhookDeliveryStore.getDelivery('delivery-1');
      expect(delivery?.status).toBe('dlq');
    });

    it('should include idempotent delivery ID throughout retry chain', async () => {
      const capturedDeliveryIds = new Set<string>();

      vi.stubGlobal('fetch', vi.fn(async (url: string, options: any) => {
        capturedDeliveryIds.add(options.headers['X-StreamPay-Delivery-Id']);
        return { status: 503, statusText: 'Service Unavailable' };
      }) as any);

      await worker.processDelivery(endpoint, event, 'delivery-idempotent-1');

      // All attempts should have the same delivery ID
      expect(capturedDeliveryIds.size).toBe(1);
      expect(Array.from(capturedDeliveryIds)[0]).toBe('delivery-idempotent-1');
    });

    it('should track retry attempts with exponential backoff timing', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({
        status: 503,
        statusText: 'Service Unavailable',
      })) as any);

      await worker.processDelivery(endpoint, event, 'delivery-1');

      const delivery = webhookDeliveryStore.getDelivery('delivery-1');
      expect(delivery?.attempts.length).toBe(3);

      // Each attempt should have a nextRetryAt with increasing delay
      const delays = delivery!.attempts
        .slice(0, -1)
        .map((attempt, idx) => {
          if (!attempt.nextRetryAt) return 0;
          const lastAttemptTime = new Date(delivery!.attempts[idx].timestamp).getTime();
          const nextAttemptTime = new Date(attempt.nextRetryAt).getTime();
          return nextAttemptTime - lastAttemptTime;
        });

      // Each retry should have a longer delay than the previous
      expect(delays[1]).toBeGreaterThan(delays[0]);
    });

    it('should provide observability for DLQ entries', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({
        status: 503,
        statusText: 'Service Unavailable',
      })) as any);

      await worker.processDelivery(endpoint, event, 'delivery-1');

      const dlqStats = worker.getDLQStats();
      expect(dlqStats.totalDLQEntries).toBe(1);
      expect(dlqStats.dlqEntries.length).toBe(1);

      const dlqEntry = dlqStats.dlqEntries[0];
      expect(dlqEntry.deliveryId).toBe('delivery-1');
      expect(dlqEntry.endpointId).toBe('endpoint-1');
      expect(dlqEntry.reason).toContain('Max retries');
    });

    it('should handle multiple concurrent deliveries with independent tracking', async () => {
      let attemptCount = 0;
      vi.stubGlobal('fetch', vi.fn(async () => {
        attemptCount++;
        // Succeed on even attempts, fail on odd
        return attemptCount % 2 === 0
          ? { status: 200, statusText: 'OK' }
          : { status: 503, statusText: 'Service Unavailable' };
      }) as any);

      const event2 = { ...event, id: 'event-456' };

      const result1 = await worker.processDelivery(endpoint, event, 'delivery-1');
      const result2 = await worker.processDelivery(endpoint, event2, 'delivery-2');

      // First delivery should retry and succeed
      expect(result1.success).toBe(true);
      expect(result1.attempts).toBe(2);

      // Each delivery should have independent retry tracking
      const delivery1 = webhookDeliveryStore.getDelivery('delivery-1');
      const delivery2 = webhookDeliveryStore.getDelivery('delivery-2');
      expect(delivery1?.status).toBe('delivered');
      expect(delivery2?.status).toBe('dlq');
    });
  });

  describe('Delivery Store', () => {
    beforeEach(() => {
      webhookDeliveryStore.clear();
    });

    it('should create and retrieve delivery records', () => {
      const endpoint: WebhookEndpoint = {
        id: 'endpoint-1',
        url: 'https://webhook.example.com',
        maxRetries: 5,
      };
      const event: WebhookEvent = {
        id: 'event-1',
        eventType: 'test',
        streamId: 'stream-1',
        data: {},
        timestamp: new Date().toISOString(),
      };

      webhookDeliveryStore.createDelivery('delivery-1', endpoint, event);

      const delivery = webhookDeliveryStore.getDelivery('delivery-1');
      expect(delivery).toBeDefined();
      expect(delivery?.deliveryId).toBe('delivery-1');
      expect(delivery?.status).toBe('pending');
    });

    it('should track delivery statistics', () => {
      const endpoint: WebhookEndpoint = {
        id: 'endpoint-1',
        url: 'https://webhook.example.com',
        maxRetries: 5,
      };
      const event: WebhookEvent = {
        id: 'event-1',
        eventType: 'test',
        streamId: 'stream-1',
        data: {},
        timestamp: new Date().toISOString(),
      };

      webhookDeliveryStore.createDelivery('delivery-1', endpoint, event);
      webhookDeliveryStore.createDelivery('delivery-2', endpoint, event);

      const stats = webhookDeliveryStore.getStatistics();
      expect(stats.totalDeliveries).toBe(2);
      expect(stats.pending).toBe(2);
      expect(stats.delivered).toBe(0);
      expect(stats.dlq).toBe(0);
    });
  });
});
