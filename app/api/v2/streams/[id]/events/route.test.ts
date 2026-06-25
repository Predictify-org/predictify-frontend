/**
 * Tests for GET /api/v2/streams/[id]/events (SSE)
 *
 * Strategy
 * ────────
 * We test the HTTP-layer contract (status codes, headers, auth, 404/403)
 * without spinning up a real SSE connection. For the streaming path we
 * verify that the ReadableStream is returned with the correct headers and
 * that event-bus listeners are wired and cleaned up correctly.
 */

import { GET } from "./route";
import { resetDb } from "@/app/lib/db";

// ── Module mocks ─────────────────────────────────────────────────────────────

jest.mock("@/app/lib/logger");
jest.mock("next/headers", () => ({
  headers: () => ({ get: () => null }),
}));

// Capture event-bus listener registrations so we can assert on them.
const busListeners: Record<string, ((...args: any[]) => void)[]> = {};
jest.mock("@/app/lib/event-bus", () => ({
  eventBus: {
    on: jest.fn((event: string, fn: (...args: any[]) => void) => {
      busListeners[event] = busListeners[event] ?? [];
      busListeners[event].push(fn);
    }),
    off: jest.fn((event: string, fn: (...args: any[]) => void) => {
      busListeners[event] = (busListeners[event] ?? []).filter((l) => l !== fn);
    }),
    emit: jest.fn(),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal JWT with `sub` set to `walletAddress`. */
function makeToken(walletAddress: string): string {
  const header  = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: walletAddress, iss: "streampay", aud: "streampay-api" })).toString("base64url");
  return `${header}.${payload}.fakesig`;
}

/** Build a Next.js-compatible request stub. */
function makeRequest(opts: {
  auth?: string | null;
  abortController?: AbortController;
} = {}): Request {
  const { auth = `Bearer ${makeToken("GSENDER111")}`, abortController } = opts;
  const headers: Record<string, string> = {};
  if (auth) headers["authorization"] = auth;

  const signal = abortController?.signal ?? new AbortController().signal;

  return new Request("http://localhost/api/v2/streams/stream-1/events", {
    headers,
    signal,
  }) as any;
}

/** Params stub matching Next.js dynamic route context. */
const params = (id: string) => ({ params: Promise.resolve({ id }) });

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Clear bus listener tracking between tests.
  Object.keys(busListeners).forEach((k) => delete busListeners[k]);

  resetDb({
    "stream-1": {
      id: "stream-1",
      sender:    "GSENDER111",
      recipient: "GRECIPIENT222",
      token:     "XLM",
      rate:      "100",
      status:    "active",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    } as any,
  });
});

afterEach(() => resetDb());

// ── Auth tests ───────────────────────────────────────────────────────────────

describe("authentication", () => {
  it("returns 401 when Authorization header is absent", async () => {
    const res = await GET(makeRequest({ auth: null }) as any, params("stream-1"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is not a Bearer token", async () => {
    const res = await GET(makeRequest({ auth: "Basic abc" }) as any, params("stream-1"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when Bearer token is malformed (bad base64)", async () => {
    const res = await GET(makeRequest({ auth: "Bearer not.a.token" }) as any, params("stream-1"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when token payload has no sub claim", async () => {
    const header  = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ iss: "streampay" })).toString("base64url");
    const token   = `${header}.${payload}.sig`;
    const res = await GET(makeRequest({ auth: `Bearer ${token}` }) as any, params("stream-1"));
    expect(res.status).toBe(401);
  });
});

// ── Stream lookup ─────────────────────────────────────────────────────────────

describe("stream lookup", () => {
  it("returns 404 when stream does not exist", async () => {
    const res = await GET(makeRequest() as any, params("nonexistent"));
    expect(res.status).toBe(404);
  });
});

// ── Authorization ─────────────────────────────────────────────────────────────

describe("authorization", () => {
  it("returns 403 when caller is not sender or recipient", async () => {
    const token = makeToken("GSTRANGER999");
    const res   = await GET(
      makeRequest({ auth: `Bearer ${token}` }) as any,
      params("stream-1"),
    );
    expect(res.status).toBe(403);
  });

  it("allows the stream sender to subscribe", async () => {
    const token = makeToken("GSENDER111");
    const res   = await GET(
      makeRequest({ auth: `Bearer ${token}` }) as any,
      params("stream-1"),
    );
    expect(res.status).toBe(200);
  });

  it("allows the stream recipient to subscribe", async () => {
    const token = makeToken("GRECIPIENT222");
    const res   = await GET(
      makeRequest({ auth: `Bearer ${token}` }) as any,
      params("stream-1"),
    );
    expect(res.status).toBe(200);
  });
});

// ── SSE response shape ────────────────────────────────────────────────────────

describe("SSE response", () => {
  it("responds with Content-Type: text/event-stream", async () => {
    const res = await GET(makeRequest() as any, params("stream-1"));
    expect(res.headers.get("content-type")).toBe("text/event-stream");
  });

  it("responds with Cache-Control: no-cache, no-transform", async () => {
    const res = await GET(makeRequest() as any, params("stream-1"));
    expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
  });

  it("responds with Connection: keep-alive", async () => {
    const res = await GET(makeRequest() as any, params("stream-1"));
    expect(res.headers.get("connection")).toBe("keep-alive");
  });

  it("responds with X-Accel-Buffering: no to disable proxy buffering", async () => {
    const res = await GET(makeRequest() as any, params("stream-1"));
    expect(res.headers.get("x-accel-buffering")).toBe("no");
  });

  it("returns a ReadableStream body", async () => {
    const res = await GET(makeRequest() as any, params("stream-1"));
    expect(res.body).toBeInstanceOf(ReadableStream);
  });
});

// ── Event-bus wiring ──────────────────────────────────────────────────────────

describe("event-bus wiring", () => {
  it("registers stream:updated and settle:finished listeners on connect", async () => {
    const { eventBus } = require("@/app/lib/event-bus");
    await GET(makeRequest() as any, params("stream-1"));

    expect(eventBus.on).toHaveBeenCalledWith(
      "stream:updated:stream-1",
      expect.any(Function),
    );
    expect(eventBus.on).toHaveBeenCalledWith(
      "settle:finished:stream-1",
      expect.any(Function),
    );
  });

  it("forwards stream:updated events to the SSE stream", async () => {
    const res = await GET(makeRequest() as any, params("stream-1"));
    const reader = res.body!.getReader();

    // Emit an event and read the first chunk.
    const payload = { streamId: "stream-1", status: "paused" };
    const listeners = busListeners["stream:updated:stream-1"] ?? [];
    listeners.forEach((fn) => fn(payload));

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    expect(text).toContain("event: stream:updated");
    expect(text).toContain(JSON.stringify(payload));
  });

  it("forwards settle:finished events to the SSE stream", async () => {
    const res = await GET(makeRequest() as any, params("stream-1"));
    const reader = res.body!.getReader();

    const payload = { streamId: "stream-1", amount: "1000" };
    const listeners = busListeners["settle:finished:stream-1"] ?? [];
    listeners.forEach((fn) => fn(payload));

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    expect(text).toContain("event: settle:finished");
    expect(text).toContain(JSON.stringify(payload));
  });

  it("removes listeners when the connection is aborted", async () => {
    const { eventBus } = require("@/app/lib/event-bus");
    const ac = new AbortController();

    await GET(makeRequest({ abortController: ac }) as any, params("stream-1"));

    // Abort the request (simulates client disconnect / Connection: close).
    ac.abort();

    // Allow microtask queue to flush.
    await Promise.resolve();

    expect(eventBus.off).toHaveBeenCalledWith(
      "stream:updated:stream-1",
      expect.any(Function),
    );
    expect(eventBus.off).toHaveBeenCalledWith(
      "settle:finished:stream-1",
      expect.any(Function),
    );
  });
});
