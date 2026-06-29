/** @jest-environment node */
import { POST } from "./route";
import { resetDb } from "@/app/lib/db";
import { _resetAllowlistForTesting, addAllowedToken } from "@/app/lib/token-allowlist";
import { _resetOrgDbForTesting } from "@/app/lib/org-db";
import { resetRateLimitStore } from "@/app/lib/rate-limit-store";

const VALID_RECIPIENT = "GDSBCG3OKHCMMWS5EBH2X7XOYTJRWXN2YYQPCNS5OFBU4IDO4X7OFSQA";

const validStream = {
  recipient: VALID_RECIPIENT,
  rate: "100",
  schedule: "month",
};

const anotherValidStream = {
  recipient: VALID_RECIPIENT,
  rate: "50.5",
  schedule: "week",
};

function makeRequest(body: unknown, auth = true): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth) {
    headers["authorization"] = "Bearer test-token";
  }
  return new Request("http://localhost/api/streams/batch", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/streams/batch", () => {
  beforeEach(() => {
    resetDb();
    _resetAllowlistForTesting();
    addAllowedToken("XLM");
    _resetOrgDbForTesting();
    resetRateLimitStore();
  });

  describe("happy path", () => {
    it("creates a single stream", async () => {
      const res = await POST(makeRequest([validStream]));
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toMatch(/^stream-/);
      expect(body.data[0].status).toBe("draft");
      expect(body.data[0].recipient).toBe(validStream.recipient);
      expect(body.data[0].rate).toBe(validStream.rate);
      expect(body.data[0].schedule).toBe(validStream.schedule);
      expect(body.data[0].token).toBe("XLM");
    });

    it("creates multiple streams", async () => {
      const res = await POST(makeRequest([validStream, anotherValidStream]));
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.data).toHaveLength(2);
      expect(body.data[0].id).toMatch(/^stream-/);
      expect(body.data[1].id).toMatch(/^stream-/);
      expect(body.data[0].id).not.toBe(body.data[1].id);
    });

    it("creates 20 streams (max batch)", async () => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        recipient: VALID_RECIPIENT,
        rate: `${i + 1}`,
        schedule: "month",
      }));

      const res = await POST(makeRequest(items));
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.data).toHaveLength(20);
    });

    it("uses default token XLM when token is absent", async () => {
      const res = await POST(makeRequest([validStream]));
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.data[0].token).toBe("XLM");
    });

    it("accepts explicit XLM token", async () => {
      const body = { ...validStream, token: "XLM" };
      const res = await POST(makeRequest([body]));
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.data[0].token).toBe("XLM");
    });

    it("returns links.self in response", async () => {
      const res = await POST(makeRequest([validStream]));
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.links).toEqual({ self: "/api/v1/streams/batch" });
    });
  });

  describe("authentication", () => {
    it("rejects missing bearer token", async () => {
      const res = await POST(makeRequest([validStream], false));
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects malformed bearer token", async () => {
      const headers = {
        "Content-Type": "application/json",
        authorization: "NotBearer token",
      };
      const req = new Request("http://localhost/api/streams/batch", {
        method: "POST",
        headers,
        body: JSON.stringify([validStream]),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });

  describe("input validation", () => {
    it("rejects non-array body", async () => {
      const res = await POST(makeRequest({ not: "an array" }));
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("INVALID_REQUEST");
    });

    it("rejects non-JSON body", async () => {
      const req = new Request("http://localhost/api/streams/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: "Bearer token",
        },
        body: "not json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("rejects batch larger than 20", async () => {
      const items = Array.from({ length: 21 }, () => validStream);
      const res = await POST(makeRequest(items));
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("BATCH_LIMIT_EXCEEDED");
    });

    it("rejects non-object items", async () => {
      const res = await POST(makeRequest(["string", 42]));
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details).toHaveLength(2);
      expect(body.error.details[0].code).toBe("INVALID_ITEM");
    });

    it("rejects items with invalid recipient", async () => {
      const badItem = { ...validStream, recipient: "not-a-stellar-key" };
      const res = await POST(makeRequest([badItem]));
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details[0].field).toBe("recipient");
    });

    it("rejects items with empty recipient", async () => {
      const badItem = { ...validStream, recipient: "" };
      const res = await POST(makeRequest([badItem]));
      expect(res.status).toBe(422);
    });

    it("rejects items with invalid rate", async () => {
      const badItem = { ...validStream, rate: "not-a-number" };
      const res = await POST(makeRequest([badItem]));
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.error.details[0].field).toBe("rate");
    });

    it("rejects items with invalid schedule", async () => {
      const badItem = { ...validStream, schedule: "fortnightly" };
      const res = await POST(makeRequest([badItem]));
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.error.details[0].field).toBe("schedule");
    });

    it("rejects items with missing rate", async () => {
      const { rate, ...missingRate } = validStream;
      const res = await POST(makeRequest([missingRate]));
      expect(res.status).toBe(422);
    });

    it("rejects items with invalid token format", async () => {
      const badItem = { ...validStream, token: "NOT_A_VALID_TOKEN" };
      const res = await POST(makeRequest([badItem]));
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.error.details[0].code).toBe("INVALID_TOKEN");
    });
  });

  describe("all-or-nothing transactional semantics", () => {
    it("rejects entire batch if one item is invalid", async () => {
      const valid = { ...validStream };
      const invalid = { ...validStream, recipient: "bad-key" };

      const res = await POST(makeRequest([valid, invalid]));
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.error.details).toHaveLength(1);
      expect(body.error.message).toContain("No streams were created");
    });

    it("creates no streams when validation fails", async () => {
      const { rate, ...missingRate } = validStream;
      const res = await POST(makeRequest([missingRate]));
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.data).toBeUndefined();
    });
  });

  describe("idempotency", () => {
    function makeIdempotentRequest(body: unknown, key: string): Request {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        authorization: "Bearer test-token",
        "Idempotency-Key": key,
      };
      return new Request("http://localhost/api/streams/batch", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    }

    it("returns cached 201 for same key and body", async () => {
      const key = "batch-key-1";

      const res1 = await POST(makeIdempotentRequest([validStream], key));
      expect(res1.status).toBe(201);
      const data1 = await res1.json();

      const res2 = await POST(makeIdempotentRequest([validStream], key));
      expect(res2.status).toBe(201);
      const data2 = await res2.json();

      expect(data2).toEqual(data1);
    });

    it("returns 409 for same key different body", async () => {
      const key = "batch-key-2";

      const res1 = await POST(makeIdempotentRequest([validStream], key));
      expect(res1.status).toBe(201);

      const res2 = await POST(makeIdempotentRequest([anotherValidStream], key));
      expect(res2.status).toBe(409);

      const body = await res2.json();
      expect(body.error.code).toBe("IDEMPOTENCY_CONFLICT");
    });
  });
});
