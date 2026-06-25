/**
 * @jest-environment node
 *
 * V1 API contract tests — run in CI for the full deprecation window.
 *
 * These tests pin the exact v1 response shape so that refactors to internal
 * business logic cannot silently break wallet partners still on v1.
 *
 * Do NOT weaken or remove these assertions before the v1 sunset date
 * (2026-12-31). Per policy, shape changes require a new major version.
 *
 * When v1 is sunset, replace this file with a single test that asserts
 * the /api/v1/* middleware returns 410 Gone.
 */

import { db, resetDb } from "@/app/lib/db";
import { POST as createStream } from "@/app/api/streams/route";
import { GET as getStream } from "@/app/api/streams/[id]/route";
import { V1_SUNSET_DATE, V1_DEPRECATION_DATE } from "@/app/lib/api-version";

const VALID_STELLAR_KEY = "GDSBCG3OKHCMMWS5EBH2X7XOYTJRWXN2YYQPCNS5OFBU4IDO4X7OFSQA";

type RouteContext = { params: Promise<{ id: string }> };

function ctx(id: string): RouteContext {
  return { params: Promise.resolve({ id }) };
}

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/streams", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => resetDb());

// ── Create response shape (POST /api/streams) ─────────────────────────────

describe("v1 contract: POST /api/streams response shape", () => {
  it("returns 201 with data and links", async () => {
    const res = await createStream(
      postRequest({ recipient: VALID_STELLAR_KEY, rate: "50", schedule: "month" }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("links.self");
  });

  it("data contains nextAction as a string (not allowed_actions)", async () => {
    const res = await createStream(
      postRequest({ recipient: VALID_STELLAR_KEY, rate: "50", schedule: "month" }),
    );
    const { data } = await res.json();
    // v1 contract: nextAction is a plain string
    expect(typeof data.nextAction).toBe("string");
    expect(data).not.toHaveProperty("allowed_actions");
  });

  it("data uses camelCase date fields (createdAt, updatedAt)", async () => {
    const res = await createStream(
      postRequest({ recipient: VALID_STELLAR_KEY, rate: "50", schedule: "month" }),
    );
    const { data } = await res.json();
    // v1 contract: camelCase dates
    expect(data).toHaveProperty("createdAt");
    expect(data).toHaveProperty("updatedAt");
    expect(data).not.toHaveProperty("created_at");
    expect(data).not.toHaveProperty("updated_at");
  });

  it("data.status is 'draft' for a newly created stream", async () => {
    const res = await createStream(
      postRequest({ recipient: VALID_STELLAR_KEY, rate: "50", schedule: "month" }),
    );
    const { data } = await res.json();
    expect(data.status).toBe("draft");
  });

  it("idempotent: second call with same key returns the same body", async () => {
    const req = () =>
      postRequest(
        { recipient: VALID_STELLAR_KEY, rate: "50", schedule: "month" },
        { "Idempotency-Key": "idem-contract-1" },
      );

    const first = await (await createStream(req())).json();
    const second = await (await createStream(req())).json();
    expect(second).toEqual(first);
  });

  it("returns 422 VALIDATION_ERROR when required fields are missing or invalid", async () => {
    // Missing rate and schedule
    const res = await createStream(postRequest({ recipient: "GABC123" }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 with field-level details when recipient is invalid", async () => {
    const res = await createStream(
      postRequest({ recipient: "not-a-valid-key", rate: "50", schedule: "month" }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toBeDefined();
    expect(body.error.details.length).toBeGreaterThan(0);
    expect(body.error.details[0].field).toBe("recipient");
  });
});

// ── Get response shape (GET /api/streams/:id) ─────────────────────────────

describe("v1 contract: GET /api/streams/:id response shape", () => {
  async function seedStream() {
    const res = await createStream(
      postRequest({ recipient: VALID_STELLAR_KEY, rate: "10", schedule: "day" }),
    );
    const { data } = await res.json();
    return data.id as string;
  }

  it("returns 200 with data and links.self", async () => {
    const id = await seedStream();
    const res = await getStream(
      new Request(`http://localhost/api/streams/${id}`),
      ctx(id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body.links.self).toMatch(/\/api\/v1\/streams\//);
  });

  it("data contains all v1 required fields", async () => {
    const id = await seedStream();
    const res = await getStream(
      new Request(`http://localhost/api/streams/${id}`),
      ctx(id),
    );
    const { data } = await res.json();

    // These fields must be present and correctly named in v1.
    const requiredFields: string[] = [
      "id",
      "recipient",
      "rate",
      "schedule",
      "status",
      "nextAction",
      "createdAt",
      "updatedAt",
    ];
    for (const field of requiredFields) {
      expect(data).toHaveProperty(field);
    }
  });

  it("data does NOT contain v2-only fields", async () => {
    const id = await seedStream();
    const res = await getStream(
      new Request(`http://localhost/api/streams/${id}`),
      ctx(id),
    );
    const { data } = await res.json();

    // v2 field names must NOT appear in v1 responses.
    expect(data).not.toHaveProperty("allowed_actions");
    expect(data).not.toHaveProperty("created_at");
    expect(data).not.toHaveProperty("updated_at");
  });

  it("returns 404 STREAM_NOT_FOUND for an unknown id", async () => {
    const res = await getStream(
      new Request("http://localhost/api/streams/does-not-exist"),
      ctx("does-not-exist"),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("STREAM_NOT_FOUND");
  });

  it("links.self contains the stream id", async () => {
    const id = await seedStream();
    const res = await getStream(
      new Request(`http://localhost/api/streams/${id}`),
      ctx(id),
    );
    const body = await res.json();
    expect(body.links.self).toContain(id);
  });
});

// ── Sunset guard (middleware-level, documented here for CI visibility) ─────

describe("v1 sunset policy (documented)", () => {
  it("V1_SUNSET_DATE is at least 90 days after V1_DEPRECATION_DATE", () => {
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    expect(V1_SUNSET_DATE.getTime() - V1_DEPRECATION_DATE.getTime()).toBeGreaterThanOrEqual(
      ninetyDaysMs,
    );
  });
});
