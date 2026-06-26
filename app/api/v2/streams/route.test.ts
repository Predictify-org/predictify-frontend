/** @jest-environment node */
import { POST } from "./route";
import { db, resetDb } from "@/app/lib/db";

const IDEMPOTENCY_TTL_MS = 86_400_000;
const TOKEN_PREFIX = "v2.streams.create";

const validBody = {
  recipient: "GABC123",
  rate: "100 XLM / month",
  schedule: "Pays every 30 days",
};

function makeRequest(body: object, idempotencyKey?: string): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return new Request("http://localhost/api/v2/streams", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/v2/streams — Idempotency", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates a stream without idempotency key (happy path)", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.id).toMatch(/^stream-/);
    expect(body.data.status).toBe("draft");
    expect(body.data.recipient).toBe(validBody.recipient);
  });

  it("returns cached 201 for same key + same body", async () => {
    const key = "key-same-body";

    const res1 = await POST(makeRequest(validBody, key));
    expect(res1.status).toBe(201);
    const data1 = await res1.json();

    const res2 = await POST(makeRequest(validBody, key));
    expect(res2.status).toBe(201);
    const data2 = await res2.json();

    expect(data2).toEqual(data1);
  });

  it("returns 409 for same key + different body", async () => {
    const key = "key-diff-body";

    await POST(makeRequest(validBody, key));

    const res = await POST(
      makeRequest({ ...validBody, recipient: "GXYZ789" }, key),
    );
    expect(res.status).toBe(409);

    const err = await res.json();
    expect(err.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("reuses idempotency slot after TTL expiry", async () => {
    const key = "key-ttl";

    const res1 = await POST(makeRequest(validBody, key));
    expect(res1.status).toBe(201);
    const data1 = await res1.json();

    const token = `${TOKEN_PREFIX}:${key}`;
    const entry = db.idempotency.get(token) as {
      expiresAt: number;
    };
    entry.expiresAt = Date.now() - 1;
    db.idempotency.set(token, entry);

    const res2 = await POST(makeRequest(validBody, key));
    expect(res2.status).toBe(201);

    const data2 = await res2.json();
    expect(data2.data.id).not.toBe(data1.data.id);
  });

  describe("edge cases", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost/api/v2/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);

      const err = await res.json();
      expect(err.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 422 for missing required fields", async () => {
      const res = await POST(makeRequest({ recipient: "GABC123" }));
      expect(res.status).toBe(422);

      const err = await res.json();
      expect(err.error.code).toBe("VALIDATION_ERROR");
    });

    it("does not leak one key's cache to another key", async () => {
      const resA = await POST(makeRequest(validBody, "key-a"));
      const dataA = await resA.json();

      const resB = await POST(
        makeRequest(
          { recipient: "OTHER", rate: "50 XLM / month", schedule: "Weekly" },
          "key-b",
        ),
      );
      const dataB = await resB.json();

      expect(dataA.data.id).not.toBe(dataB.data.id);
      expect(dataA.data.recipient).not.toBe(dataB.data.recipient);
    });
  });
});
