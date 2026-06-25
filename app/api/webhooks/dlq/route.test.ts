/**
 * Tests for POST /api/webhooks/dlq
 *
 * Verifies that:
 *  - valid payloads return 200
 *  - invalid/missing body returns 400 with canonical error envelope
 *  - unexpected errors return 500 with canonical error envelope
 */

import { POST } from "./route";

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------
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

function makeRequest(body: unknown, contentType = "application/json") {
  return {
    json: async () => {
      if (body === "THROW") throw new Error("parse error");
      return body;
    },
    headers: { get: () => contentType },
  } as unknown as import("next/server").NextRequest;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/webhooks/dlq", () => {
  it("returns 200 { received: true } for a valid JSON body", async () => {
    const res = await POST(makeRequest({ event: "payment.failed", id: "evt_1" }));
    expect(res.status).toBe(200);
    expect((res as unknown as { body: { received: boolean } }).body).toEqual({ received: true });
  });

  it("returns 400 canonical error when body is null", async () => {
    const res = await POST(makeRequest(null));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(typeof body.error.request_id).toBe("string");
  });

  it("returns 400 canonical error when body is a string (not an object)", async () => {
    const res = await POST(makeRequest("just a string"));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 canonical error when body is an array", async () => {
    const res = await POST(makeRequest([1, 2, 3]));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 500 canonical error when json() throws", async () => {
    const res = await POST(makeRequest("THROW"));
    expect(res.status).toBe(500);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("WEBHOOK_PROCESSING_FAILED");
    expect(typeof body.error.request_id).toBe("string");
  });

  it("error envelope always has code, message, request_id", async () => {
    const res = await POST(makeRequest(null));
    const body = (res as unknown as { body: { error: Record<string, unknown> } }).body;
    expect(body.error).toHaveProperty("code");
    expect(body.error).toHaveProperty("message");
    expect(body.error).toHaveProperty("request_id");
  });
});
