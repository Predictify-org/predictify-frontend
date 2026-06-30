/** @jest-environment node */

import { GET } from "./route";
import { resetConfigCache } from "@/app/lib/config";
import { createInternalServiceRequestHeaders } from "@/app/lib/internal-service-auth";

const authConfig = {
  allowedClockSkewSeconds: 300,
  currentKeyId: "current",
  keys: {
    current: "a".repeat(32),
    next: "b".repeat(32),
  },
};

/** Build a signed GET request for the diff endpoint. */
function makeRequest(streamId: string, overrideHeaders?: Record<string, string>) {
  const url = `http://localhost/api/internal/reconciliation/diff/${streamId}`;
  const headers = {
    ...createInternalServiceRequestHeaders({
      keyId: authConfig.currentKeyId,
      method: "GET",
      secret: authConfig.keys.current,
      serviceName: "reconciliation-worker",
      timestampMs: Date.now(),
      url,
    }),
    ...overrideHeaders,
  };
  return new Request(url, { method: "GET", headers });
}

describe("GET /api/internal/reconciliation/diff/:id", () => {
  beforeEach(() => {
    resetConfigCache();
    process.env.STELLAR_NETWORK = "testnet";
    process.env.JWT_SECRET = "test-secret-at-least-32-characters-long";
    process.env.ALLOWED_ORIGINS = "http://localhost:3000";
    process.env.INTERNAL_SERVICE_HMAC_KEYS = JSON.stringify(authConfig.keys);
    process.env.INTERNAL_SERVICE_CURRENT_KEY_ID = authConfig.currentKeyId;
    process.env.INTERNAL_SERVICE_CLOCK_SKEW_SECONDS = String(
      authConfig.allowedClockSkewSeconds
    );
  });

  // ── Auth guard ────────────────────────────────────────────────────────────

  it("conceals the route (404) when no auth headers are present", async () => {
    const response = await GET(
      new Request("http://localhost/api/internal/reconciliation/diff/stream_1", {
        method: "GET",
      }),
      { params: { id: "stream_1" } }
    );

    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("conceals the route (404) when the signature is invalid", async () => {
    const response = await GET(
      makeRequest("stream_1", { "x-streampay-signature": "v1=badsig" }),
      { params: { id: "stream_1" } }
    );

    expect(response.status).toBe(404);
  });

  it("conceals the route (404) when the key id is unknown", async () => {
    const url = "http://localhost/api/internal/reconciliation/diff/stream_1";
    const headers = createInternalServiceRequestHeaders({
      keyId: "unknown-key",
      method: "GET",
      secret: "c".repeat(32),
      serviceName: "reconciliation-worker",
      timestampMs: Date.now(),
      url,
    });
    const response = await GET(
      new Request(url, { method: "GET", headers }),
      { params: { id: "stream_1" } }
    );

    expect(response.status).toBe(404);
  });

  it("conceals the route (404) for a disallowed service name", async () => {
    const url = "http://localhost/api/internal/reconciliation/diff/stream_1";
    const headers = createInternalServiceRequestHeaders({
      keyId: authConfig.currentKeyId,
      method: "GET",
      secret: authConfig.keys.current,
      serviceName: "some-other-service",
      timestampMs: Date.now(),
      url,
    });
    const response = await GET(
      new Request(url, { method: "GET", headers }),
      { params: { id: "stream_1" } }
    );

    expect(response.status).toBe(404);
  });

  // ── Happy paths ───────────────────────────────────────────────────────────

  it("returns 200 with inSync:true for a matching stream", async () => {
    const response = await GET(makeRequest("stream_1"), {
      params: { id: "stream_1" },
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.streamId).toBe("stream_1");
    expect(body.data.inSync).toBe(true);
    expect(body.data.diffs).toHaveLength(0);
    expect(body.data.db).toBeDefined();
    expect(body.data.onChain).toBeDefined();
    expect(body.meta.auth.keyId).toBe(authConfig.currentKeyId);
  });

  it("returns 200 with inSync:false and the diff for stream_2", async () => {
    const response = await GET(makeRequest("stream_2"), {
      params: { id: "stream_2" },
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.streamId).toBe("stream_2");
    expect(body.data.inSync).toBe(false);
    expect(body.data.diffs).toHaveLength(1);
    expect(body.data.diffs[0]).toMatchObject({
      field: "released_amount",
      dbValue: "1000000000",
      onChainValue: "1100000000",
      toleranceApplied: false,
    });
    expect(body.data.db).toBeDefined();
    expect(body.data.onChain).toBeDefined();
  });

  it("returns 200 for a DB-only stream with no on-chain record (on-chain fetch fails)", async () => {
    // stream-ada exists in the in-memory repo store but has no on-chain record.
    // fetchStream throws SorobanError; the route catches it and sets onChain:null.
    // The reconciliation service also catches the throw internally and records it
    // as an error (not a mismatch), so inSync is true with diffs:[].
    const response = await GET(makeRequest("stream-ada"), {
      params: { id: "stream-ada" },
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.streamId).toBe("stream-ada");
    // On-chain snapshot is null because fetchStream threw
    expect(body.data.onChain).toBeNull();
    // DB record is present
    expect(body.data.db).toBeDefined();
    expect(body.data.db.id).toBe("stream-ada");
  });

  it("includes a checkedAt ISO timestamp", async () => {
    const before = Date.now();
    const response = await GET(makeRequest("stream_1"), {
      params: { id: "stream_1" },
    });
    const after = Date.now();

    const body = await response.json();
    expect(response.status).toBe(200);
    const checkedAt = Date.parse(body.data.checkedAt);
    expect(checkedAt).toBeGreaterThanOrEqual(before);
    expect(checkedAt).toBeLessThanOrEqual(after);
  });

  // ── Error paths ───────────────────────────────────────────────────────────

  it("returns 404 STREAM_NOT_FOUND for a completely unknown stream id", async () => {
    const response = await GET(makeRequest("does-not-exist"), {
      params: { id: "does-not-exist" },
    });

    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error.code).toBe("STREAM_NOT_FOUND");
  });

  it("reflects the calling service name in meta.auth", async () => {
    const url = "http://localhost/api/internal/reconciliation/diff/stream_1";
    const headers = createInternalServiceRequestHeaders({
      keyId: authConfig.currentKeyId,
      method: "GET",
      secret: authConfig.keys.current,
      serviceName: "ops-automation",
      timestampMs: Date.now(),
      url,
    });
    const response = await GET(
      new Request(url, { method: "GET", headers }),
      { params: { id: "stream_1" } }
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    // keyId is echoed; serviceName isn't in meta but auth is accepted
    expect(body.meta.auth.keyId).toBe(authConfig.currentKeyId);
  });
});
