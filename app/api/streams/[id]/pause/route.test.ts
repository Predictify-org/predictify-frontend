/**
 * @jest-environment node
 *
 * Focused tests for POST /api/streams/:id/pause
 *
 * Covers:
 *   - pausedAt field: set on pause, cleared on resume, absent before pause
 *   - State guard: only active streams can be paused
 *   - Idempotency: replays return cached response; token scoping
 *   - RBAC: org-owned streams enforce role checks
 *   - Audit: exactly one audit event per pause (not on replay)
 *   - Response shape: all expected fields present
 *   - 404 for unknown streams
 */

import { POST as pausePOST } from "./route";
import { POST as startPOST } from "@/app/api/streams/[id]/start/route";
import { db, resetDb } from "@/app/lib/db";
import { auditLogStore, resetAuditLogStore } from "@/app/lib/audit-log";
import { resetRateLimitStore } from "@/app/lib/rate-limit-store";
import { _resetOrgDbForTesting } from "@/app/lib/org-db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Ctx = { params: Promise<{ id: string }> };
function ctx(id: string): Ctx {
  return { params: Promise.resolve({ id }) };
}

function pauseReq(
  streamId: string,
  opts: { idempotencyKey?: string; actor?: string } = {},
): Request {
  const headers: Record<string, string> = {};
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  if (opts.actor) headers["Actor-Wallet-Address"] = opts.actor;
  return new Request(`http://localhost/api/streams/${streamId}/pause`, {
    method: "POST",
    headers,
  });
}

function startReq(streamId: string, opts: { idempotencyKey?: string } = {}): Request {
  const headers: Record<string, string> = {};
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  return new Request(`http://localhost/api/streams/${streamId}/start`, {
    method: "POST",
    headers,
  });
}

// Seed stream IDs from in-memory.ts
const ACTIVE_STREAM = "stream-ada";    // status: active
const DRAFT_STREAM  = "stream-kemi";   // status: draft
const ENDED_STREAM  = "stream-yusuf";  // status: ended

// Org-acme RBAC fixtures (from org-db.ts seed)
const OWNER_ADDR   = "GOWNER7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW";
const PAUSER_ADDR  = "GPAUSER75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7G";
const SETTLER_ADDR = "GSETTLER5IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GS";
const VIEWER_ADDR  = "GVIEWER75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GS";
const STRANGER     = "GSTRANGER0000000000000000000000000000000000000000000";

beforeEach(() => {
  resetDb();
  resetAuditLogStore();
  resetRateLimitStore();
  _resetOrgDbForTesting();
});

// ─── pausedAt field ───────────────────────────────────────────────────────────

describe("pausedAt field", () => {
  it("is set on the stream record after a successful pause", async () => {
    const before = db.streams.get(ACTIVE_STREAM);
    expect(before?.pausedAt).toBeUndefined();

    const res = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    expect(res.status).toBe(200);

    const after = db.streams.get(ACTIVE_STREAM);
    expect(after?.pausedAt).toBeDefined();
    expect(typeof after?.pausedAt).toBe("string");
  });

  it("pausedAt is an ISO-8601 UTC string", async () => {
    const res = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    const body = await res.json();
    const ts = body.data.pausedAt as string;

    expect(ts).toBeDefined();
    // Must parse as a valid date
    const parsed = new Date(ts);
    expect(isNaN(parsed.getTime())).toBe(false);
    // Must be in ISO-8601 UTC format (ends with Z)
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("pausedAt is present in the JSON response body", async () => {
    const res = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty("pausedAt");
    expect(body.data.pausedAt).toBeTruthy();
  });

  it("pausedAt matches updatedAt (both set in the same operation)", async () => {
    const res = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    const body = await res.json();
    expect(body.data.pausedAt).toBe(body.data.updatedAt);
  });

  it("pausedAt is cleared (undefined) when stream is subsequently resumed", async () => {
    // Pause first
    await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    expect(db.streams.get(ACTIVE_STREAM)?.pausedAt).toBeDefined();

    // Resume
    const resumeRes = await startPOST(startReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    expect(resumeRes.status).toBe(200);
    const resumeBody = await resumeRes.json();

    // pausedAt must be absent from the response and the store
    expect(resumeBody.data.pausedAt).toBeUndefined();
    expect(db.streams.get(ACTIVE_STREAM)?.pausedAt).toBeUndefined();
  });

  it("pausedAt survives a round-trip through idempotency cache unchanged", async () => {
    const key = "idem-pausedAt-rt";
    const first = await pausePOST(pauseReq(ACTIVE_STREAM, { idempotencyKey: key }), ctx(ACTIVE_STREAM));
    const firstBody = await first.json();
    const originalPausedAt = firstBody.data.pausedAt;

    // Force the store to a later timestamp to confirm replay returns cached value
    const stream = db.streams.get(ACTIVE_STREAM)!;
    db.streams.set(ACTIVE_STREAM, { ...stream, updatedAt: "MUTATED", pausedAt: "MUTATED" });

    const replay = await pausePOST(pauseReq(ACTIVE_STREAM, { idempotencyKey: key }), ctx(ACTIVE_STREAM));
    const replayBody = await replay.json();

    expect(replayBody.data.pausedAt).toBe(originalPausedAt);
  });

  it("pause → resume → pause again records a fresh pausedAt each time", async () => {
    // First pause
    const res1 = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    const pausedAt1 = (await res1.json()).data.pausedAt as string;
    expect(pausedAt1).toBeDefined();

    // Resume
    await startPOST(startReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    expect(db.streams.get(ACTIVE_STREAM)?.pausedAt).toBeUndefined();

    // Second pause — advance time slightly so timestamps are distinguishable
    await new Promise<void>((r) => setTimeout(r, 5));
    const res2 = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    const pausedAt2 = (await res2.json()).data.pausedAt as string;
    expect(pausedAt2).toBeDefined();
    // Second pausedAt must be at or after the first
    expect(new Date(pausedAt2).getTime()).toBeGreaterThanOrEqual(new Date(pausedAt1).getTime());
  });
});

// ─── State guard ──────────────────────────────────────────────────────────────

describe("state guard", () => {
  it("returns 200 and pauses an active stream", async () => {
    const res = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("paused");
    expect(body.data.nextAction).toBe("stop");
  });

  it("returns 409 INVALID_STREAM_STATE when pausing a draft stream", async () => {
    const res = await pausePOST(pauseReq(DRAFT_STREAM), ctx(DRAFT_STREAM));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_STREAM_STATE");
    expect(body.error.message).toContain("draft");
    // pausedAt must NOT be set on a failed pause
    expect(db.streams.get(DRAFT_STREAM)?.pausedAt).toBeUndefined();
  });

  it("returns 409 INVALID_STREAM_STATE when pausing an ended stream", async () => {
    const res = await pausePOST(pauseReq(ENDED_STREAM), ctx(ENDED_STREAM));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("INVALID_STREAM_STATE");
    expect(db.streams.get(ENDED_STREAM)?.pausedAt).toBeUndefined();
  });

  it("returns 404 STREAM_NOT_FOUND for an unknown stream", async () => {
    const res = await pausePOST(pauseReq("stream-does-not-exist"), ctx("stream-does-not-exist"));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("STREAM_NOT_FOUND");
  });

  it("does not mutate the stream on a failed state transition", async () => {
    const before = structuredClone(db.streams.get(DRAFT_STREAM));
    await pausePOST(pauseReq(DRAFT_STREAM), ctx(DRAFT_STREAM));
    const after = db.streams.get(DRAFT_STREAM);
    expect(after).toEqual(before);
  });
});

// ─── Response shape ───────────────────────────────────────────────────────────

describe("response shape", () => {
  it("returns data with all required lifecycle fields", async () => {
    const res = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    const { data } = await res.json();

    expect(data).toHaveProperty("id", ACTIVE_STREAM);
    expect(data).toHaveProperty("status", "paused");
    expect(data).toHaveProperty("nextAction", "stop");
    expect(data).toHaveProperty("pausedAt");
    expect(data).toHaveProperty("updatedAt");
    expect(data).toHaveProperty("createdAt");
  });

  it("status in store matches status in response", async () => {
    const res = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    const { data } = await res.json();
    expect(db.streams.get(ACTIVE_STREAM)?.status).toBe(data.status);
  });

  it("pausedAt in store matches pausedAt in response", async () => {
    const res = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    const { data } = await res.json();
    expect(db.streams.get(ACTIVE_STREAM)?.pausedAt).toBe(data.pausedAt);
  });
});

// ─── Idempotency ──────────────────────────────────────────────────────────────

describe("idempotency", () => {
  it("replay with same key returns identical body without re-pausing", async () => {
    const key = "pause-idem-1";
    const first = await pausePOST(pauseReq(ACTIVE_STREAM, { idempotencyKey: key }), ctx(ACTIVE_STREAM));
    const firstBody = await first.json();

    // Mutate store to confirm replay reads cache, not live state
    const stream = db.streams.get(ACTIVE_STREAM)!;
    db.streams.set(ACTIVE_STREAM, { ...stream, updatedAt: "MODIFIED" });

    const replay = await pausePOST(pauseReq(ACTIVE_STREAM, { idempotencyKey: key }), ctx(ACTIVE_STREAM));
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual(firstBody);
  });

  it("concurrent requests with the same key all return 200 and the same body", async () => {
    const key = "pause-concurrent-idem";
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        pausePOST(pauseReq(ACTIVE_STREAM, { idempotencyKey: key }), ctx(ACTIVE_STREAM)),
      ),
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
    const bodies = await Promise.all(results.map((r) => r.json()));
    const pausedAts = new Set(bodies.map((b) => b.data.pausedAt));
    // All concurrent requests must return exactly the same pausedAt
    expect(pausedAts.size).toBe(1);
  });

  it("token not stored on 404", async () => {
    const key = "pause-missing-key";
    const res = await pausePOST(
      pauseReq("stream-nonexistent", { idempotencyKey: key }),
      ctx("stream-nonexistent"),
    );
    expect(res.status).toBe(404);
    expect(db.idempotency.has(`streams.pause.stream-nonexistent:${key}`)).toBe(false);
  });

  it("token not stored on wrong state (409)", async () => {
    const key = "pause-bad-state-key";
    const res = await pausePOST(pauseReq(DRAFT_STREAM, { idempotencyKey: key }), ctx(DRAFT_STREAM));
    expect(res.status).toBe(409);
    expect(db.idempotency.has(`streams.pause.${DRAFT_STREAM}:${key}`)).toBe(false);
  });

  it("idempotency token is scoped to the stream id", async () => {
    const key = "cross-stream-pause-key";
    // Pause stream-ada
    await pausePOST(pauseReq(ACTIVE_STREAM, { idempotencyKey: key }), ctx(ACTIVE_STREAM));
    // Pause stream-kemi with same key — should be a separate cache slot
    // (but stream-kemi is draft, so it errors, confirming scope isolation)
    const res = await pausePOST(pauseReq(DRAFT_STREAM, { idempotencyKey: key }), ctx(DRAFT_STREAM));
    expect(res.status).toBe(409); // wrong state, not a conflict
    expect((await res.json()).error.code).toBe("INVALID_STREAM_STATE");
  });

  it("no idempotency key: each call is independent", async () => {
    // First call: succeeds
    const first = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    expect(first.status).toBe(200);

    // Second call (no key, stream already paused): fails with state error
    const second = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    expect(second.status).toBe(409);
    expect((await second.json()).error.code).toBe("INVALID_STREAM_STATE");
  });
});

// ─── RBAC (org-owned stream) ──────────────────────────────────────────────────

describe("RBAC — org-owned stream (stream-ada → org-acme)", () => {
  it("owner with Actor-Wallet-Address header can pause", async () => {
    const res = await pausePOST(
      pauseReq(ACTIVE_STREAM, { actor: OWNER_ADDR }),
      ctx(ACTIVE_STREAM),
    );
    expect(res.status).toBe(200);
    expect(db.streams.get(ACTIVE_STREAM)?.pausedAt).toBeDefined();
  });

  it("pauser role can pause", async () => {
    const res = await pausePOST(
      pauseReq(ACTIVE_STREAM, { actor: PAUSER_ADDR }),
      ctx(ACTIVE_STREAM),
    );
    expect(res.status).toBe(200);
  });

  it("settler role cannot pause → 403 ROLE_INSUFFICIENT", async () => {
    const res = await pausePOST(
      pauseReq(ACTIVE_STREAM, { actor: SETTLER_ADDR }),
      ctx(ACTIVE_STREAM),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("ROLE_INSUFFICIENT");
    // pausedAt must NOT be set when RBAC denies the request
    expect(db.streams.get(ACTIVE_STREAM)?.pausedAt).toBeUndefined();
  });

  it("viewer role cannot pause → 403 ROLE_INSUFFICIENT", async () => {
    const res = await pausePOST(
      pauseReq(ACTIVE_STREAM, { actor: VIEWER_ADDR }),
      ctx(ACTIVE_STREAM),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("ROLE_INSUFFICIENT");
  });

  it("non-member actor → 403 NOT_ORG_MEMBER", async () => {
    const res = await pausePOST(
      pauseReq(ACTIVE_STREAM, { actor: STRANGER }),
      ctx(ACTIVE_STREAM),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("NOT_ORG_MEMBER");
  });

  it("no Actor-Wallet-Address header skips RBAC (individually-owned path)", async () => {
    // stream-ada is org-owned, but without the header the policy check is
    // skipped (opt-in pattern) — the stream still pauses.
    const res = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    expect(res.status).toBe(200);
  });
});

// ─── Audit log ────────────────────────────────────────────────────────────────

describe("audit log", () => {
  it("emits exactly one stream.pause audit event on success", async () => {
    await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    const entries = auditLogStore.list({ targetId: ACTIVE_STREAM });
    const pauseEntries = entries.filter((e) => e.action === "stream.pause");
    expect(pauseEntries).toHaveLength(1);
  });

  it("does not emit an audit event on replay (idempotency key reuse)", async () => {
    const key = "audit-replay-key";
    await pausePOST(pauseReq(ACTIVE_STREAM, { idempotencyKey: key }), ctx(ACTIVE_STREAM));
    await pausePOST(pauseReq(ACTIVE_STREAM, { idempotencyKey: key }), ctx(ACTIVE_STREAM));
    await pausePOST(pauseReq(ACTIVE_STREAM, { idempotencyKey: key }), ctx(ACTIVE_STREAM));

    const entries = auditLogStore.list({ targetId: ACTIVE_STREAM });
    const pauseEntries = entries.filter((e) => e.action === "stream.pause");
    // Only one audit event despite three calls
    expect(pauseEntries).toHaveLength(1);
  });

  it("does not emit an audit event on a failed state transition", async () => {
    await pausePOST(pauseReq(DRAFT_STREAM), ctx(DRAFT_STREAM));
    const entries = auditLogStore.list({ targetId: DRAFT_STREAM });
    const pauseEntries = entries.filter((e) => e.action === "stream.pause");
    expect(pauseEntries).toHaveLength(0);
  });
});

// ─── Integration: pause ↔ start round-trip ───────────────────────────────────

describe("integration: pause ↔ resume round-trip", () => {
  it("full round-trip: active → paused (pausedAt set) → active (pausedAt cleared)", async () => {
    // Verify initial state
    expect(db.streams.get(ACTIVE_STREAM)?.status).toBe("active");
    expect(db.streams.get(ACTIVE_STREAM)?.pausedAt).toBeUndefined();

    // Pause
    const pauseRes = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    expect(pauseRes.status).toBe(200);
    const pauseBody = await pauseRes.json();
    expect(pauseBody.data.status).toBe("paused");
    expect(pauseBody.data.pausedAt).toBeDefined();

    // Resume
    const resumeRes = await startPOST(startReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    expect(resumeRes.status).toBe(200);
    const resumeBody = await resumeRes.json();
    expect(resumeBody.data.status).toBe("active");
    expect(resumeBody.data.pausedAt).toBeUndefined();

    // Pause again — must work and produce a fresh pausedAt
    const repauseRes = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    expect(repauseRes.status).toBe(200);
    expect((await repauseRes.json()).data.pausedAt).toBeDefined();
  });

  it("paused stream cannot be paused again", async () => {
    await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    expect(db.streams.get(ACTIVE_STREAM)?.status).toBe("paused");

    const res = await pausePOST(pauseReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("INVALID_STREAM_STATE");
  });
});
