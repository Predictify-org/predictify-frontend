/** @jest-environment node */

import { POST } from "./route";
import { resetConfigCache } from "@/app/lib/config";
import { getStore, resetDb } from "@/app/lib/db";
import { createInternalServiceRequestHeaders } from "@/app/lib/internal-service-auth";

const URL = "http://localhost/api/internal/cleanup/idempotency";

const keys = { current: "a".repeat(32), next: "b".repeat(32) };

function authedRequest(body: string): Request {
  const headers = createInternalServiceRequestHeaders({
    body,
    keyId: "current",
    method: "POST",
    secret: keys.current,
    serviceName: "cleanup-worker",
    url: URL,
  });
  return new Request(URL, { method: "POST", headers, body });
}

function seedIdempotency(now: number) {
  const store = getStore().idempotencyStore;
  store.set("fresh", { fingerprint: "f1", expiresAt: now + 60_000, status: 200, body: {} });
  store.set("stale-1", { fingerprint: "f2", expiresAt: now - 1, status: 200, body: {} });
  store.set("stale-2", { fingerprint: "f3", expiresAt: now - 10_000, status: 200, body: {} });
  store.set("malformed", { fingerprint: "f4" }); // no expiresAt → treated as stale
}

describe("POST /api/internal/cleanup/idempotency", () => {
  beforeEach(() => {
    resetConfigCache();
    resetDb();
    process.env.STELLAR_NETWORK = "testnet";
    process.env.JWT_SECRET = "test-secret-at-least-32-characters-long";
    process.env.ALLOWED_ORIGINS = "http://localhost:3000";
    process.env.INTERNAL_SERVICE_HMAC_KEYS = JSON.stringify(keys);
    process.env.INTERNAL_SERVICE_CURRENT_KEY_ID = "current";
    process.env.INTERNAL_SERVICE_CLOCK_SKEW_SECONDS = "300";
  });

  it("conceals the route when unauthenticated", async () => {
    const res = await POST(new Request(URL, { method: "POST" }));
    expect(res.status).toBe(404);
  });

  it("removes expired and malformed idempotency keys", async () => {
    const now = Date.now();
    seedIdempotency(now);

    const res = await POST(authedRequest(""));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.scanned).toBe(4);
    expect(body.expired).toBe(3);
    expect(body.removed).toBe(3);
    expect(body.remaining).toBe(1);
    expect(body.dryRun).toBe(false);

    const store = getStore().idempotencyStore;
    expect(store.has("fresh")).toBe(true);
    expect(store.has("stale-1")).toBe(false);
    expect(store.has("malformed")).toBe(false);
  });

  it("supports dryRun without deleting anything", async () => {
    const now = Date.now();
    seedIdempotency(now);

    const payload = JSON.stringify({ dryRun: true });
    const res = await POST(authedRequest(payload));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.expired).toBe(3);
    expect(body.removed).toBe(0);
    expect(body.dryRun).toBe(true);
    expect(getStore().idempotencyStore.size).toBe(4);
  });

  it("rejects a non-boolean dryRun", async () => {
    const res = await POST(authedRequest(JSON.stringify({ dryRun: "yes" })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("rejects an invalid JSON body", async () => {
    const res = await POST(authedRequest("{not json"));
    expect(res.status).toBe(400);
  });
});
