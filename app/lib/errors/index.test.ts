/**
 * Tests for the shared errorResponse helper.
 *
 * We mock next/server so these run in the jsdom Jest environment
 * without a real Next.js request context.
 */

import { errorResponse, ErrorCode, type ErrorEnvelope } from "./index";

// ---------------------------------------------------------------------------
// Minimal NextResponse stub — mirrors the real shape we rely on
// ---------------------------------------------------------------------------
jest.mock("next/server", () => {
  return {
    NextResponse: {
      json: <T>(body: T, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        body,
        json: async () => body,
      }),
    },
  };
});

// headers() is called inside resolveRequestId; stub it to avoid RSC errors
jest.mock("next/headers", () => ({
  headers: () => ({ get: () => null }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function parseBody(res: ReturnType<typeof errorResponse>): Promise<ErrorEnvelope> {
  // Our stub stores body directly
  return (res as unknown as { body: ErrorEnvelope }).body;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("errorResponse()", () => {
  it("returns the canonical { error: { code, message, request_id } } shape", async () => {
    const res = errorResponse(ErrorCode.NOT_FOUND, "Resource not found.", 404);
    const body = await parseBody(res);

    expect(body).toMatchObject({
      error: {
        code: "NOT_FOUND",
        message: "Resource not found.",
      },
    });
    expect(typeof body.error.request_id).toBe("string");
    expect(body.error.request_id.length).toBeGreaterThan(0);
  });

  it("sets the HTTP status code correctly", () => {
    const res = errorResponse(ErrorCode.BAD_REQUEST, "Bad input.", 400);
    expect((res as unknown as { status: number }).status).toBe(400);
  });

  it("defaults to HTTP 500 when no status is provided", () => {
    const res = errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Oops.");
    expect((res as unknown as { status: number }).status).toBe(500);
  });

  it("accepts arbitrary string codes (not just ErrorCode constants)", async () => {
    const res = errorResponse("CUSTOM_CODE", "Custom error.", 422);
    const body = await parseBody(res);
    expect(body.error.code).toBe("CUSTOM_CODE");
  });

  it("always includes a request_id even when headers() throws", async () => {
    // Override the mock to simulate headers() throwing
    jest.resetModules();
    jest.mock("next/headers", () => ({
      headers: () => {
        throw new Error("Not in request context");
      },
    }));

    // Re-import after resetting modules
    const { errorResponse: er } = await import("./index");
    const res = er(ErrorCode.INTERNAL_SERVER_ERROR, "Oops.");
    const body = (res as unknown as { body: ErrorEnvelope }).body;
    expect(typeof body.error.request_id).toBe("string");
    expect(body.error.request_id.length).toBeGreaterThan(0);
  });

  it("uses x-request-id header when present", async () => {
    jest.resetModules();
    jest.mock("next/headers", () => ({
      headers: () => ({ get: (name: string) => (name === "x-request-id" ? "req_abc123" : null) }),
    }));
    jest.mock("next/server", () => ({
      NextResponse: {
        json: <T>(body: T, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
      },
    }));

    const { errorResponse: er } = await import("./index");
    const res = er(ErrorCode.NOT_FOUND, "Not found.", 404);
    const body = (res as unknown as { body: ErrorEnvelope }).body;
    expect(body.error.request_id).toBe("req_abc123");
  });
});
