/**
 * Tests for GET and POST /api/auth/wallet
 */

import { GET, POST } from "./route";

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

const VALID_ADDRESS = "GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890ABCDEFG";

function makeGetRequest(params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams(params);
  return {
    nextUrl: { searchParams },
    headers: { get: () => null },
  } as unknown as import("next/server").NextRequest;
}

function makePostRequest(body: unknown) {
  return {
    json: async () => {
      if (body === "THROW") throw new Error("parse error");
      return body;
    },
    headers: { get: () => null },
  } as unknown as import("next/server").NextRequest;
}

describe("GET /api/auth/wallet", () => {
  it("returns 200 with challenge and expires_at for a valid address", async () => {
    const res = await GET(makeGetRequest({ address: VALID_ADDRESS }));
    expect(res.status).toBe(200);
    const body = (res as unknown as { body: { challenge: string; expires_at: string } }).body;
    expect(typeof body.challenge).toBe("string");
    expect(body.challenge).toMatch(/^streampay_auth_/);
    expect(typeof body.expires_at).toBe("string");
  });

  it("returns 400 when address is missing", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 for an invalid Stellar address", async () => {
    const res = await GET(makeGetRequest({ address: "not-a-stellar-key" }));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("error envelope has code, message, request_id", async () => {
    const res = await GET(makeGetRequest());
    const body = (res as unknown as { body: { error: Record<string, unknown> } }).body;
    expect(body.error).toHaveProperty("code");
    expect(body.error).toHaveProperty("message");
    expect(body.error).toHaveProperty("request_id");
  });
});

describe("POST /api/auth/wallet", () => {
  it("returns 200 with token and expires_at for valid body", async () => {
    const res = await POST(
      makePostRequest({
        address: VALID_ADDRESS,
        challenge: "streampay_auth_123_abc",
        signature: "validbase64sig==",
      }),
    );
    expect(res.status).toBe(200);
    const body = (res as unknown as { body: { token: string; expires_at: string } }).body;
    expect(typeof body.token).toBe("string");
    expect(typeof body.expires_at).toBe("string");
  });

  it("returns 400 when address is missing", async () => {
    const res = await POST(
      makePostRequest({ challenge: "ch", signature: "sig" }),
    );
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 when challenge is missing", async () => {
    const res = await POST(
      makePostRequest({ address: VALID_ADDRESS, signature: "sig" }),
    );
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 when signature is missing", async () => {
    const res = await POST(
      makePostRequest({ address: VALID_ADDRESS, challenge: "ch" }),
    );
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 when body is null", async () => {
    const res = await POST(makePostRequest(null));
    expect(res.status).toBe(400);
  });

  it("returns 401 when signature is empty (verification fails)", async () => {
    const res = await POST(
      makePostRequest({ address: VALID_ADDRESS, challenge: "ch", signature: "" }),
    );
    expect(res.status).toBe(401);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 500 canonical error when json() throws", async () => {
    const res = await POST(makePostRequest("THROW"));
    expect(res.status).toBe(500);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("WALLET_VERIFY_FAILED");
  });

  it("error envelope has code, message, request_id", async () => {
    const res = await POST(makePostRequest(null));
    const body = (res as unknown as { body: { error: Record<string, unknown> } }).body;
    expect(body.error).toHaveProperty("code");
    expect(body.error).toHaveProperty("message");
    expect(body.error).toHaveProperty("request_id");
  });
});
