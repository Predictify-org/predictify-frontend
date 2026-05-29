/**
 * Tests for POST /api/debug/kms-sign
 *
 * Covers:
 *  - 200 success path with signature
 *  - 400 for missing/empty payload
 *  - 403 in production
 *  - 500 on unexpected error
 *  - canonical error envelope shape on all error paths
 */

import { POST } from "./route";

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

function makeRequest(body: unknown) {
  return {
    json: async () => {
      if (body === "THROW") throw new Error("parse error");
      return body;
    },
    headers: { get: () => null },
  } as unknown as import("next/server").NextRequest;
}

const originalEnv = process.env.NODE_ENV;

afterEach(() => {
  Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv, writable: true });
});

describe("POST /api/debug/kms-sign", () => {
  it("returns 200 with a signature for a valid payload", async () => {
    const res = await POST(makeRequest({ payload: "aGVsbG8=" }));
    expect(res.status).toBe(200);
    const body = (res as unknown as { body: { signature: string } }).body;
    expect(typeof body.signature).toBe("string");
    expect(body.signature.length).toBeGreaterThan(0);
  });

  it("returns 400 when payload is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("KMS_SIGN_INVALID_INPUT");
  });

  it("returns 400 when payload is an empty string", async () => {
    const res = await POST(makeRequest({ payload: "   " }));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("KMS_SIGN_INVALID_INPUT");
  });

  it("returns 400 when payload is not a string", async () => {
    const res = await POST(makeRequest({ payload: 42 }));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("KMS_SIGN_INVALID_INPUT");
  });

  it("returns 400 when body is null", async () => {
    const res = await POST(makeRequest(null));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("KMS_SIGN_INVALID_INPUT");
  });

  it("returns 403 in production", async () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });
    const res = await POST(makeRequest({ payload: "aGVsbG8=" }));
    expect(res.status).toBe(403);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 500 canonical error when json() throws", async () => {
    const res = await POST(makeRequest("THROW"));
    expect(res.status).toBe(500);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("KMS_SIGN_FAILED");
  });

  it("error envelope always has code, message, request_id", async () => {
    const res = await POST(makeRequest({}));
    const body = (res as unknown as { body: { error: Record<string, unknown> } }).body;
    expect(body.error).toHaveProperty("code");
    expect(body.error).toHaveProperty("message");
    expect(body.error).toHaveProperty("request_id");
  });

  it("does not expose { success, error } shape (old divergent shape)", async () => {
    const res = await POST(makeRequest({ payload: "aGVsbG8=" }));
    const body = (res as unknown as { body: Record<string, unknown> }).body;
    // Must NOT have top-level 'success' or top-level 'error' string
    expect(body).not.toHaveProperty("success");
    expect(typeof body.error).not.toBe("string");
  });
});
