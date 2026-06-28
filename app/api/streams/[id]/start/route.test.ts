/** @jest-environment node */

import { POST } from "./route";
import { db, resetDb } from "@/app/lib/db";
import { resetRateLimitStore } from "@/app/lib/rate-limit-store";
import * as orgPolicyModule from "@/app/lib/org-policy";

describe("Stream Start Route - POST /api/streams/:id/start", () => {
  const streamId = "stream-ada";
  const outsiderAddr = "GOUTSIDER6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW";
  const viewerAddr = "GVIEWER75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GS";

  beforeEach(() => {
    resetDb();
    resetRateLimitStore();
  });

  it("starts a draft stream successfully", async () => {
    const req = new Request(`http://localhost/api/streams/stream-kemi/start`, {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "stream-kemi" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("active");
    expect(db.streams.get("stream-kemi")?.status).toBe("active");
  });

  it("starts a paused stream successfully", async () => {
    // Setup paused stream in DB
    db.streams.set("stream-paused", {
      id: "stream-paused",
      status: "paused",
      recipient: "Test Recipient",
      rate: "10 XLM / month",
      schedule: "monthly",
      createdAt: "2026-04-15T08:00:00Z",
      updatedAt: "2026-04-27T20:00:00Z",
      token: "XLM",
      senderAddress: "GD7H...3J4K",
      recipientAddress: "GCRE...PAUSED",
      totalAmount: "648000000",
      releasedAmount: "0",
      vestedAmount: "0",
    } as any);

    const req = new Request(`http://localhost/api/streams/stream-paused/start`, {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "stream-paused" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("active");
    expect(db.streams.get("stream-paused")?.status).toBe("active");
  });

  it("is idempotent when stream is already active", async () => {
    const req = new Request(`http://localhost/api/streams/stream-ada/start`, {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "stream-ada" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("active");
    expect(db.streams.get("stream-ada")?.status).toBe("active");
  });

  it("rejects starting an ended stream with 409 ILLEGAL_TRANSITION", async () => {
    const req = new Request(`http://localhost/api/streams/stream-yusuf/start`, {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "stream-yusuf" }) });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("ILLEGAL_TRANSITION");
    expect(body.error.message).toContain("Action 'start' is illegal");
  });

  it("rejects starting a withdrawn stream with 409 ILLEGAL_TRANSITION", async () => {
    // Setup withdrawn stream in DB
    db.streams.set("stream-withdrawn", {
      id: "stream-withdrawn",
      status: "withdrawn",
      recipient: "Test Recipient",
      rate: "10 XLM / month",
      schedule: "monthly",
      createdAt: "2026-04-15T08:00:00Z",
      updatedAt: "2026-04-27T20:00:00Z",
      token: "XLM",
      senderAddress: "GD7H...3J4K",
      recipientAddress: "GCRE...WITHDRAWN",
      totalAmount: "648000000",
      releasedAmount: "648000000",
      vestedAmount: "648000000",
    } as any);

    const req = new Request(`http://localhost/api/streams/stream-withdrawn/start`, {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "stream-withdrawn" }) });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("ILLEGAL_TRANSITION");
    expect(body.error.message).toContain("Action 'start' is illegal");
  });

  it("returns 404 STREAM_NOT_FOUND when stream does not exist", async () => {
    const req = new Request(`http://localhost/api/streams/stream-missing/start`, {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "stream-missing" }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("STREAM_NOT_FOUND");
  });

  it("enforces rate limits", async () => {
    // Trigger rate limiting by calling POST 11 times
    for (let i = 0; i < 10; i++) {
      const req = new Request(`http://localhost/api/streams/stream-kemi/start`, {
        method: "POST",
      });
      await POST(req, { params: Promise.resolve({ id: "stream-kemi" }) });
    }
    const reqLimit = new Request(`http://localhost/api/streams/stream-kemi/start`, {
      method: "POST",
    });
    const resLimit = await POST(reqLimit, { params: Promise.resolve({ id: "stream-kemi" }) });
    expect(resLimit.status).toBe(429);
    const body = await resLimit.json();
    expect(body.error.code).toBe("rate_limit_exceeded");
  });

  it("enforces org policy and denies non-members (403)", async () => {
    const req = new Request(`http://localhost/api/streams/stream-ada/start`, {
      method: "POST",
      headers: {
        "Actor-Wallet-Address": outsiderAddr,
      },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "stream-ada" }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_ORG_MEMBER");
  });

  it("enforces org policy and denies insufficient roles (403)", async () => {
    const req = new Request(`http://localhost/api/streams/stream-ada/start`, {
      method: "POST",
      headers: {
        "Actor-Wallet-Address": viewerAddr,
      },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "stream-ada" }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("ROLE_INSUFFICIENT");
  });

  it("enforces org policy and returns 409 when approval is required", async () => {
    const spy = jest.spyOn(orgPolicyModule, "checkStreamOrgPolicy").mockReturnValueOnce({
      allowed: true,
      requiresApproval: true,
    });

    try {
      const req = new Request(`http://localhost/api/streams/stream-ada/start`, {
        method: "POST",
        headers: {
          "Actor-Wallet-Address": viewerAddr, // any address to trigger the check
        },
      });
      const res = await POST(req, { params: Promise.resolve({ id: "stream-ada" }) });
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error.code).toBe("APPROVAL_REQUIRED");
    } finally {
      spy.mockRestore();
    }
  });

  it("handles idempotency key replay", async () => {
    const req1 = new Request(`http://localhost/api/streams/stream-kemi/start`, {
      method: "POST",
      headers: {
        "Idempotency-Key": "start-idem-key",
      },
    });
    const res1 = await POST(req1, { params: Promise.resolve({ id: "stream-kemi" }) });
    expect(res1.status).toBe(200);
    const body1 = await res1.json();

    const req2 = new Request(`http://localhost/api/streams/stream-kemi/start`, {
      method: "POST",
      headers: {
        "Idempotency-Key": "start-idem-key",
      },
    });
    const res2 = await POST(req2, { params: Promise.resolve({ id: "stream-kemi" }) });
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2).toEqual(body1);
  });
});
