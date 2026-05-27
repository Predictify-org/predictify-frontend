/** @jest-environment node */
import { GET } from './route';
import { webhookDeliveryStore } from '@/app/lib/webhook-delivery-store';
import { WebhookEndpoint, WebhookEvent } from '@/app/lib/webhook-delivery';

describe('GET /api/webhooks/deliveries', () => {
  const endpoint1: WebhookEndpoint = { id: 'ep-1', url: 'https://e1.com', maxRetries: 3 };
  const endpoint2: WebhookEndpoint = { id: 'ep-2', url: 'https://e2.com', maxRetries: 3 };
  
  const event1: WebhookEvent = {
    id: 'evt-1',
    eventType: 'test.event',
    streamId: 's1',
    data: {},
    timestamp: new Date().toISOString()
  };

  beforeEach(() => {
    webhookDeliveryStore.clear();
    
    // Create some deliveries
    // 1. Delivered
    const d1 = webhookDeliveryStore.createDelivery('del-1', endpoint1, event1);
    webhookDeliveryStore.markDelivered('del-1');
    
    // 2. Pending
    const d2 = webhookDeliveryStore.createDelivery('del-2', endpoint1, event1);
    
    // 3. DLQ
    const d3 = webhookDeliveryStore.createDelivery('del-3', endpoint2, event1);
    webhookDeliveryStore.recordAttempt('del-3', {
      attemptNumber: 1,
      timestamp: new Date().toISOString(),
      statusCode: 500,
      error: 'Internal Server Error'
    });
    webhookDeliveryStore.moveToDLQ('del-3', 'Max retries exceeded');
    
    // 4. Another Delivered for endpoint 2
    const d4 = webhookDeliveryStore.createDelivery('del-4', endpoint2, event1);
    webhookDeliveryStore.markDelivered('del-4');
  });

  it('returns all deliveries when no filters are applied', async () => {
    const request = new Request('http://localhost/api/webhooks/deliveries');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(4);
    expect(body.meta.total).toBe(4);
    // Should be sorted newest first. Since we created them in order, del-4 is newest.
    expect(body.data[0].deliveryId).toBe('del-4');
  });

  it('filters by status', async () => {
    const request = new Request('http://localhost/api/webhooks/deliveries?status=delivered');
    const response = await GET(request);
    const body = await response.json();

    expect(body.data).toHaveLength(2);
    expect(body.data.every((d: any) => d.status === 'delivered')).toBe(true);
  });

  it('filters by endpoint_id', async () => {
    const request = new Request('http://localhost/api/webhooks/deliveries?endpoint_id=ep-1');
    const response = await GET(request);
    const body = await response.json();

    expect(body.data).toHaveLength(2);
    expect(body.data.every((d: any) => d.deliveryId === 'del-1' || d.deliveryId === 'del-2')).toBe(true);
  });

  it('handles pagination with limit and cursor', async () => {
    // First page
    const req1 = new Request('http://localhost/api/webhooks/deliveries?limit=2');
    const res1 = await GET(req1);
    const body1 = await res1.json();

    expect(body1.data).toHaveLength(2);
    expect(body1.meta.hasNext).toBe(true);
    expect(body1.meta.nextCursor).toBeDefined();

    // Second page
    const req2 = new Request(`http://localhost/api/webhooks/deliveries?limit=2&cursor=${body1.meta.nextCursor}`);
    const res2 = await GET(req2);
    const body2 = await res2.json();

    expect(body2.data).toHaveLength(2);
    expect(body2.meta.hasNext).toBe(false);
    expect(body2.meta.nextCursor).toBeNull();
    
    // Ensure no overlap
    const ids1 = body1.data.map((d: any) => d.deliveryId);
    const ids2 = body2.data.map((d: any) => d.deliveryId);
    ids1.forEach((id: string) => expect(ids2).not.toContain(id));
  });

  it('returns empty data when no deliveries match filters', async () => {
    const request = new Request('http://localhost/api/webhooks/deliveries?status=failed');
    const response = await GET(request);
    const body = await response.json();

    expect(body.data).toHaveLength(0);
    expect(body.meta.hasNext).toBe(false);
  });
});
