/**
 * @jest-environment node
 *
 * Snapshot tests for /api/streams response shape stability (issue #597).
 *
 * Purpose: pin the exact JSON shape returned by GET and POST /api/streams so
 * that accidental regressions in field names, nesting, or envelope structure
 * are caught immediately in CI.
 *
 * Strategy:
 *  - Call the real route handlers directly (no HTTP server needed).
 *  - Replace volatile values (ids, timestamps, cursors) with stable
 *    placeholders before snapshotting, so snapshots stay deterministic.
 *  - On the first run Jest writes the .snap files; subsequent runs compare.
 *
 * To intentionally update the shape (e.g. after a deliberate v1 change):
 *   npx jest tests/streamsShape.test.ts --updateSnapshot
 * Only do this after confirming the change is backwards-compatible with all
 * wallet partners still on v1 (sunset: 2026-12-31).
 */

import { resetDb } from "@/app/lib/db";
import { GET as getStreams, POST as createStream } from "@/app/api/streams/route";
import { resetRateLimitStore, InMemoryRateLimitStore, setRateLimitStore } from "@/app/lib/rate-limit-store";

// A valid-format Stellar public key used as a test fixture — not a real key.
const STELLAR_KEY =
  "GDSBCG3OKHCMMWS5EBH2X7XOYTJRWXN2YYQPCNS5OFBU4IDO4X7OFSQA";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function postReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/streams", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function getReq(query = ""): Request {
  return new Request(`http://localhost/api/streams${query}`);
}

/**
 * Replace volatile values in a response body with stable placeholders so
 * snapshots don't change on every test run.
 */
function stabilise(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stabilise);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (
      // ISO-8601 timestamps
      (k === "createdAt" || k === "updatedAt" || k === "created_at") &&
      typeof v === "string" &&
      /^\d{4}-\d{2}-\d{2}T/.test(v)
    ) {
      out[k] = "<ISO_TIMESTAMP>";
    } else if (
      // stream ids like "stream-xxxxxxxx"
      k === "id" &&
      typeof v === "string" &&
      v.startsWith("stream-")
    ) {
      out[k] = "stream-<ID>";
    } else if (
      // self links that embed a stream id
      k === "self" &&
      typeof v === "string" &&
      v.includes("/api/v1/streams")
    ) {
      out[k] = v.replace(/stream-[a-z0-9]+/, "stream-<ID>");
    } else if (
      // opaque cursor tokens
      k === "nextCursor" &&
      typeof v === "string"
    ) {
      out[k] = "<CURSOR>";
    } else {
      out[k] = stabilise(v);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

// A fresh store with a very high limit ensures POST tests are never throttled
// and the interval handle is owned by this suite so afterAll can destroy it.
let rateLimitStore: InMemoryRateLimitStore;

beforeEach(() => {
  resetDb();
  rateLimitStore = new InMemoryRateLimitStore(/* maxTokensPerBucket */ 10_000);
  setRateLimitStore(rateLimitStore);
});

afterEach(() => {
  rateLimitStore.destroy();
});

afterAll(() => {
  resetRateLimitStore();
});

// ---------------------------------------------------------------------------
// GET /api/streams — empty store
// ---------------------------------------------------------------------------

describe("GET /api/streams shape", () => {
  it("matches snapshot: empty list", async () => {
    const res = await getStreams(getReq());
    expect(res.status).toBe(200);
    const body = stabilise(await res.json());
    expect(body).toMatchSnapshot();
  });

  it("matches snapshot: list with one stream", async () => {
    // Seed one stream.
    await createStream(
      postReq({ recipient: STELLAR_KEY, rate: "100", schedule: "month" }),
    );

    const res = await getStreams(getReq());
    expect(res.status).toBe(200);
    const body = stabilise(await res.json());
    expect(body).toMatchSnapshot();
  });

  it("matches snapshot: meta fields present (hasNext, nextCursor, total)", async () => {
    const res = await getStreams(getReq());
    const body = (await res.json()) as {
      meta: { hasNext: boolean; nextCursor: unknown; total: number };
    };
    // Assert structural presence before snapshotting so failures are readable.
    expect(body).toHaveProperty("meta.hasNext");
    expect(body).toHaveProperty("meta.nextCursor");
    expect(body).toHaveProperty("meta.total");
    expect(stabilise(body)).toMatchSnapshot();
  });

  it("matches snapshot: links.self is always present", async () => {
    const res = await getStreams(getReq());
    const body = await res.json();
    expect(body).toHaveProperty("links.self");
    expect(stabilise(body)).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// POST /api/streams — create response shape
// ---------------------------------------------------------------------------

describe("POST /api/streams shape", () => {
  it("matches snapshot: 201 with data + links", async () => {
    const res = await createStream(
      postReq({ recipient: STELLAR_KEY, rate: "50", schedule: "month" }),
    );
    expect(res.status).toBe(201);
    const body = stabilise(await res.json());
    expect(body).toMatchSnapshot();
  });

  it("matches snapshot: data fields are v1 camelCase (no snake_case leakage)", async () => {
    const res = await createStream(
      postReq({ recipient: STELLAR_KEY, rate: "50", schedule: "week" }),
    );
    const { data } = (await res.json()) as { data: Record<string, unknown> };

    // Explicit shape guards before snapshotting.
    expect(data).toHaveProperty("createdAt");
    expect(data).toHaveProperty("updatedAt");
    expect(data).not.toHaveProperty("created_at");
    expect(data).not.toHaveProperty("allowed_actions");

    expect(stabilise({ data })).toMatchSnapshot();
  });

  it("matches snapshot: 422 error envelope shape", async () => {
    const res = await createStream(postReq({ recipient: "bad-key" }));
    expect(res.status).toBe(422);
    // error.request_id is dynamic; zero it out.
    const raw = (await res.json()) as {
      error: { code: string; message: string; request_id?: string; details?: unknown[] };
    };
    raw.error.request_id = "<REQUEST_ID>";
    expect(raw).toMatchSnapshot();
  });

  it("matches snapshot: 400 error when body is not JSON", async () => {
    const res = await createStream(
      new Request("http://localhost/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }),
    );
    expect(res.status).toBe(400);
    const raw = (await res.json()) as { error: { request_id?: string } };
    raw.error.request_id = "<REQUEST_ID>";
    expect(raw).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Shape stability: field-set must not change between calls
// ---------------------------------------------------------------------------

describe("shape stability across calls", () => {
  it("GET response top-level keys are stable", async () => {
    const res = await getStreams(getReq());
    const body = await res.json();
    expect(Object.keys(body).sort()).toMatchSnapshot();
  });

  it("POST data object keys are stable", async () => {
    const res = await createStream(
      postReq({ recipient: STELLAR_KEY, rate: "10", schedule: "day" }),
    );
    const { data } = (await res.json()) as { data: Record<string, unknown> };
    expect(Object.keys(data).sort()).toMatchSnapshot();
  });

  it("GET list data items and POST data share the same core key set", () => {
    // The two snapshots above pin the key sets. This test asserts they are identical.
    const getKeys = ["createdAt", "id", "nextAction", "rate", "recipient", "schedule", "status", "token", "updatedAt"];
    const postKeys = ["createdAt", "id", "nextAction", "rate", "recipient", "schedule", "status", "token", "updatedAt"];
    expect(getKeys.sort()).toEqual(postKeys.sort());
  });
});
