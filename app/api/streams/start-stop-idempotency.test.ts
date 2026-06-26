/** @jest-environment node */
import { POST as startPOST } from "./[id]/start/route";
import { POST as stopPOST } from "./[id]/stop/route";
import { db, resetDb } from "@/app/lib/db";
import { auditLogStore, resetAuditLogStore } from "@/app/lib/audit-log";
import { resetRateLimitStore } from "@/app/lib/rate-limit-store";

type RouteContext = { params: Promise<{ id: string }> };
function ctx(id: string): RouteContext { return { params: Promise.resolve({ id }) }; }

function startReq(streamId: string, idempotencyKey?: string): Request {
  return new Request(`http://localhost/api/streams/${streamId}/start`, {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
  });
}

function stopReq(streamId: string, idempotencyKey?: string, extra: Record<string, string> = {}): Request {
  const headers: Record<string, string> = { ...extra };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return new Request(`http://localhost/api/streams/${streamId}/stop`, { method: "POST", headers });
}

beforeEach(() => { resetDb(); resetRateLimitStore(); resetAuditLogStore(); });

describe("POST /api/streams/[id]/start � idempotency", () => {
  const STREAM = "stream-kemi";

  it("no key: returns 200 and sets stream to active", async () => {
    const res = await startPOST(startReq(STREAM), ctx(STREAM));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("active");
    expect(db.streams.get(STREAM)?.status).toBe("active");
  });

  it("with key: returns 200 on first call", async () => {
    const res = await startPOST(startReq(STREAM, "start-key-1"), ctx(STREAM));
    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe("active");
  });

  it("replayed key returns cached response without re-transitioning", async () => {
    const key = "start-replay-key";
    const first = await startPOST(startReq(STREAM, key), ctx(STREAM));
    const firstBody = await first.json();

    const stream = db.streams.get(STREAM)!;
    db.streams.set(STREAM, { ...stream, updatedAt: "REVERTED" });

    const second = await startPOST(startReq(STREAM, key), ctx(STREAM));
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(firstBody);
    expect(db.streams.get(STREAM)?.updatedAt).toBe("REVERTED");
  });

  it("token not stored on 404", async () => {
    const key = "start-missing-key";
    const res = await startPOST(startReq("stream-missing", key), ctx("stream-missing"));
    expect(res.status).toBe(404);
    expect(db.idempotency.has(`streams.start.stream-missing:${key}`)).toBe(false);
  });

  it("parallel same-key: all 200, stream transitions exactly once", async () => {
    const key = "start-parallel-same";
    const results = await Promise.all(
      Array.from({ length: 10 }).map(() => startPOST(startReq(STREAM, key), ctx(STREAM)))
    );
    expect(results.every(r => r.status === 200)).toBe(true);
    const bodies = await Promise.all(results.map(r => r.json()));
    expect(new Set(bodies.map(b => b.data.updatedAt)).size).toBe(1);
    expect(db.streams.get(STREAM)?.status).toBe("active");
  });

  it("returns 404 for unknown stream", async () => {
    const res = await startPOST(startReq("no-such-stream"), ctx("no-such-stream"));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("STREAM_NOT_FOUND");
  });
});

describe("POST /api/streams/[id]/stop � idempotency", () => {
  const STREAM = "stream-ada";

  it("no key: returns 200 and sets stream to ended", async () => {
    const res = await stopPOST(stopReq(STREAM), ctx(STREAM));
    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe("ended");
  });

  it("with key: returns 200 on first call", async () => {
    const res = await stopPOST(stopReq(STREAM, "stop-key-1"), ctx(STREAM));
    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe("ended");
  });

  it("returns 409 stopping an already-ended stream", async () => {
    await stopPOST(stopReq(STREAM), ctx(STREAM));
    const res = await stopPOST(stopReq(STREAM), ctx(STREAM));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("INVALID_STREAM_STATE");
  });

  it("replayed key returns cached response without re-transitioning", async () => {
    const key = "stop-replay-key";
    const first = await stopPOST(stopReq(STREAM, key), ctx(STREAM));
    const firstBody = await first.json();

    const stream = db.streams.get(STREAM)!;
    db.streams.set(STREAM, { ...stream, updatedAt: "REVERTED" });

    const second = await stopPOST(stopReq(STREAM, key), ctx(STREAM));
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(firstBody);
    expect(db.streams.get(STREAM)?.updatedAt).toBe("REVERTED");
  });

  it("replayed key does NOT emit a second audit event", async () => {
    const key = "stop-audit-replay";
    for (let i = 0; i < 3; i++) {
      await stopPOST(stopReq(STREAM, key), ctx(STREAM));
    }
    const entries = auditLogStore.list({ targetId: STREAM }).filter(e => e.action === "stream.stop.override");
    expect(entries).toHaveLength(1);
  });

  it("token not stored on 404", async () => {
    const key = "stop-missing-key";
    const res = await stopPOST(stopReq("stream-missing", key), ctx("stream-missing"));
    expect(res.status).toBe(404);
    expect(db.idempotency.has(`streams.stop.stream-missing:${key}`)).toBe(false);
  });

  it("token not stored on wrong state (409)", async () => {
    const key = "stop-bad-state-key";
    const res = await stopPOST(stopReq("stream-yusuf", key), ctx("stream-yusuf"));
    expect(res.status).toBe(409);
    expect(db.idempotency.has(`streams.stop.stream-yusuf:${key}`)).toBe(false);
  });

  it("parallel same-key: all 200, exactly one audit event", async () => {
    const key = "stop-parallel-same";
    const results = await Promise.all(
      Array.from({ length: 10 }).map(() => stopPOST(stopReq(STREAM, key), ctx(STREAM)))
    );
    expect(results.every(r => r.status === 200)).toBe(true);
    const bodies = await Promise.all(results.map(r => r.json()));
    expect(new Set(bodies.map(b => b.data.updatedAt)).size).toBe(1);
    const entries = auditLogStore.list({ targetId: STREAM }).filter(e => e.action === "stream.stop.override");
    expect(entries).toHaveLength(1);
    expect(db.streams.get(STREAM)?.status).toBe("ended");
  });

  it("parallel different-keys: exactly 1 success, 9 conflicts", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }).map((_, i) =>
        stopPOST(stopReq(STREAM, `parallel-stop-key-${i}`), ctx(STREAM))
      )
    );
    expect(results.filter(r => r.status === 200)).toHaveLength(1);
    expect(results.filter(r => r.status === 409)).toHaveLength(9);
    const entries = auditLogStore.list({ targetId: STREAM }).filter(e => e.action === "stream.stop.override");
    expect(entries).toHaveLength(1);
  });

  it("parallel no-key: exactly 1 success", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }).map(() => stopPOST(stopReq(STREAM), ctx(STREAM)))
    );
    expect(results.filter(r => r.status === 200)).toHaveLength(1);
    expect(db.streams.get(STREAM)?.status).toBe("ended");
  });

  it("returns 404 for unknown stream", async () => {
    const res = await stopPOST(stopReq("no-such-stream"), ctx("no-such-stream"));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("STREAM_NOT_FOUND");
  });
});

describe("Token scoping", () => {
  it("same key on start and stop uses different cache slots", async () => {
    const STREAM = "stream-kemi";
    const KEY = "shared-key";
    await startPOST(startReq(STREAM, KEY), ctx(STREAM));
    await stopPOST(stopReq(STREAM, KEY), ctx(STREAM));
    const startEntry = db.idempotency.get(`streams.start.${STREAM}:${KEY}`) as any;
    const stopEntry  = db.idempotency.get(`streams.stop.${STREAM}:${KEY}`) as any;
    expect(startEntry.body.data.status).toBe("active");
    expect(stopEntry.body.data.status).toBe("ended");
  });

  it("same key on different streams uses different cache slots", async () => {
    const KEY = "cross-stream-key";
    await startPOST(startReq("stream-kemi", KEY), ctx("stream-kemi"));
    await stopPOST(stopReq("stream-ada", KEY), ctx("stream-ada"));
    expect(db.idempotency.has(`streams.start.stream-kemi:${KEY}`)).toBe(true);
    expect(db.idempotency.has(`streams.stop.stream-ada:${KEY}`)).toBe(true);
  });
});
