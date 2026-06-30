/**
 * Tests for GET /api/webhooks/health
 */

import { GET, deriveHealthStatus } from "./route";
import type { WebhookSubscriptionStats, WebhookDeliveryStats } from "./route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: <T>(body: T, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      json: async () => body,
    }),
  },
}));

jest.mock("next/headers", () => ({
  headers: () => ({ get: () => null }),
}));

const emptyStats: WebhookDeliveryStats = {
  total: 0,
  delivered: 0,
  failed: 0,
  pending: 0,
  dlq: 0,
  success_rate_pct: 100,
};

describe("GET /api/webhooks/health", () => {
  it("returns 200 with expected shape", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = (res as unknown as { body: Record<string, unknown> }).body;
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("checked_at");
    expect(body).toHaveProperty("subscriptions");
    expect(body).toHaveProperty("delivery_stats");
  });

  it("returns status 'ok' when all subscriptions are healthy", async () => {
    const res = await GET();
    const body = (res as unknown as { body: { status: string } }).body;
    expect(body.status).toBe("ok");
  });

  it("includes all subscription fields", async () => {
    const res = await GET();
    const body = (
      res as unknown as {
        body: { subscriptions: Record<string, unknown> };
      }
    ).body;
    expect(body.subscriptions).toHaveProperty("total");
    expect(body.subscriptions).toHaveProperty("active");
    expect(body.subscriptions).toHaveProperty("degraded");
    expect(body.subscriptions).toHaveProperty("disabled");
  });

  it("includes all delivery_stats fields", async () => {
    const res = await GET();
    const body = (
      res as unknown as {
        body: { delivery_stats: Record<string, unknown> };
      }
    ).body;
    expect(body.delivery_stats).toHaveProperty("total");
    expect(body.delivery_stats).toHaveProperty("delivered");
    expect(body.delivery_stats).toHaveProperty("failed");
    expect(body.delivery_stats).toHaveProperty("pending");
    expect(body.delivery_stats).toHaveProperty("dlq");
    expect(body.delivery_stats).toHaveProperty("success_rate_pct");
  });

  it("checked_at is a valid ISO-8601 timestamp", async () => {
    const res = await GET();
    const body = (res as unknown as { body: { checked_at: string } }).body;
    expect(new Date(body.checked_at).toISOString()).toBe(body.checked_at);
  });
});

describe("deriveHealthStatus", () => {
  const healthySubs: WebhookSubscriptionStats = {
    total: 10,
    active: 10,
    degraded: 0,
    disabled: 0,
  };

  it("returns 'ok' when no degraded subscriptions and no DLQ entries", () => {
    expect(deriveHealthStatus(healthySubs, emptyStats)).toBe("ok");
  });

  it("returns 'degraded' when any subscriptions are degraded", () => {
    const subs: WebhookSubscriptionStats = { ...healthySubs, degraded: 1 };
    expect(deriveHealthStatus(subs, emptyStats)).toBe("degraded");
  });

  it("returns 'degraded' when DLQ depth > 0", () => {
    const stats: WebhookDeliveryStats = { ...emptyStats, dlq: 3 };
    expect(deriveHealthStatus(healthySubs, stats)).toBe("degraded");
  });

  it("returns 'unhealthy' when more than 50% of subscriptions are degraded or disabled", () => {
    const subs: WebhookSubscriptionStats = {
      total: 10,
      active: 3,
      degraded: 4,
      disabled: 3,
    };
    expect(deriveHealthStatus(subs, emptyStats)).toBe("unhealthy");
  });

  it("returns 'ok' for empty subscription set (0 total)", () => {
    const emptySubs: WebhookSubscriptionStats = {
      total: 0,
      active: 0,
      degraded: 0,
      disabled: 0,
    };
    expect(deriveHealthStatus(emptySubs, emptyStats)).toBe("ok");
  });
});
