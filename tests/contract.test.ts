/**
 * Contract tests: validate that response fixtures match the shapes defined in openapi.json.
 *
 * These tests are purely structural — they assert field presence and types against the
 * OpenAPI 3.1 schema without spinning up a server. Use them as a fast-feedback gate
 * that the canonical fixture data stays aligned with the spec.
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Load spec once
// ---------------------------------------------------------------------------

const spec = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../openapi.json"), "utf-8")
);

// ---------------------------------------------------------------------------
// Minimal shape validators (no external deps required)
// ---------------------------------------------------------------------------

function assertErrorEnvelope(body: unknown): void {
  const b = body as Record<string, unknown>;
  expect(b.error).toBeTruthy();
  const e = b.error as Record<string, unknown>;
  expect(typeof e.code).toBe("string");
  expect(typeof e.message).toBe("string");
  expect(typeof e.request_id).toBe("string");
}

function assertStreamV2(obj: unknown): void {
  const s = obj as Record<string, unknown>;
  expect(typeof s.id).toBe("string");
  expect(typeof s.recipient).toBe("string");
  expect(typeof s.rate).toBe("string");
  expect(["draft", "active", "paused", "ended"]).toContain(s.status);
  expect(Array.isArray(s.allowed_actions)).toBe(true);
  expect(typeof s.created_at).toBe("string");
  if (s.settlement !== null) {
    const st = s.settlement as Record<string, unknown>;
    expect(typeof st.settled_at).toBe("string");
    expect(typeof st.amount).toBe("string");
    expect(typeof st.currency).toBe("string");
  }
}

function assertWalletChallenge(obj: unknown): void {
  const o = obj as Record<string, unknown>;
  expect(typeof o.challenge).toBe("string");
  expect(typeof o.expires_at).toBe("string");
  expect(new Date(o.expires_at as string).getTime()).not.toBeNaN();
}

function assertWalletToken(obj: unknown): void {
  const o = obj as Record<string, unknown>;
  expect(typeof o.token).toBe("string");
  expect(typeof o.expires_at).toBe("string");
  expect(new Date(o.expires_at as string).getTime()).not.toBeNaN();
}

// ---------------------------------------------------------------------------
// Spec sanity — confirm we're reading the right document
// ---------------------------------------------------------------------------

describe("openapi.json meta", () => {
  it("is OpenAPI 3.1.0", () => {
    expect(spec.openapi).toBe("3.1.0");
  });

  it("declares all expected paths", () => {
    const paths = Object.keys(spec.paths);
    expect(paths).toContain("/api/auth/wallet");
    expect(paths).toContain("/api/v2/streams");
    expect(paths).toContain("/api/webhooks/dlq");
    expect(paths).toContain("/api/webhooks/deliveries");
    expect(paths).toContain("/api/debug/kms-sign");
  });

  it("defines required component schemas", () => {
    const schemas = Object.keys(spec.components.schemas);
    expect(schemas).toContain("ErrorEnvelope");
    expect(schemas).toContain("StreamV2");
    expect(schemas).toContain("WalletChallenge");
    expect(schemas).toContain("WalletToken");
  });
});

// ---------------------------------------------------------------------------
// ErrorEnvelope fixtures
// ---------------------------------------------------------------------------

describe("ErrorEnvelope shape", () => {
  const cases = [
    {
      label: "400 BAD_REQUEST",
      body: { error: { code: "BAD_REQUEST", message: "Bad input.", request_id: "req_01HZ9ABCDEF" } },
    },
    {
      label: "401 UNAUTHORIZED",
      body: { error: { code: "UNAUTHORIZED", message: "Bearer token required.", request_id: "req_01HZ9ABCDEF" } },
    },
    {
      label: "403 FORBIDDEN",
      body: { error: { code: "FORBIDDEN", message: "Not available in production.", request_id: "req_01HZ9ABCDEF" } },
    },
    {
      label: "500 INTERNAL_SERVER_ERROR",
      body: { error: { code: "INTERNAL_SERVER_ERROR", message: "Unexpected error.", request_id: "req_01HZ9ABCDEF" } },
    },
  ];

  for (const { label, body } of cases) {
    it(`validates ${label}`, () => assertErrorEnvelope(body));
  }

  it("rejects envelope missing error.code", () => {
    expect(() =>
      assertErrorEnvelope({ error: { message: "oops", request_id: "req_x" } })
    ).toThrow();
  });

  it("rejects envelope missing error.request_id", () => {
    expect(() =>
      assertErrorEnvelope({ error: { code: "BAD_REQUEST", message: "oops" } })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// WalletChallenge fixtures  (GET /api/auth/wallet 200)
// ---------------------------------------------------------------------------

describe("WalletChallenge shape", () => {
  it("validates a well-formed challenge", () => {
    assertWalletChallenge({
      challenge: "streampay_auth_1716000000000_x7k2m",
      expires_at: "2024-01-15T10:05:00.000Z",
    });
  });

  it("rejects missing expires_at", () => {
    expect(() => assertWalletChallenge({ challenge: "nonce_abc" })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// WalletToken fixtures  (POST /api/auth/wallet 200)
// ---------------------------------------------------------------------------

describe("WalletToken shape", () => {
  it("validates a well-formed token", () => {
    assertWalletToken({
      token: "tok_R0FCQzEyMzQ1Njc4OTA",
      expires_at: "2024-01-16T10:00:00.000Z",
    });
  });

  it("rejects missing token field", () => {
    expect(() => assertWalletToken({ expires_at: "2024-01-16T10:00:00.000Z" })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// StreamV2 fixtures  (GET /api/v2/streams, POST /api/v2/streams)
// ---------------------------------------------------------------------------

describe("StreamV2 shape", () => {
  const base = {
    recipient: "GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890ABCDEFG",
    rate: "120 XLM/month",
    allowed_actions: ["pause", "stop"],
    created_at: "2024-01-15T10:00:00.000Z",
  };

  const activeStream = { id: "stream_lf3k9z", ...base, status: "active", settlement: null };

  const settledStream = {
    id: "stream_settled1",
    ...base,
    rate: "60 XLM/month",
    status: "ended",
    allowed_actions: [],
    settlement: { settled_at: "2024-02-01T12:00:00.000Z", amount: "360 XLM", currency: "XLM" },
  };

  const draftStream = { id: "stream_draft1", ...base, rate: "10 XLM/month", status: "draft", allowed_actions: ["start"], settlement: null };

  it("validates active stream (settlement: null)", () => assertStreamV2(activeStream));
  it("validates settled stream (settlement object)", () => assertStreamV2(settledStream));
  it("validates draft stream", () => assertStreamV2(draftStream));

  it("rejects unknown status value", () => {
    expect(() => assertStreamV2({ ...activeStream, status: "unknown_state" })).toThrow();
  });

  it("rejects missing allowed_actions", () => {
    const { allowed_actions: _omit, ...without } = activeStream;
    expect(() => assertStreamV2(without)).toThrow();
  });

  it("GET /api/v2/streams response wraps streams in an array", () => {
    const response = { streams: [activeStream, draftStream] };
    expect(Array.isArray(response.streams)).toBe(true);
    response.streams.forEach((s) => assertStreamV2(s));
  });
});

// ---------------------------------------------------------------------------
// /api/webhooks/dlq — POST 200 fixture
// ---------------------------------------------------------------------------

describe("DLQ webhook response shape", () => {
  it("accepts event with received: true", () => {
    const body = { received: true };
    expect(typeof body.received).toBe("boolean");
    expect(body.received).toBe(true);
  });

  it("rejects missing received field", () => {
    const body = {} as Record<string, unknown>;
    expect(typeof body.received).not.toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// /api/webhooks/deliveries — GET 200 fixture
// ---------------------------------------------------------------------------

describe("Webhook deliveries response shape", () => {
  const fixture = { deliveries: [], cursor: null, limit: 20 };

  it("has deliveries array", () => {
    expect(Array.isArray(fixture.deliveries)).toBe(true);
  });

  it("has cursor (string or null)", () => {
    expect(fixture.cursor === null || typeof fixture.cursor === "string").toBe(true);
  });

  it("has numeric limit within spec bounds", () => {
    expect(typeof fixture.limit).toBe("number");
    expect(fixture.limit).toBeGreaterThanOrEqual(1);
    expect(fixture.limit).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// /api/debug/kms-sign — POST 200 fixture
// ---------------------------------------------------------------------------

describe("KMS sign response shape", () => {
  it("has a non-empty string signature", () => {
    const fixture = { signature: "c2lnbmVkOmFHVnNiRzg5" };
    expect(typeof fixture.signature).toBe("string");
    expect(fixture.signature.length).toBeGreaterThan(0);
  });

  it("production guard: 403 uses ErrorEnvelope", () => {
    assertErrorEnvelope({
      error: {
        code: "FORBIDDEN",
        message: "This endpoint is not available in production.",
        request_id: "req_01HZ9ABCDEF",
      },
    });
  });
});
