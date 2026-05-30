/**
 * Tests for GET and POST /api/v2/streams
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
  it("returns 200 with streams array when authenticated", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (res as unknown as { body: { streams: unknown[] } }).body;
    expect(Array.isArray(body.streams)).toBe(true);
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
});

describe("POST /api/v2/streams", () => {
  it("returns 201 with a v2 stream on valid input", async () => {
    const res = await POST(
      makeRequest({ body: { recipient: "GABC123", rate: "120 XLM/month" } }),
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
      makeRequest({ auth: null, body: { recipient: "GABC123", rate: "120 XLM/month" } }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when recipient is missing", async () => {
    const res = await POST(makeRequest({ body: { rate: "120 XLM/month" } }));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 when rate is missing", async () => {
    const res = await POST(makeRequest({ body: { recipient: "GABC123" } }));
    expect(res.status).toBe(400);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 when body is null", async () => {
    const res = await POST(makeRequest({ body: null }));
    expect(res.status).toBe(400);
  });

  it("returns 500 canonical error when json() throws", async () => {
    const res = await POST(makeRequest({ body: "THROW" }));
    expect(res.status).toBe(500);
    const body = (res as unknown as { body: { error: { code: string } } }).body;
    expect(body.error.code).toBe("STREAM_CREATE_FAILED");
  });

  it("created stream has status 'draft'", async () => {
    const res = await POST(
      makeRequest({ body: { recipient: "GABC123", rate: "120 XLM/month" } }),
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
