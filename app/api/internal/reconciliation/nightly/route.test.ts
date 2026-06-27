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

describe("POST /api/internal/reconciliation/nightly", () => {
  beforeEach(() => {
    resetConfigCache();
    process.env.STELLAR_NETWORK = "testnet";
    process.env.JWT_SECRET = "test-secret-at-least-32-characters-long";
    process.env.ALLOWED_ORIGINS = "http://localhost:3000";
    process.env.INTERNAL_SERVICE_HMAC_KEYS = JSON.stringify(authConfig.keys);
    process.env.INTERNAL_SERVICE_CURRENT_KEY_ID = authConfig.currentKeyId;
    process.env.INTERNAL_SERVICE_CLOCK_SKEW_SECONDS = String(authConfig.allowedClockSkewSeconds);
  });

  it("rejects unauthenticated requests with a standard error envelope", async () => {
    const response = await POST(
      new Request("http://localhost/api/internal/reconciliation/nightly", { method: "POST" })
    );

    const payload = await response.json();
    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("runs a nightly reconciliation and returns discrepancies for seeded drift", async () => {
    const body = JSON.stringify({ dryRun: true, correlationId: "corr-nightly-1" });
    const response = await POST(
      new Request("http://localhost/api/internal/reconciliation/nightly", {
        body,
        headers: createInternalServiceRequestHeaders({
          body,
          keyId: "current",
          method: "POST",
          secret: authConfig.keys.current,
          serviceName: "reconciliation-worker",
          timestampMs: Date.now(),
          url: "http://localhost/api/internal/reconciliation/nightly",
        }),
        method: "POST",
      })
    );

    const payload = await response.json();
    expect(response.status).toBe(202);
    expect(payload.data.mode).toBe("nightly");
    expect(payload.data.requestedBy).toBe("reconciliation-worker");
    expect(payload.data.report.status).toBe("MISMATCH_FOUND");
    expect(payload.data.report.mismatches.some((m: any) => m.streamId === "stream_2" && m.field === "released_amount")).toBe(true);
  });

  it("rejects invalid JSON bodies", async () => {
    const response = await POST(
      new Request("http://localhost/api/internal/reconciliation/nightly", {
        body: "invalid-json",
        headers: createInternalServiceRequestHeaders({
          body: "invalid-json",
          keyId: "current",
          method: "POST",
          secret: authConfig.keys.current,
          serviceName: "reconciliation-worker",
          timestampMs: Date.now(),
          url: "http://localhost/api/internal/reconciliation/nightly",
        }),
        method: "POST",
      })
    );

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INVALID_REQUEST");
  });
});
