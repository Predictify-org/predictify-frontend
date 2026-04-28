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

  it("accepts a valid signed internal request", async () => {
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
  });
});
