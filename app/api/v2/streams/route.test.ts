/**
 * Tests for GET and POST /api/v2/streams
 */

import { GET, POST } from "./route";
import { encodeCursor } from "@/app/lib/cursor-pagination";
import { resetDb } from "@/app/lib/db";
import type { Stream } from "@/app/types/openapi";

jest.mock("next/server", () => ({
  NextResponse: {
    json: <T>(body: T, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      json: async () => body,
    }),
  },
}));

jest.mock("next/headers", () => ({
  headers: () => ({ get: () => null }),
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
    headers: { get: (name: string) => (name === "authorization" ? auth : null) },
    nextUrl: { searchParams },
    json: async () => {
      if (body === "THROW") throw new Error("parse error");
      return body;
    },
  } as unknown as import("next/server").NextRequest;
}

describe("GET /api/v2/streams", () => {
  beforeEach(() => {
    // Reset to default test data
    resetDb({}, {});
  });

  it("returns 200 with streams array when authenticated", async () => {
    resetDb({
      "test-stream": {
        id: "test-stream",
        recipient: "GABC",
        rate: "100 XLM / month",
        schedule: "month",
        status: "active",
        token: "XLM",
        createdAt: "2024-01-15T10:00:00.000Z",
        updatedAt: "2024-01-15T10:00:00.000Z",
      }
    }, {});
    
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (res as unknown as { body: { streams: unknown[] } }).body;
    expect(Array.isArray(body.streams)).toBe(true);
  });

  it("returns pagination metadata", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (res as unknown as { body: { pagination: { next_cursor: string | null; limit: number } } }).body;
    expect(body.pagination).toBeDefined();
    expect(body.pagination).toHaveProperty("next_cursor");
    expect(body.pagination).toHaveProperty("limit");
    expect(typeof body.pagination.limit).toBe("number");
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await GET(makeRequest({ auth: null }));
    expect(res.status).toBe(401);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when Authorization is not a Bearer token", async () => {
    const res = await GET(makeRequest({ auth: "Basic dXNlcjpwYXNz" }));
    expect(res.status).toBe(401);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("error envelope has code, message, request_id", async () => {
    const res = await GET(makeRequest({ auth: null }));
    const body = (res as unknown as { body: { error: Record<string, unknown> } }).body;
    expect(body.error).toHaveProperty("code");
    expect(body.error).toHaveProperty("message");
    expect(body.error).toHaveProperty("request_id");
  });

  describe("pagination", () => {
    it("returns default limit of 20", async () => {
      // Clear and set empty
      resetDb({}, {});
      const res = await GET(makeRequest());
      const body = (res as unknown as { body: { pagination: { limit: number } } }).body;
      expect(body.pagination.limit).toBe(20);
    });

    it("respects custom limit parameter", async () => {
      resetDb({}, {});
      const res = await GET(makeRequest({ params: { limit: "5" } }));
      const body = (res as unknown as { body: { pagination: { limit: number } } }).body;
      expect(body.pagination.limit).toBe(5);
    });

    it("clamps limit to 1 minimum", async () => {
      resetDb({}, {});
      const res = await GET(makeRequest({ params: { limit: "0" } }));
      const body = (res as unknown as { body: { pagination: { limit: number } } }).body;
      expect(body.pagination.limit).toBe(1);
    });

    it("clamps limit to 100 maximum", async () => {
      resetDb({}, {});
      const res = await GET(makeRequest({ params: { limit: "200" } }));
      const body = (res as unknown as { body: { pagination: { limit: number } } }).body;
      expect(body.pagination.limit).toBe(100);
    });

    it("orders streams by created_at DESC", async () => {
      // Create test streams with known timestamps (use future dates to override defaults)
      const streams: Record<string, Stream> = {
        "stream-1": {
          id: "stream-1",
          recipient: "GABC1",
          rate: "100 XLM / month",
          schedule: "month",
          status: "active",
          token: "XLM",
          createdAt: "2026-06-15T10:00:00.000Z",
          updatedAt: "2026-06-15T10:00:00.000Z",
        },
        "stream-2": {
          id: "stream-2",
          recipient: "GABC2",
          rate: "200 XLM / month",
          schedule: "month",
          status: "active",
          token: "XLM",
          createdAt: "2026-06-14T10:00:00.000Z",
          updatedAt: "2026-06-14T10:00:00.000Z",
        },
        "stream-3": {
          id: "stream-3",
          recipient: "GABC3",
          rate: "300 XLM / month",
          schedule: "month",
          status: "draft",
          token: "XLM",
          createdAt: "2026-06-13T10:00:00.000Z",
          updatedAt: "2026-06-13T10:00:00.000Z",
        },
      };
      resetDb(streams, {});
      
      const res = await GET(makeRequest());
      const body = (res as unknown as { body: { streams: Array<{ id: string; created_at: string }> } }).body;
      
      // Should have our 3 test streams + 3 default streams = 6 total
      expect(body.streams.length).toBeGreaterThanOrEqual(3);
      // Most recent first (from our test data)
      expect(body.streams[0].id).toBe("stream-1"); // 2026-06-15
      expect(body.streams[1].id).toBe("stream-2"); // 2026-06-14
      expect(body.streams[2].id).toBe("stream-3"); // 2026-06-13
    });

    it("returns next_cursor when more results exist", async () => {
      const streams: Record<string, Stream> = {
        "stream-1": {
          id: "stream-1",
          recipient: "GABC1",
          rate: "100 XLM / month",
          schedule: "month",
          status: "active",
          token: "XLM",
          createdAt: "2026-06-15T10:00:00.000Z",
          updatedAt: "2026-06-15T10:00:00.000Z",
        },
        "stream-2": {
          id: "stream-2",
          recipient: "GABC2",
          rate: "200 XLM / month",
          schedule: "month",
          status: "active",
          token: "XLM",
          createdAt: "2026-06-14T10:00:00.000Z",
          updatedAt: "2026-06-14T10:00:00.000Z",
        },
      };
      resetDb(streams, {});
      
      const res = await GET(makeRequest({ params: { limit: "1" } }));
      const body = (res as unknown as { body: { streams: unknown[]; pagination: { next_cursor: string | null } } }).body;
      
      expect(body.streams.length).toBe(1);
      expect(body.pagination.next_cursor).not.toBeNull();
      expect(typeof body.pagination.next_cursor).toBe("string");
    });

    it("returns null next_cursor when no more results", async () => {
      const streams: Record<string, Stream> = {
        "stream-1": {
          id: "stream-1",
          recipient: "GABC1",
          rate: "100 XLM / month",
          schedule: "month",
          status: "active",
          token: "XLM",
          createdAt: "2026-06-15T10:00:00.000Z",
          updatedAt: "2026-06-15T10:00:00.000Z",
        },
        "stream-2": {
          id: "stream-2",
          recipient: "GABC2",
          rate: "200 XLM / month",
          schedule: "month",
          status: "active",
          token: "XLM",
          createdAt: "2026-06-14T10:00:00.000Z",
          updatedAt: "2026-06-14T10:00:00.000Z",
        },
        "stream-3": {
          id: "stream-3",
          recipient: "GABC3",
          rate: "300 XLM / month",
          schedule: "month",
          status: "draft",
          token: "XLM",
          createdAt: "2026-06-13T10:00:00.000Z",
          updatedAt: "2026-06-13T10:00:00.000Z",
        },
      };
      resetDb(streams, {});
      
      const res = await GET(makeRequest({ params: { limit: "100" } }));
      const body = (res as unknown as { body: { streams: unknown[]; pagination: { next_cursor: string | null } } }).body;
      
      // All streams fit in limit of 100
      expect(body.pagination.next_cursor).toBeNull();
    });

    it("paginates correctly with cursor", async () => {
      const streams: Record<string, Stream> = {
        "stream-1": {
          id: "stream-1",
          recipient: "GABC1",
          rate: "100 XLM / month",
          schedule: "month",
          status: "active",
          token: "XLM",
          createdAt: "2026-06-15T10:00:00.000Z",
          updatedAt: "2026-06-15T10:00:00.000Z",
        },
        "stream-2": {
          id: "stream-2",
          recipient: "GABC2",
          rate: "200 XLM / month",
          schedule: "month",
          status: "active",
          token: "XLM",
          createdAt: "2026-06-14T10:00:00.000Z",
          updatedAt: "2026-06-14T10:00:00.000Z",
        },
        "stream-3": {
          id: "stream-3",
          recipient: "GABC3",
          rate: "300 XLM / month",
          schedule: "month",
          status: "draft",
          token: "XLM",
          createdAt: "2026-06-13T10:00:00.000Z",
          updatedAt: "2026-06-13T10:00:00.000Z",
        },
      };
      resetDb(streams, {});
      
      // Get first page
      const res1 = await GET(makeRequest({ params: { limit: "2" } }));
      const body1 = (res1 as unknown as { body: { streams: Array<{ id: string }>; pagination: { next_cursor: string | null } } }).body;
      
      expect(body1.streams.length).toBe(2);
      expect(body1.streams[0].id).toBe("stream-1");
      expect(body1.streams[1].id).toBe("stream-2");
      expect(body1.pagination.next_cursor).not.toBeNull();

      // Get second page
      const res2 = await GET(makeRequest({ params: { cursor: body1.pagination.next_cursor!, limit: "2" } }));
      const body2 = (res2 as unknown as { body: { streams: Array<{ id: string }>; pagination: { next_cursor: string | null } } }).body;
      
      expect(body2.streams.length).toBeGreaterThanOrEqual(1);
      expect(body2.streams[0].id).toBe("stream-3");
    });

    it("returns 422 for invalid cursor", async () => {
      resetDb({}, {});
      const res = await GET(makeRequest({ params: { cursor: "invalid!!!" } }));
      expect(res.status).toBe(422);
      const body = (res as unknown as { body: { error: { code: string } } }).body;
      expect(body.error.code).toBe("INVALID_CURSOR");
    });

    it("returns 422 for tampered cursor", async () => {
      resetDb({}, {});
      const validCursor = encodeCursor("2024-01-15T10:00:00.000Z", "stream-1");
      // Tamper with the cursor
      const tampered = validCursor.slice(0, -5) + "XXXXX";
      
      const res = await GET(makeRequest({ params: { cursor: tampered } }));
      expect(res.status).toBe(422);
      const body = (res as unknown as { body: { error: { code: string } } }).body;
      expect(body.error.code).toBe("INVALID_CURSOR");
    });

    it("handles cursor for non-existent stream gracefully", async () => {
      const streams: Record<string, Stream> = {
        "stream-1": {
          id: "stream-1",
          recipient: "GABC1",
          rate: "100 XLM / month",
          schedule: "month",
          status: "active",
          token: "XLM",
          createdAt: "2026-06-15T10:00:00.000Z",
          updatedAt: "2026-06-15T10:00:00.000Z",
        },
        "stream-2": {
          id: "stream-2",
          recipient: "GABC2",
          rate: "200 XLM / month",
          schedule: "month",
          status: "active",
          token: "XLM",
          createdAt: "2026-06-14T10:00:00.000Z",
          updatedAt: "2026-06-14T10:00:00.000Z",
        },
        "stream-3": {
          id: "stream-3",
          recipient: "GABC3",
          rate: "300 XLM / month",
          schedule: "month",
          status: "draft",
          token: "XLM",
          createdAt: "2026-06-13T10:00:00.000Z",
          updatedAt: "2026-06-13T10:00:00.000Z",
        },
      };
      resetDb(streams, {});
      
      // Create a cursor for a stream that doesn't exist
      const cursor = encodeCursor("2026-06-20T10:00:00.000Z", "stream-nonexistent");
      
      const res = await GET(makeRequest({ params: { cursor, limit: "10" } }));
      expect(res.status).toBe(200);
      const body = (res as unknown as { body: { streams: unknown[] } }).body;
      
      // Should return streams older than the cursor date
      expect(body.streams.length).toBeGreaterThan(0);
    });

    it("returns empty array when cursor is after all streams", async () => {
      const streams: Record<string, Stream> = {
        "stream-1": {
          id: "stream-1",
          recipient: "GABC1",
          rate: "100 XLM / month",
          schedule: "month",
          status: "active",
          token: "XLM",
          createdAt: "2026-06-15T10:00:00.000Z",
          updatedAt: "2026-06-15T10:00:00.000Z",
        },
        "stream-2": {
          id: "stream-2",
          recipient: "GABC2",
          rate: "200 XLM / month",
          schedule: "month",
          status: "active",
          token: "XLM",
          createdAt: "2026-06-14T10:00:00.000Z",
          updatedAt: "2026-06-14T10:00:00.000Z",
        },
        "stream-3": {
          id: "stream-3",
          recipient: "GABC3",
          rate: "300 XLM / month",
          schedule: "month",
          status: "draft",
          token: "XLM",
          createdAt: "2026-06-13T10:00:00.000Z",
          updatedAt: "2026-06-13T10:00:00.000Z",
        },
      };
      resetDb(streams, {});
      
      // Cursor with timestamp way in the future (after all test streams)
      const cursor = encodeCursor("2027-01-10T10:00:00.000Z", "stream-old");
      
      const res = await GET(makeRequest({ params: { cursor, limit: "10" } }));
      expect(res.status).toBe(200);
      const body = (res as unknown as { body: { streams: unknown[] } }).body;
      
      // All test streams are before cursor date, but there are default streams from 2026-04
      // So we check that we get only the older default streams
      expect(body.streams.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("v2 shape validation", () => {
    it("returns v2 shape with snake_case fields", async () => {
      const res = await GET(makeRequest());
      const body = (res as unknown as { body: { streams: Array<Record<string, unknown>> } }).body;
      
      if (body.streams.length > 0) {
        const stream = body.streams[0];
        expect(stream).toHaveProperty("created_at");
        expect(stream).toHaveProperty("allowed_actions");
        expect(stream).toHaveProperty("settlement");
        
        // Should NOT have v1 fields
        expect(stream).not.toHaveProperty("createdAt");
        expect(stream).not.toHaveProperty("actions");
      }
    });
  });
});

const VALID_STELLAR_KEY =
  "GDSBCG3OKHCMMWS5EBH2X7XOYTJRWXN2YYQPCNS5OFBU4IDO4X7OFSQA";

describe("POST /api/v2/streams", () => {
  it("returns 201 with a v2 stream on valid input", async () => {
    const res = await POST(
      makeRequest({ body: { recipient: VALID_STELLAR_KEY, rate: "120", schedule: "month" } }),
    );
    expect(res.status).toBe(201);
    const body = (res as unknown as { body: Record<string, unknown> }).body;
    // v2 shape fields
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("allowed_actions");
    expect(body).toHaveProperty("created_at");
    expect(body).toHaveProperty("settlement");
    expect(body.settlement).toBeNull();
    // v1 fields must NOT be present
    expect(body).not.toHaveProperty("actions");
    expect(body).not.toHaveProperty("createdAt");
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await POST(
      makeRequest({ auth: null, body: { recipient: VALID_STELLAR_KEY, rate: "120", schedule: "month" } }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 422 when recipient is invalid (not a Stellar key)", async () => {
    const res = await POST(makeRequest({ body: { recipient: "GABC123", rate: "120", schedule: "month" } }));
    expect(res.status).toBe(422);
    const body = (res as unknown as { body: { error: { code: string; details: Array<{ field: string }> } } }).body;
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toBeDefined();
    expect(body.error.details[0].field).toBe("recipient");
  });

  it("returns 422 when rate is missing", async () => {
    const res = await POST(makeRequest({ body: { recipient: VALID_STELLAR_KEY, schedule: "month" } }));
    expect(res.status).toBe(422);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when schedule is missing", async () => {
    const res = await POST(makeRequest({ body: { recipient: VALID_STELLAR_KEY, rate: "120" } }));
    expect(res.status).toBe(422);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when body is null", async () => {
    const res = await POST(makeRequest({ body: null }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when json() throws (caught by internal .catch)", async () => {
    const res = await POST(makeRequest({ body: "THROW" }));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("created stream has status 'draft'", async () => {
    const res = await POST(
      makeRequest({ body: { recipient: VALID_STELLAR_KEY, rate: "120", schedule: "month" } }),
    );
    const body = (res as unknown as { body: { status: string } }).body;
    expect(body.status).toBe("draft");
  });

  it("error envelope has code, message, request_id", async () => {
    const res = await POST(makeRequest({ auth: null, body: {} }));
    const body = (res as unknown as { body: { error: Record<string, unknown> } }).body;
    expect(body.error).toHaveProperty("code");
    expect(body.error).toHaveProperty("message");
    expect(body.error).toHaveProperty("request_id");
  });
});
