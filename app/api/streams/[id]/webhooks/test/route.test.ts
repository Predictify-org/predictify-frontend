/**
 * @jest-environment node
 *
 * Focused tests for POST /api/streams/:id/webhooks/test
 *
 * Covers:
 *   - Happy path: 202 with synthetic event payload
 *   - Default event type when body is omitted
 *   - Custom event_type from request body
 *   - 404 for unknown stream
 *   - 400 for invalid event_type
 *   - 400 for malformed JSON body
 *   - Response shape: required fields present
 */

import { POST } from "./route";
import { db, resetDb } from "@/app/lib/db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Ctx = { params: Promise<{ id: string }> };
function ctx(id: string): Ctx {
  return { params: Promise.resolve({ id }) };
}

function testReq(
  streamId: string,
  body?: Record<string, unknown>,
): Request {
  return new Request(`http://localhost/api/streams/${streamId}/webhooks/test`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Seed stream IDs from in-memory.ts
const ACTIVE_STREAM = "stream-ada"; // status: active

beforeEach(() => {
  resetDb();
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe("happy path", () => {
  it("returns 202 Accepted for an existing stream with no body", async () => {
    const res = await POST(testReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    expect(res.status).toBe(202);
  });

  it("defaults to event_type 'stream.test' when no body is provided", async () => {
    const res = await POST(testReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    const body = await res.json();
    expect(body.data.event_type).toBe("stream.test");
  });

  it("returns a synthetic payload with required fields", async () => {
    const res = await POST(testReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    const { data } = await res.json();

    expect(data).toHaveProperty("delivery_id");
    expect(data).toHaveProperty("stream_id", ACTIVE_STREAM);
    expect(data).toHaveProperty("event_type");
    expect(data).toHaveProperty("dispatched_at");
    expect(data).toHaveProperty("synthetic", true);
  });

  it("dispatched_at is a valid ISO-8601 UTC timestamp", async () => {
    const res = await POST(testReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    const { data } = await res.json();
    const parsed = new Date(data.dispatched_at as string);
    expect(isNaN(parsed.getTime())).toBe(false);
    expect(data.dispatched_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("accepts a valid custom event_type in the body", async () => {
    const res = await POST(
      testReq(ACTIVE_STREAM, { event_type: "stream.paused" }),
      ctx(ACTIVE_STREAM),
    );
    expect(res.status).toBe(202);
    const { data } = await res.json();
    expect(data.event_type).toBe("stream.paused");
  });

  it("each call generates a unique delivery_id", async () => {
    const res1 = await POST(testReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    const res2 = await POST(testReq(ACTIVE_STREAM), ctx(ACTIVE_STREAM));
    const id1 = (await res1.json()).data.delivery_id;
    const id2 = (await res2.json()).data.delivery_id;
    expect(id1).not.toBe(id2);
  });
});

// ─── 404 for unknown stream ───────────────────────────────────────────────────

describe("stream not found", () => {
  it("returns 404 STREAM_NOT_FOUND for an unknown stream id", async () => {
    const res = await POST(testReq("stream-does-not-exist"), ctx("stream-does-not-exist"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("STREAM_NOT_FOUND");
  });

  it("does not mutate any stream on 404", async () => {
    const before = db.streams.get(ACTIVE_STREAM);
    await POST(testReq("stream-ghost"), ctx("stream-ghost"));
    const after = db.streams.get(ACTIVE_STREAM);
    expect(after).toEqual(before);
  });
});

// ─── Input validation ─────────────────────────────────────────────────────────

describe("input validation", () => {
  it("returns 400 BAD_REQUEST for an unknown event_type", async () => {
    const res = await POST(
      testReq(ACTIVE_STREAM, { event_type: "stream.explode" }),
      ctx(ACTIVE_STREAM),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.message).toContain("stream.explode");
  });

  it("returns 400 BAD_REQUEST when event_type is not a string", async () => {
    const res = await POST(
      testReq(ACTIVE_STREAM, { event_type: 42 }),
      ctx(ACTIVE_STREAM),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 BAD_REQUEST for malformed JSON body", async () => {
    const req = new Request(
      `http://localhost/api/streams/${ACTIVE_STREAM}/webhooks/test`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "content-length": "10" },
        body: "{ not json",
      },
    );
    const res = await POST(req, ctx(ACTIVE_STREAM));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
  });
});
