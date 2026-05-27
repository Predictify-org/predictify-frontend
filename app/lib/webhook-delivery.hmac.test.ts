import {
  WebhookDeliveryClient,
  WebhookEndpoint,
  WebhookEvent,
  generateWebhookSignature,
  verifyWebhookSignature,
} from "@/app/lib/webhook-delivery";

describe("webhook HMAC signing", () => {
  const payload = JSON.stringify({ eventType: "stream.settled", amount: 1000 });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const deliveryId = "delivery-123";

  it("rejects tampered payloads", () => {
    const signature = generateWebhookSignature(payload, "active-secret", timestamp, deliveryId);
    const tamperedPayload = JSON.stringify({ eventType: "stream.settled", amount: 1001 });

    expect(
      verifyWebhookSignature(tamperedPayload, "active-secret", signature, timestamp, deliveryId)
    ).toBe(false);
  });

  it("rejects stale timestamps outside the replay window", () => {
    const staleTimestamp = Math.floor((Date.now() - 400000) / 1000).toString();
    const signature = generateWebhookSignature(payload, "active-secret", staleTimestamp, deliveryId);

    expect(
      verifyWebhookSignature(payload, "active-secret", signature, staleTimestamp, deliveryId)
    ).toBe(false);
  });

  it("accepts active and previous secrets during rotation", () => {
    const signature = generateWebhookSignature(
      payload,
      ["active-secret", "previous-secret"],
      timestamp,
      deliveryId
    );

    expect(signature.match(/v1=/g)).toHaveLength(2);
    expect(verifyWebhookSignature(payload, "active-secret", signature, timestamp, deliveryId)).toBe(true);
    expect(verifyWebhookSignature(payload, "previous-secret", signature, timestamp, deliveryId)).toBe(true);
    expect(verifyWebhookSignature(payload, "unrelated-secret", signature, timestamp, deliveryId)).toBe(false);
  });

  it("rejects malformed signature values without throwing", () => {
    expect(
      verifyWebhookSignature(
        payload,
        "active-secret",
        `t=${timestamp},id=${deliveryId},v1=abc`,
        timestamp,
        deliveryId
      )
    ).toBe(false);
  });
});

describe("webhook delivery signing headers", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("sends timestamp, nonce, and dual signatures when a previous secret is configured", async () => {
    const deliveryId = "delivery-123";
    let capturedHeaders: Record<string, string> = {};
    const client = new WebhookDeliveryClient();
    const endpoint: WebhookEndpoint = {
      id: "endpoint-1",
      url: "https://webhook.example.com/events",
      secret: "active-secret",
      previousSecrets: ["previous-secret"],
      maxRetries: 3,
    };
    const event: WebhookEvent = {
      id: "event-123",
      eventType: "stream.settled",
      streamId: "stream-456",
      data: { amount: 1000 },
      timestamp: new Date().toISOString(),
    };

    jest.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return {
        status: 200,
        statusText: "OK",
      } as Response;
    });

    const result = await client.attemptDelivery(endpoint, event, deliveryId, 1);

    expect(result.success).toBe(true);
    expect(capturedHeaders["X-StreamPay-Timestamp"]).toMatch(/^\d+$/);
    expect(capturedHeaders["X-StreamPay-Nonce"]).toBe(`event-123:${deliveryId}:1`);
    expect(capturedHeaders["X-StreamPay-Signature"]).toContain(`id=${deliveryId}`);
    expect(capturedHeaders["X-StreamPay-Signature"].match(/v1=/g)).toHaveLength(2);
  });
});
