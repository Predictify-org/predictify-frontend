/**
 * Tests for POST /api/v2/streams/batch
 */

import { POST } from "./route";
import { getStore, resetDb } from "@/app/lib/db";

jest.mock("next/server", () => ({
  NextResponse: {
    json: <T>(body: T, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
      body,
      json: async () => body,
    }),
  },
}));

jest.mock("next/headers", () => ({
  headers: () => ({ get: (name: string) => (name === "x-request-id" ? "test-req-id" : null) }),
}));

function makeRequest(
  opts: {
    auth?: string | null;
    body?: unknown;
    params?: Record<string, string>;
  } = {},
) {
  const { auth = "Bearer tok_test", body, params = {} } = opts;
  const searchParams = new URLSearchParams(params);
  return {
    headers: { get: (name: string) => (name === "authorization" ? auth : name === "x-request-id" ? "test-req-id" : null) },
    nextUrl: { searchParams },
    json: async () => {
      if (body === "THROW") throw new Error("parse error");
      return body;
    },
  } as unknown as import("next/server").NextRequest;
}

describe("POST /api/v2/streams/batch", () => {
  beforeEach(() => {
    resetDb({
      "stream-1": {
        id: "stream-1",
        recipient: "GABC...",
        rate: "100",
        schedule: "month",
        status: "draft",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        token: "XLM",
      },
      "stream-2": {
        id: "stream-2",
        recipient: "GDEF...",
        rate: "50",
        schedule: "week",
        status: "active",
        createdAt: "2026-01-02T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
        token: "XLM",
      },
    });
  });

  afterEach(() => {
    resetDb();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await POST(
      makeRequest({ auth: null, body: { updates: [] } })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is not JSON", async () => {
    const res = await POST(makeRequest({ body: "THROW" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is missing 'updates' array", async () => {
    const res = await POST(makeRequest({ body: { somethingElse: [] } }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when updates exceeds 100 items", async () => {
    const updates = Array.from({ length: 101 }, (_, i) => ({
      id: `stream-${i}`,
      data: { status: "active" },
    }));
    const res = await POST(makeRequest({ body: { updates } }));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { message: string } } }).body;
    expect(body.error.message).toMatch(/Batch limit exceeded/);
  });

  it("returns 200 and empty array for empty updates", async () => {
    const res = await POST(makeRequest({ body: { updates: [] } }));
    expect(res.status).toBe(200);
    const body = (res as unknown as { body: { streams: unknown[] } }).body;
    expect(body.streams).toEqual([]);
  });

  it("returns 400 when an update item is missing 'id'", async () => {
    const res = await POST(makeRequest({ body: { updates: [{ data: { status: "active" } }] } }));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { message: string } } }).body;
    expect(body.error.message).toMatch(/Missing 'id'/);
  });

  it("returns 400 when an update item is missing 'data'", async () => {
    const res = await POST(makeRequest({ body: { updates: [{ id: "stream-1" }] } }));
    expect(res.status).toBe(400);
  });

  it("returns 422 with per-item errors and performs NO updates when validation fails", async () => {
    const res = await POST(makeRequest({
      body: {
        updates: [
          { id: "stream-1", data: { status: "paused" } },
          { id: "nonexistent-stream", data: { status: "ended" } }
        ]
      }
    }));
    
    expect(res.status).toBe(422);
    const body = (res as unknown as { body: { error: { code: string; details: any[] } } }).body;
    
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toHaveLength(1);
    expect(body.error.details[0].id).toBe("nonexistent-stream");
    expect(body.error.details[0].code).toBe("STREAM_NOT_FOUND");

    // Ensure all-or-nothing semantics: "stream-1" should NOT be updated
    const { streamRepository } = getStore();
    const stream1 = streamRepository.streams.get("stream-1");
    expect(stream1?.status).toBe("draft"); // Remains unchanged
  });

  it("returns 200 and updates all streams when validation passes", async () => {
    const res = await POST(makeRequest({
      body: {
        updates: [
          { id: "stream-1", data: { status: "paused" } },
          { id: "stream-2", data: { status: "ended" } }
        ]
      }
    }));

    expect(res.status).toBe(200);
    const body = (res as unknown as { body: { streams: Array<{ id: string; status: string; updated_at: string }> } }).body;
    
    expect(body.streams).toHaveLength(2);
    
    // Check v2 serialization shape
    const s1 = body.streams.find(s => s.id === "stream-1")!;
    expect(s1.status).toBe("paused");
    
    const s2 = body.streams.find(s => s.id === "stream-2")!;
    expect(s2.status).toBe("ended");

    // Verify store state
    const { streamRepository } = getStore();
    expect(streamRepository.streams.get("stream-1")?.status).toBe("paused");
    expect(streamRepository.streams.get("stream-2")?.status).toBe("ended");
  });
});
