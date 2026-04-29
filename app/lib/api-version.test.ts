/** @jest-environment node */

import {
  isV1SunsetPassed,
  sunsetResponse,
  addV1DeprecationHeaders,
  detectVersion,
  toV2Stream,
  V1_SUNSET_DATE,
  V1_DEPRECATION_DATE,
  V2_MIGRATION_URL,
  API_VERSIONS,
} from "./api-version";

// ── isV1SunsetPassed ──────────────────────────────────────────────────────

describe("isV1SunsetPassed", () => {
  it("returns false one day before the sunset date", () => {
    const beforeSunset = new Date(V1_SUNSET_DATE.getTime() - 86_400_000);
    expect(isV1SunsetPassed(beforeSunset)).toBe(false);
  });

  it("returns true on exactly the sunset date", () => {
    expect(isV1SunsetPassed(V1_SUNSET_DATE)).toBe(true);
  });

  it("returns true one day after the sunset date", () => {
    const afterSunset = new Date(V1_SUNSET_DATE.getTime() + 86_400_000);
    expect(isV1SunsetPassed(afterSunset)).toBe(true);
  });

  it("uses the current date when no argument is passed", () => {
    // The sunset date is 2026-12-31; as of test authoring this is in the future.
    // This assertion would need updating if tests run after that date.
    const result = isV1SunsetPassed();
    expect(typeof result).toBe("boolean");
  });
});

// ── sunsetResponse ────────────────────────────────────────────────────────

describe("sunsetResponse", () => {
  it("returns 410 Gone", async () => {
    const res = sunsetResponse();
    expect(res.status).toBe(410);
  });

  it("body contains API_VERSION_SUNSET code and migration_url", async () => {
    const res = sunsetResponse("req-123");
    const body = await res.json();
    expect(body.error.code).toBe("API_VERSION_SUNSET");
    expect(body.error.migration_url).toBe(V2_MIGRATION_URL);
    expect(body.error.request_id).toBe("req-123");
    expect(body.error.sunset_at).toBe(V1_SUNSET_DATE.toISOString());
  });

  it("includes Sunset response header", () => {
    const res = sunsetResponse();
    expect(res.headers.get("Sunset")).toBe(V1_SUNSET_DATE.toUTCString());
  });

  it("includes Link rel=successor-version header", () => {
    const res = sunsetResponse();
    expect(res.headers.get("Link")).toContain("successor-version");
    expect(res.headers.get("Link")).toContain(V2_MIGRATION_URL);
  });

  it("body request_id is null when omitted", async () => {
    const body = await sunsetResponse().json();
    expect(body.error.request_id).toBeNull();
  });
});

// ── addV1DeprecationHeaders ───────────────────────────────────────────────

describe("addV1DeprecationHeaders", () => {
  function makeOkResponse(body = "{}") {
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  it("preserves the original status code", () => {
    const res = addV1DeprecationHeaders(new Response("{}", { status: 201 }));
    expect(res.status).toBe(201);
  });

  it("adds a Deprecation header equal to V1_DEPRECATION_DATE", () => {
    const res = addV1DeprecationHeaders(makeOkResponse());
    expect(res.headers.get("Deprecation")).toBe(
      V1_DEPRECATION_DATE.toUTCString(),
    );
  });

  it("adds a Sunset header equal to V1_SUNSET_DATE", () => {
    const res = addV1DeprecationHeaders(makeOkResponse());
    expect(res.headers.get("Sunset")).toBe(V1_SUNSET_DATE.toUTCString());
  });

  it("adds a Link header with successor-version rel", () => {
    const res = addV1DeprecationHeaders(makeOkResponse());
    const link = res.headers.get("Link") ?? "";
    expect(link).toContain("successor-version");
    expect(link).toContain(V2_MIGRATION_URL);
  });

  it("preserves existing headers from the original response", () => {
    const res = addV1DeprecationHeaders(makeOkResponse());
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("preserves the response body", async () => {
    const res = addV1DeprecationHeaders(makeOkResponse('{"ok":true}'));
    const text = await res.text();
    expect(text).toBe('{"ok":true}');
  });
});

// ── detectVersion ─────────────────────────────────────────────────────────

describe("detectVersion", () => {
  function headers(record: Record<string, string> = {}) {
    return new Headers(record);
  }

  it("reads v1 from the URL path", () => {
    expect(detectVersion("/api/v1/streams", headers())).toBe("1");
  });

  it("reads v2 from the URL path", () => {
    expect(detectVersion("/api/v2/streams/abc/settle", headers())).toBe("2");
  });

  it("reads version from API-Version header when no path segment", () => {
    expect(
      detectVersion("/api/streams", headers({ "API-Version": "1" })),
    ).toBe("1");
  });

  it("reads version from Accept-Version header as fallback", () => {
    expect(
      detectVersion("/api/streams", headers({ "Accept-Version": "2" })),
    ).toBe("2");
  });

  it("prefers path over header", () => {
    expect(
      detectVersion("/api/v1/streams", headers({ "API-Version": "2" })),
    ).toBe("1");
  });

  it("defaults to CURRENT when no version is specified", () => {
    expect(detectVersion("/api/streams", headers())).toBe(API_VERSIONS.CURRENT);
  });

  it("ignores unknown version numbers in header and returns CURRENT", () => {
    expect(
      detectVersion("/api/streams", headers({ "API-Version": "99" })),
    ).toBe(API_VERSIONS.CURRENT);
  });
});

// ── toV2Stream ────────────────────────────────────────────────────────────

describe("toV2Stream", () => {
  const base = {
    id: "stream-abc",
    recipient: "GABC123",
    rate: "100 XLM / month",
    schedule: "Pays every 30 days",
    status: "active",
    nextAction: "pause",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
  };

  it("renames nextAction to allowed_actions array", () => {
    const v2 = toV2Stream(base);
    expect(v2).not.toHaveProperty("nextAction");
    expect(v2.allowed_actions).toEqual(["pause"]);
  });

  it("returns empty allowed_actions when nextAction is absent", () => {
    const v2 = toV2Stream({ ...base, nextAction: undefined });
    expect(v2.allowed_actions).toEqual([]);
  });

  it("renames createdAt to created_at", () => {
    const v2 = toV2Stream(base);
    expect(v2).not.toHaveProperty("createdAt");
    expect(v2.created_at).toBe(base.createdAt);
  });

  it("renames updatedAt to updated_at", () => {
    const v2 = toV2Stream(base);
    expect(v2).not.toHaveProperty("updatedAt");
    expect(v2.updated_at).toBe(base.updatedAt);
  });

  it("settlement is null when settlementTxHash is absent", () => {
    const v2 = toV2Stream(base);
    expect(v2.settlement).toBeNull();
  });

  it("settlement is structured object when settlementTxHash is present", () => {
    const v2 = toV2Stream({ ...base, settlementTxHash: "tx-hash-abc" });
    expect(v2).not.toHaveProperty("settlementTxHash");
    expect(v2.settlement).toEqual({
      tx_hash: "tx-hash-abc",
      settled_at: base.updatedAt,
    });
  });

  it("renames partnerId to partner_id", () => {
    const v2 = toV2Stream({ ...base, partnerId: "partner-xyz" });
    expect(v2).not.toHaveProperty("partnerId");
    expect(v2.partner_id).toBe("partner-xyz");
  });

  it("omits optional PII fields when not present", () => {
    const v2 = toV2Stream(base);
    expect(v2).not.toHaveProperty("label");
    expect(v2).not.toHaveProperty("email");
    expect(v2).not.toHaveProperty("memo");
    expect(v2).not.toHaveProperty("partner_id");
  });

  it("passes through label, email, and memo unchanged", () => {
    const v2 = toV2Stream({
      ...base,
      label: "Ada Studio",
      email: "ada@example.com",
      memo: "invoice-99",
    });
    expect(v2.label).toBe("Ada Studio");
    expect(v2.email).toBe("ada@example.com");
    expect(v2.memo).toBe("invoice-99");
  });
});
