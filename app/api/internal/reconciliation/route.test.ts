/** @jest-environment node */

import { POST } from "./route";
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

describe("POST /api/internal/reconciliation", () => {
  beforeEach(() => {
    resetConfigCache();
    process.env.STELLAR_NETWORK = "testnet";
    process.env.JWT_SECRET = "test-secret-at-least-32-characters-long";
    process.env.INTERNAL_SERVICE_HMAC_KEYS = JSON.stringify(authConfig.keys);
    process.env.INTERNAL_SERVICE_CURRENT_KEY_ID = authConfig.currentKeyId;
    process.env.INTERNAL_SERVICE_CLOCK_SKEW_SECONDS = String(authConfig.allowedClockSkewSeconds);
  });

  it("conceals the route when no service signature is present", async () => {
    const response = await POST(
      new Request("http://localhost/api/internal/reconciliation", { method: "POST" })
    );

    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("conceals the route when the signature is invalid", async () => {
    const headers = createInternalServiceRequestHeaders({
      body: JSON.stringify({ dryRun: true }),
      keyId: "current",
      method: "POST",
      secret: authConfig.keys.current,
      serviceName: "reconciliation-worker",
      timestampMs: Date.parse("2026-04-28T12:00:00.000Z"),
      url: "http://localhost/api/internal/reconciliation",
    });
    headers["x-streampay-signature"] = "v1=invalid";

    const response = await POST(
      new Request("http://localhost/api/internal/reconciliation", {
        body: JSON.stringify({ dryRun: true }),
        headers,
        method: "POST",
      })
    );

    expect(response.status).toBe(404);
  });

  it("conceals the route when the key id is unknown", async () => {
    const headers = createInternalServiceRequestHeaders({
      keyId: "unknown",
      method: "POST",
      secret: "c".repeat(32),
      serviceName: "reconciliation-worker",
      timestampMs: Date.now(),
      url: "http://localhost/api/internal/reconciliation",
    });

    const response = await POST(
      new Request("http://localhost/api/internal/reconciliation", {
        headers,
        method: "POST",
      })
    );

    expect(response.status).toBe(404);
  });

  it("accepts a valid signed internal request and detects missing on-chain record for stream-ada", async () => {
    const body = JSON.stringify({ dryRun: true, streamId: "stream-ada" });
    const response = await POST(
      new Request("http://localhost/api/internal/reconciliation", {
        body,
        headers: createInternalServiceRequestHeaders({
          body,
          keyId: "current",
          method: "POST",
          secret: authConfig.keys.current,
          serviceName: "reconciliation-worker",
          timestampMs: Date.now(),
          url: "http://localhost/api/internal/reconciliation",
        }),
        method: "POST",
      })
    );

    const payload = await response.json();
    expect(response.status).toBe(202);
    expect(payload.data.requestedBy).toBe("reconciliation-worker");
    expect(payload.data.scope).toBe("stream-ada");
    expect(payload.data.discrepancies).toHaveLength(1);
    expect(payload.data.discrepancies[0]).toEqual({
      streamId: "stream-ada",
      field: "presence",
      dbValue: "exists",
      onChainValue: "missing"
    });
  });

  it("detects seeded stream_2 mismatch", async () => {
    const body = JSON.stringify({ dryRun: true, streamId: "stream_2" });
    const response = await POST(
      new Request("http://localhost/api/internal/reconciliation", {
        body,
        headers: createInternalServiceRequestHeaders({
          body,
          keyId: "current",
          method: "POST",
          secret: authConfig.keys.current,
          serviceName: "reconciliation-worker",
          timestampMs: Date.now(),
          url: "http://localhost/api/internal/reconciliation",
        }),
        method: "POST",
      })
    );

    const payload = await response.json();
    expect(response.status).toBe(202);
    expect(payload.data.scope).toBe("stream_2");
    expect(payload.data.discrepancies).toHaveLength(1);
    expect(payload.data.discrepancies[0]).toEqual({
      streamId: "stream_2",
      field: "released_amount",
      dbValue: "1000000000",
      onChainValue: "1100000000"
    });
  });

  it("reconciles all streams and returns all discrepancies", async () => {
    const body = JSON.stringify({ dryRun: true });
    const response = await POST(
      new Request("http://localhost/api/internal/reconciliation", {
        body,
        headers: createInternalServiceRequestHeaders({
          body,
          keyId: "current",
          method: "POST",
          secret: authConfig.keys.current,
          serviceName: "reconciliation-worker",
          timestampMs: Date.now(),
          url: "http://localhost/api/internal/reconciliation",
        }),
        method: "POST",
      })
    );

    const payload = await response.json();
    expect(response.status).toBe(202);
    expect(payload.data.scope).toBe("all-streams");
    
    // Should have discrepancies for stream_2 (released_amount) and stream-ada, stream-kemi, stream-yusuf (presence)
    expect(payload.data.discrepancies.length).toBeGreaterThanOrEqual(2);
    
    const stream2Mismatch = payload.data.discrepancies.find((d: any) => d.streamId === "stream_2");
    expect(stream2Mismatch).toBeDefined();
    expect(stream2Mismatch.field).toBe("released_amount");
    
    const streamAdaMismatch = payload.data.discrepancies.find((d: any) => d.streamId === "stream-ada");
    expect(streamAdaMismatch).toBeDefined();
    expect(streamAdaMismatch.field).toBe("presence");
  });

  it("rejects invalid JSON body", async () => {
    const response = await POST(
      new Request("http://localhost/api/internal/reconciliation", {
        body: "invalid-json",
        headers: createInternalServiceRequestHeaders({
          body: "invalid-json",
          keyId: "current",
          method: "POST",
          secret: authConfig.keys.current,
          serviceName: "reconciliation-worker",
          timestampMs: Date.now(),
          url: "http://localhost/api/internal/reconciliation",
        }),
        method: "POST",
      })
    );

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 404 for a completely non-existent streamId", async () => {
    const body = JSON.stringify({ dryRun: true, streamId: "non-existent-stream-id" });
    const response = await POST(
      new Request("http://localhost/api/internal/reconciliation", {
        body,
        headers: createInternalServiceRequestHeaders({
          body,
          keyId: "current",
          method: "POST",
          secret: authConfig.keys.current,
          serviceName: "reconciliation-worker",
          timestampMs: Date.now(),
          url: "http://localhost/api/internal/reconciliation",
        }),
        method: "POST",
      })
    );

    const payload = await response.json();
    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("STREAM_NOT_FOUND");
  });

  it("handles dryRun: false and updates run record in DB", async () => {
    const body = JSON.stringify({ dryRun: false, streamId: "stream_1" });
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const response = await POST(
      new Request("http://localhost/api/internal/reconciliation", {
        body,
        headers: createInternalServiceRequestHeaders({
          body,
          keyId: "current",
          method: "POST",
          secret: authConfig.keys.current,
          serviceName: "reconciliation-worker",
          timestampMs: Date.now(),
          url: "http://localhost/api/internal/reconciliation",
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(202);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[DB] Updated last run status to SUCCESS"));
    consoleSpy.mockRestore();
  });
});
