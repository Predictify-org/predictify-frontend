/**
 * Tests for GET /api/webhooks/deliveries
 */

import { GET } from "./route";

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

function makeRequest(params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams(params);
  return {
    nextUrl: { searchParams },
    headers: { get: () => null },
  } as unknown as import("next/server").NextRequest;
}

describe("GET /api/webhooks/deliveries", () => {
  it("returns 200 with deliveries array and default limit", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (res as unknown as { body: { deliveries: unknown[]; limit: number } }).body;
    expect(Array.isArray(body.deliveries)).toBe(true);
    expect(body.limit).toBe(20);
  });

  it("respects a valid limit param", async () => {
    const res = await GET(makeRequest({ limit: "50" }));
    expect(res.status).toBe(200);
    const body = (res as unknown as { body: { limit: number } }).body;
    expect(body.limit).toBe(50);
  });

  it("returns 400 for limit = 0", async () => {
    const res = await GET(makeRequest({ limit: "0" }));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 for limit > 100", async () => {
    const res = await GET(makeRequest({ limit: "101" }));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 for non-numeric limit", async () => {
    const res = await GET(makeRequest({ limit: "abc" }));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("passes cursor through in the response", async () => {
    const res = await GET(makeRequest({ cursor: "tok_xyz" }));
    expect(res.status).toBe(200);
    const body = (res as unknown as { body: { cursor: string } }).body;
    expect(body.cursor).toBe("tok_xyz");
  });

  it("returns null cursor when none provided", async () => {
    const res = await GET(makeRequest());
    const body = (res as unknown as { body: { cursor: null } }).body;
    expect(body.cursor).toBeNull();
  });

  it("error envelope has code, message, request_id", async () => {
    const res = await GET(makeRequest({ limit: "0" }));
    const body = (res as unknown as { body: { error: Record<string, unknown> } }).body;
    expect(body.error).toHaveProperty("code");
    expect(body.error).toHaveProperty("message");
    expect(body.error).toHaveProperty("request_id");
  });
});
