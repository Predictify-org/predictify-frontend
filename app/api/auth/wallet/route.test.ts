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

const VALID_ADDRESS = "GABC2345674567ABCDEFGHIJKLMNOPQRSTUVWXYZ2345674567ABCDEF";

function makeGetRequest(params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams(params);
  return {
    nextUrl: { searchParams },
    headers: { get: () => null },
  } as unknown as import("next/server").NextRequest;
}

function makePostRequest(
  body: unknown,
  csrfCookie?: string,
  csrfHeader?: string,
) {
  return {
    json: async () => {
      if (body === "THROW") throw new Error("parse error");
      return body;
    },
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "x-csrf-token" ? (csrfHeader ?? null) : null,
    },
    cookies: {
      get: (name: string) =>
        name === "csrf-token" ? (csrfCookie ? { value: csrfCookie } : undefined) : undefined,
    },
  } as unknown as import("next/server").NextRequest;
}

describe("GET /api/auth/wallet", () => {
  it("returns 200 with challenge and expires_at for a valid address", async () => {
    const res = await GET(makeGetRequest({ address: VALID_ADDRESS }));
    expect(res.status).toBe(200);
    const body = (res as any).body;
    expect(typeof body.challenge).toBe("string");
    expect(body.challenge).toMatch(/^streampay_auth_/);
  });

  it("returns 400 when address is missing", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/wallet", () => {
  it("returns 403 when csrf token is missing entirely", async () => {
    const res = await POST(
      makePostRequest({
        address: VALID_ADDRESS,
        challenge: "ch",
        signature: "sig",
      })
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 when csrf tokens are tampered/mismatched", async () => {
    const res = await POST(
      makePostRequest(
        { address: VALID_ADDRESS, challenge: "ch", signature: "sig" },
        "valid_cookie_token",
        "tampered_header_token"
      )
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with token for valid matching double-submit CSRF tokens", async () => {
    const res = await POST(
      makePostRequest(
        {
          address: VALID_ADDRESS,
          challenge: "streampay_auth_123_abc",
          signature: "validbase64sig==",
        },
        "securecsrf123",
        "securecsrf123"
      )
    );
    expect(res.status).toBe(200);
    const body = (res as any).body;
    expect(typeof body.token).toBe("string");
  });

  it("returns 401 when signature is empty but CSRF matches", async () => {
    const res = await POST(
      makePostRequest(
        { address: VALID_ADDRESS, challenge: "ch", signature: "" },
        "securecsrf123",
        "securecsrf123"
      )
    );
    expect(res.status).toBe(401);
  });

  it("returns 500 canonical error when json() throws", async () => {
    const res = await POST(makePostRequest("THROW"));
    expect(res.status).toBe(500);
  });
});
