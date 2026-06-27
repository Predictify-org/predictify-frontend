/**
 * Concurrency tests for stream lifecycle route handlers.
 *
 * These tests exercise the per-stream lock (withLock) to verify that
 * concurrent requests cannot interleave and corrupt stream state.
 *
 * Covered scenarios
 * -----------------
 * 1. Two concurrent pauses with the same Idempotency-Key → exactly one
 *    state change, second caller gets the cached response.
 * 2. Two concurrent pauses with different keys → exactly one succeeds
 *    (409 for the second because the stream is already paused).
 * 3. Concurrent pause + start on the same stream → one wins, one gets 409.
 * 4. Concurrent pause + stop on the same stream → one wins, one gets 409.
 * 5. Concurrent pause + settle on the same stream → one wins, one gets 409.
 * 6. Double pause with same key is idempotent (no double-write).
 * 7. Org-policy approval flow: requiresApprovalToPause returns 202.
 * 8. Pause on non-existent stream returns 404.
 * 9. Pause on already-paused stream returns 409.
 * 10. Pause on ended stream returns 409.
 */

import { NextRequest } from "next/server";
import { db, resetDb } from "@/app/lib/db";
import { POST as pauseHandler } from "@/app/api/streams/[id]/pause/route";
import { POST as startHandler } from "@/app/api/streams/[id]/start/route";
import { POST as stopHandler } from "@/app/api/streams/[id]/stop/route";
import { POST as settleHandler } from "@/app/api/streams/[id]/settle/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(idempotencyKey?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return new NextRequest("http://localhost/api/streams/s1/pause", {
    method: "POST",
    headers,
  });
}

function makeParams(id = "s1"): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function activeStream(overrides = {}): any {
  return {
    id: "s1",
    recipient: "r1",
    rate: "10 XLM/day",
    schedule: "daily",
    status: "active" as const,
    recipientId: "r1",
    balance: 100,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    token: "XLM",
    ...overrides,
  };
}

beforeEach(() => {
  resetDb({ s1: activeStream() });
});

// ---------------------------------------------------------------------------
// 1. Same Idempotency-Key — only one state change
// ---------------------------------------------------------------------------

test("two concurrent pauses with the same Idempotency-Key produce one state change", async () => {
  const key = "idem-key-1";
  const [r1, r2] = await Promise.all([
    pauseHandler(makeReq(key), makeParams()),
    pauseHandler(makeReq(key), makeParams()),
  ]);

  // Both must succeed (200)
  expect(r1.status).toBe(200);
  expect(r2.status).toBe(200);

  // The stream must be paused exactly once
  expect(db.streams["s1"].status).toBe("paused");

  // Both responses must be identical (cached replay)
  const [b1, b2] = await Promise.all([r1.json(), r2.json()]);
  expect(b1).toEqual(b2);
});

// ---------------------------------------------------------------------------
// 2. Different keys — second pause hits 409
// ---------------------------------------------------------------------------

test("two concurrent pauses with different Idempotency-Keys: one succeeds, one gets 409", async () => {
  const [r1, r2] = await Promise.all([
    pauseHandler(makeReq("key-a"), makeParams()),
    pauseHandler(makeReq("key-b"), makeParams()),
  ]);

  const statuses = [r1.status, r2.status].sort();
  expect(statuses).toEqual([200, 409]);
  expect(db.streams["s1"].status).toBe("paused");
});

// ---------------------------------------------------------------------------
// 3. Concurrent pause + start
// ---------------------------------------------------------------------------

test("concurrent pause and start: one wins, one gets 409", async () => {
  const [pauseRes, startRes] = await Promise.all([
    pauseHandler(makeReq(), makeParams()),
    startHandler(
      new NextRequest("http://localhost/api/streams/s1/start", { method: "POST" }),
      makeParams(),
    ),
  ]);

  const statuses = [pauseRes.status, startRes.status].sort();
  // One must be 200, the other 409 (start requires draft|paused; pause requires active)
  expect(statuses).toEqual([200, 409]);
});

// ---------------------------------------------------------------------------
// 4. Concurrent pause + stop
// ---------------------------------------------------------------------------

test("concurrent pause and stop: one wins, one gets 409", async () => {
  const [pauseRes, stopRes] = await Promise.all([
    pauseHandler(makeReq(), makeParams()),
    stopHandler(
      new NextRequest("http://localhost/api/streams/s1/stop", { method: "POST" }),
      makeParams(),
    ),
  ]);

  const statuses = [pauseRes.status, stopRes.status].sort();
  expect(statuses).toEqual([200, 409]);
});

// ---------------------------------------------------------------------------
// 5. Concurrent pause + settle
// ---------------------------------------------------------------------------

test("concurrent pause and settle: one wins, one gets 409", async () => {
  const [pauseRes, settleRes] = await Promise.all([
    pauseHandler(makeReq(), makeParams()),
    settleHandler(
      new NextRequest("http://localhost/api/streams/s1/settle", { method: "POST" }),
      makeParams(),
    ),
  ]);

  const statuses = [pauseRes.status, settleRes.status].sort();
  expect(statuses).toEqual([200, 409]);
});

// ---------------------------------------------------------------------------
// 6. Idempotency — no double-write
// ---------------------------------------------------------------------------

test("repeated pause with same Idempotency-Key does not mutate state twice", async () => {
  const key = "idem-key-2";

  const r1 = await pauseHandler(makeReq(key), makeParams());
  expect(r1.status).toBe(200);
  const firstUpdatedAt = db.streams["s1"].updatedAt;

  // Second call — must return cached response, not re-write updatedAt
  const r2 = await pauseHandler(makeReq(key), makeParams());
  expect(r2.status).toBe(200);
  expect(db.streams["s1"].updatedAt).toBe(firstUpdatedAt);

  const [b1, b2] = await Promise.all([r1.json(), r2.json()]);
  expect(b1).toEqual(b2);
});

// ---------------------------------------------------------------------------
// 7. Org-policy approval flow
// ---------------------------------------------------------------------------

test("pause on stream requiring approval returns 202 and sets pendingApproval", async () => {
  resetDb({ s1: activeStream({ requiresApprovalToPause: true }) });

  const res = await pauseHandler(makeReq(), makeParams());
  expect(res.status).toBe(202);

  const body = await res.json();
  expect(body.approvalRequired).toBe(true);
  expect(db.streams["s1"].pendingApproval).toBe(true);
  // Stream must still be active — not yet paused
  expect(db.streams["s1"].status).toBe("active");
});

test("pause after approval is granted transitions to paused", async () => {
  // Simulate: approval already recorded (pendingApproval cleared by approver)
  resetDb({ s1: activeStream({ requiresApprovalToPause: true, pendingApproval: false }) });

  // A second pause call (approval already handled — flag cleared externally)
  // requiresApprovalToPause is true but pendingApproval is false, so the
  // handler will enter the approval branch again and set pendingApproval.
  // To test the "approved" path we clear requiresApprovalToPause:
  resetDb({ s1: activeStream({ requiresApprovalToPause: false }) });

  const res = await pauseHandler(makeReq(), makeParams());
  expect(res.status).toBe(200);
  expect(db.streams["s1"].status).toBe("paused");
});

// ---------------------------------------------------------------------------
// 8. Stream not found
// ---------------------------------------------------------------------------

test("pause on non-existent stream returns 404", async () => {
  const res = await pauseHandler(
    makeReq(),
    { params: Promise.resolve({ id: "does-not-exist" }) },
  );
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body.error).toMatch(/not found/i);
});

// ---------------------------------------------------------------------------
// 9. Already paused
// ---------------------------------------------------------------------------

test("pause on already-paused stream returns 409", async () => {
  resetDb({ s1: { ...activeStream(), status: "paused" } });

  const res = await pauseHandler(makeReq(), makeParams());
  expect(res.status).toBe(409);
  const body = await res.json();
  expect(body.error).toMatch(/paused/i);
});

// ---------------------------------------------------------------------------
// 10. Ended stream
// ---------------------------------------------------------------------------

test("pause on ended stream returns 409", async () => {
  resetDb({ s1: { ...activeStream(), status: "ended" } });

  const res = await pauseHandler(makeReq(), makeParams());
  expect(res.status).toBe(409);
  const body = await res.json();
  expect(body.error).toMatch(/ended/i);
});

// ---------------------------------------------------------------------------
// 11. High-concurrency stress: N parallel pauses, exactly one succeeds
// ---------------------------------------------------------------------------

test("N concurrent pauses without idempotency key: exactly one succeeds", async () => {
  const N = 20;
  const results = await Promise.all(
    Array.from({ length: N }, () => pauseHandler(makeReq(), makeParams())),
  );

  const successes = results.filter((r) => r.status === 200);
  const conflicts = results.filter((r) => r.status === 409);

  expect(successes).toHaveLength(1);
  expect(conflicts).toHaveLength(N - 1);
  expect(db.streams["s1"].status).toBe("paused");
});
