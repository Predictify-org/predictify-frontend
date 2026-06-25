/** @jest-environment node */

import {
  createInternalServiceRequestHeaders,
  verifyInternalServiceRequest,
} from "@/app/lib/internal-service-auth";

const settings = {
  allowedClockSkewSeconds: 300,
  currentKeyId: "current",
  keys: {
    current: "a".repeat(32),
    next: "b".repeat(32),
  },
};

describe("internal service auth", () => {
  it("verifies a valid signed request", async () => {
    const body = JSON.stringify({ dryRun: true });
    const request = new Request("http://localhost/api/internal/reconciliation", {
      body,
      headers: createInternalServiceRequestHeaders({
        body,
        keyId: "current",
        method: "POST",
        secret: settings.keys.current,
        serviceName: "reconciliation-worker",
        timestampMs: Date.parse("2026-04-28T12:00:00.000Z"),
        url: "http://localhost/api/internal/reconciliation",
      }),
      method: "POST",
    });

    const result = await verifyInternalServiceRequest(request, {
      allowedServices: ["reconciliation-worker"],
      config: settings,
      now: new Date("2026-04-28T12:03:00.000Z"),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.serviceName).toBe("reconciliation-worker");
      expect(result.identity.keyId).toBe("current");
    }
  });

  it("rejects stale signatures", async () => {
    const headers = createInternalServiceRequestHeaders({
      keyId: "current",
      method: "POST",
      secret: settings.keys.current,
      serviceName: "reconciliation-worker",
      timestampMs: Date.parse("2026-04-28T12:00:00.000Z"),
      url: "http://localhost/api/internal/reconciliation",
    });

    const result = await verifyInternalServiceRequest(
      new Request("http://localhost/api/internal/reconciliation", {
        headers,
        method: "POST",
      }),
      {
        allowedServices: ["reconciliation-worker"],
        config: settings,
        now: new Date("2026-04-28T12:10:01.000Z"),
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("STALE_TIMESTAMP");
    }
  });

  it("rejects modified signatures", async () => {
    const headers = createInternalServiceRequestHeaders({
      keyId: "current",
      method: "POST",
      secret: settings.keys.current,
      serviceName: "reconciliation-worker",
      timestampMs: Date.parse("2026-04-28T12:00:00.000Z"),
      url: "http://localhost/api/internal/reconciliation",
    });

    headers["x-streampay-signature"] = "v1=deadbeef";

    const result = await verifyInternalServiceRequest(
      new Request("http://localhost/api/internal/reconciliation", {
        headers,
        method: "POST",
      }),
      {
        allowedServices: ["reconciliation-worker"],
        config: settings,
        now: new Date("2026-04-28T12:01:00.000Z"),
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("BAD_SIGNATURE");
    }
  });
});
