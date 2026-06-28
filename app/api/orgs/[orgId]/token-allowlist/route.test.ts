/**
 * @jest-environment node
 *
 * Per-org token allowlist routes — integration tests
 *
 * Covers:
 *   GET    /api/orgs/:orgId/token-allowlist
 *   PUT    /api/orgs/:orgId/token-allowlist
 *   POST   /api/orgs/:orgId/token-allowlist
 *   DELETE /api/orgs/:orgId/token-allowlist
 *
 * Also covers stream creation (POST /api/streams) enforcing the org allowlist.
 */

import { _resetOrgDbForTesting, orgDb } from "@/app/lib/org-db";
import { _resetAllowlistForTesting } from "@/app/lib/token-allowlist";
import {
  GET,
  PUT,
  POST,
  DELETE,
} from "@/app/api/orgs/[orgId]/token-allowlist/route";
import { POST as createStream } from "@/app/api/streams/route";
import { resetDb } from "@/app/lib/db";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const OWNER_ADDR    = "GOWNER7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW";
const PAUSER_ADDR   = "GPAUSER75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7G";
const USDC_ISSUER   = "GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW";
const USDC          = `USDC:${USDC_ISSUER}`;
const EURC_ISSUER   = "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPPA";
const EURC          = `EURC:${EURC_ISSUER}`;
const VALID_STELLAR = "GDSBCG3OKHCMMWS5EBH2X7XOYTJRWXN2YYQPCNS5OFBU4IDO4X7OFSQA";

type Ctx = { params: Promise<{ orgId: string }> };

function ctx(orgId: string): Ctx {
  return { params: Promise.resolve({ orgId }) };
}

function makeRequest(
  method: string,
  body?: unknown,
  actorAddress?: string,
): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (actorAddress) headers["Actor-Wallet-Address"] = actorAddress;
  return new Request("http://localhost/api/orgs/org-acme/token-allowlist", {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  _resetOrgDbForTesting();
  _resetAllowlistForTesting();
  resetDb();
});

// ─── GET ──────────────────────────────────────────────────────────────────────

describe("GET /api/orgs/:orgId/token-allowlist", () => {
  it("returns 200 with the org's token list", async () => {
    const res = await GET(makeRequest("GET"), ctx("org-acme"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.orgId).toBe("org-acme");
    expect(Array.isArray(body.data.tokens)).toBe(true);
    expect(body.data.enabled).toBe(true); // org-acme has XLM + USDC seeded
  });

  it("returns enabled=false and empty tokens for org with no list (org-beta)", async () => {
    const res = await GET(makeRequest("GET"), ctx("org-beta"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.tokens).toEqual([]);
    expect(body.data.enabled).toBe(false);
  });

  it("returns 404 for unknown org", async () => {
    const res = await GET(makeRequest("GET"), ctx("org-does-not-exist"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("ORG_NOT_FOUND");
  });

  it("response contains links.self", async () => {
    const res = await GET(makeRequest("GET"), ctx("org-acme"));
    const body = await res.json();
    expect(body.links.self).toBe("/api/orgs/org-acme/token-allowlist");
  });
});

// ─── PUT ──────────────────────────────────────────────────────────────────────

describe("PUT /api/orgs/:orgId/token-allowlist", () => {
  it("replaces the entire list and returns 200", async () => {
    const req = makeRequest("PUT", { tokens: ["XLM", EURC] }, OWNER_ADDR);
    const res = await PUT(req, ctx("org-acme"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.tokens).toContain("XLM");
    expect(body.data.tokens).toContain(`EURC:${EURC_ISSUER}`);
  });

  it("an empty array disables the per-org list (enabled=false)", async () => {
    const req = makeRequest("PUT", { tokens: [] }, OWNER_ADDR);
    const res = await PUT(req, ctx("org-acme"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.tokens).toEqual([]);
    expect(body.data.enabled).toBe(false);
  });

  it("deduplicates tokens", async () => {
    const req = makeRequest("PUT", { tokens: ["XLM", "xlm", "native"] }, OWNER_ADDR);
    const res = await PUT(req, ctx("org-acme"));
    const body = await res.json();
    expect(body.data.tokens.filter((t: string) => t === "XLM")).toHaveLength(1);
  });

  it("returns 403 when caller is not an owner (pauser role)", async () => {
    const req = makeRequest("PUT", { tokens: ["XLM"] }, PAUSER_ADDR);
    const res = await PUT(req, ctx("org-acme"));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  it("returns 403 when no actor address is provided", async () => {
    const req = makeRequest("PUT", { tokens: ["XLM"] });
    const res = await PUT(req, ctx("org-acme"));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("ACTOR_REQUIRED");
  });

  it("returns 422 when tokens field is missing", async () => {
    const req = makeRequest("PUT", { wrong: "field" }, OWNER_ADDR);
    const res = await PUT(req, ctx("org-acme"));
    expect(res.status).toBe(422);
  });

  it("returns 422 when tokens contains a non-string", async () => {
    const req = makeRequest("PUT", { tokens: ["XLM", 42] }, OWNER_ADDR);
    const res = await PUT(req, ctx("org-acme"));
    expect(res.status).toBe(422);
  });

  it("returns 422 for a malformed token in the list", async () => {
    const req = makeRequest("PUT", { tokens: ["XLM", "INVALID:::FORMAT"] }, OWNER_ADDR);
    const res = await PUT(req, ctx("org-acme"));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("INVALID_TOKEN");
  });

  it("returns 404 for unknown org", async () => {
    const req = makeRequest("PUT", { tokens: ["XLM"] }, OWNER_ADDR);
    const res = await PUT(req, ctx("no-such-org"));
    expect(res.status).toBe(404);
  });

  it("persists the change (GET returns updated list)", async () => {
    await PUT(makeRequest("PUT", { tokens: [EURC] }, OWNER_ADDR), ctx("org-acme"));
    const getRes = await GET(makeRequest("GET"), ctx("org-acme"));
    const body = await getRes.json();
    expect(body.data.tokens).toContain(`EURC:${EURC_ISSUER}`);
    expect(body.data.tokens).not.toContain("XLM");
  });
});

// ─── POST ─────────────────────────────────────────────────────────────────────

describe("POST /api/orgs/:orgId/token-allowlist", () => {
  it("adds a new token and returns 201", async () => {
    const req = makeRequest("POST", { token: EURC }, OWNER_ADDR);
    const res = await POST(req, ctx("org-acme"));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.tokens).toContain(`EURC:${EURC_ISSUER}`);
    expect(body.data.added).toBe(true);
  });

  it("is idempotent — adding an existing token returns 200 and added=false", async () => {
    const req = makeRequest("POST", { token: "XLM" }, OWNER_ADDR);
    const res = await POST(req, ctx("org-acme"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.added).toBe(false);
  });

  it("normalises token on add (xlm → XLM)", async () => {
    // org-acme already has XLM; adding "native" should be idempotent
    const req = makeRequest("POST", { token: "native" }, OWNER_ADDR);
    const res = await POST(req, ctx("org-acme"));
    expect(res.status).toBe(200);
    expect((await res.json()).data.added).toBe(false);
  });

  it("returns 403 when caller is not an owner", async () => {
    const req = makeRequest("POST", { token: EURC }, PAUSER_ADDR);
    const res = await POST(req, ctx("org-acme"));
    expect(res.status).toBe(403);
  });

  it("returns 403 when no actor address header", async () => {
    const req = makeRequest("POST", { token: EURC });
    const res = await POST(req, ctx("org-acme"));
    expect(res.status).toBe(403);
  });

  it("returns 422 when token field is missing", async () => {
    const req = makeRequest("POST", {}, OWNER_ADDR);
    const res = await POST(req, ctx("org-acme"));
    expect(res.status).toBe(422);
  });

  it("returns 422 for malformed token", async () => {
    const req = makeRequest("POST", { token: "BAD:::KEY" }, OWNER_ADDR);
    const res = await POST(req, ctx("org-acme"));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("INVALID_TOKEN");
  });

  it("returns 404 for unknown org", async () => {
    const req = makeRequest("POST", { token: "XLM" }, OWNER_ADDR);
    const res = await POST(req, ctx("no-such-org"));
    expect(res.status).toBe(404);
  });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────

describe("DELETE /api/orgs/:orgId/token-allowlist", () => {
  it("removes an existing token and returns 200 with removed=true", async () => {
    const req = makeRequest("DELETE", { token: "XLM" }, OWNER_ADDR);
    const res = await DELETE(req, ctx("org-acme"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.removed).toBe(true);
    expect(body.data.tokens).not.toContain("XLM");
  });

  it("is idempotent — removing an absent token returns removed=false", async () => {
    const req = makeRequest("DELETE", { token: EURC }, OWNER_ADDR);
    const res = await DELETE(req, ctx("org-acme"));
    expect(res.status).toBe(200);
    expect((await res.json()).data.removed).toBe(false);
  });

  it("disables the per-org list when last token is removed (enabled=false)", async () => {
    // org-acme has XLM and USDC; remove both
    await DELETE(makeRequest("DELETE", { token: "XLM" }, OWNER_ADDR), ctx("org-acme"));
    const res = await DELETE(makeRequest("DELETE", { token: USDC }, OWNER_ADDR), ctx("org-acme"));
    const body = await res.json();
    expect(body.data.tokens).toEqual([]);
    expect(body.data.enabled).toBe(false);
  });

  it("returns 403 when caller is not an owner", async () => {
    const req = makeRequest("DELETE", { token: "XLM" }, PAUSER_ADDR);
    const res = await DELETE(req, ctx("org-acme"));
    expect(res.status).toBe(403);
  });

  it("returns 403 when no actor address header", async () => {
    const req = makeRequest("DELETE", { token: "XLM" });
    const res = await DELETE(req, ctx("org-acme"));
    expect(res.status).toBe(403);
  });

  it("returns 422 when token field is missing", async () => {
    const req = makeRequest("DELETE", {}, OWNER_ADDR);
    const res = await DELETE(req, ctx("org-acme"));
    expect(res.status).toBe(422);
  });

  it("returns 422 for malformed token", async () => {
    const req = makeRequest("DELETE", { token: "BAD:::KEY" }, OWNER_ADDR);
    const res = await DELETE(req, ctx("org-acme"));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("INVALID_TOKEN");
  });

  it("returns 404 for unknown org", async () => {
    const req = makeRequest("DELETE", { token: "XLM" }, OWNER_ADDR);
    const res = await DELETE(req, ctx("no-such-org"));
    expect(res.status).toBe(404);
  });
});

// ─── Stream creation respects per-org allowlist ───────────────────────────────

describe("POST /api/streams — per-org token allowlist enforcement", () => {
  function streamRequest(body: unknown) {
    return new Request("http://localhost/api/streams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("accepts a token in the org's allowlist", async () => {
    // org-acme has XLM in its list
    const res = await createStream(
      streamRequest({
        recipient: VALID_STELLAR,
        rate: "10",
        schedule: "month",
        token: "XLM",
        orgId: "org-acme",
      }),
    );
    expect(res.status).toBe(201);
  });

  it("accepts USDC which is in org-acme's allowlist", async () => {
    const res = await createStream(
      streamRequest({
        recipient: VALID_STELLAR,
        rate: "10",
        schedule: "month",
        token: USDC,
        orgId: "org-acme",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.token).toBe(`USDC:${USDC_ISSUER}`);
  });

  it("rejects a token not in the org's allowlist (EURC blocked by org-acme)", async () => {
    const res = await createStream(
      streamRequest({
        recipient: VALID_STELLAR,
        rate: "10",
        schedule: "month",
        token: EURC,
        orgId: "org-acme",
      }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("TOKEN_NOT_ALLOWED");
    expect(body.error.message).toContain("org's accepted token list");
  });

  it("falls back to global (open) mode for org-beta which has no list", async () => {
    // org-beta has no per-org allowlist; global is disabled → open mode
    const res = await createStream(
      streamRequest({
        recipient: VALID_STELLAR,
        rate: "10",
        schedule: "month",
        token: EURC,
        orgId: "org-beta",
      }),
    );
    expect(res.status).toBe(201);
  });

  it("falls back to global (open) mode when no orgId is provided", async () => {
    const res = await createStream(
      streamRequest({
        recipient: VALID_STELLAR,
        rate: "10",
        schedule: "month",
        token: EURC,
        // no orgId — individually owned stream
      }),
    );
    expect(res.status).toBe(201);
  });

  it("org-acme starts accepting EURC after it is added to the list", async () => {
    // First: EURC is rejected
    const before = await createStream(
      streamRequest({ recipient: VALID_STELLAR, rate: "5", schedule: "day", token: EURC, orgId: "org-acme" }),
    );
    expect(before.status).toBe(422);

    // Owner adds EURC
    await POST(makeRequest("POST", { token: EURC }, OWNER_ADDR), ctx("org-acme"));

    // Now EURC is accepted
    const after = await createStream(
      streamRequest({ recipient: VALID_STELLAR, rate: "5", schedule: "day", token: EURC, orgId: "org-acme" }),
    );
    expect(after.status).toBe(201);
  });

  it("org-acme stops accepting XLM after it is removed from the list", async () => {
    // First: XLM is accepted
    const before = await createStream(
      streamRequest({ recipient: VALID_STELLAR, rate: "5", schedule: "day", token: "XLM", orgId: "org-acme" }),
    );
    expect(before.status).toBe(201);

    // Owner removes XLM (USDC is still in the list so list stays enabled)
    await DELETE(makeRequest("DELETE", { token: "XLM" }, OWNER_ADDR), ctx("org-acme"));

    // Now XLM is rejected
    const after = await createStream(
      streamRequest({ recipient: VALID_STELLAR, rate: "5", schedule: "day", token: "XLM", orgId: "org-acme" }),
    );
    expect(after.status).toBe(422);
    expect((await after.json()).error.code).toBe("TOKEN_NOT_ALLOWED");
  });
});

// ─── Cross-org isolation ──────────────────────────────────────────────────────

describe("per-org allowlist isolation", () => {
  it("org-acme owner cannot manage org-beta's allowlist", async () => {
    const req = makeRequest("PUT", { tokens: ["XLM"] }, OWNER_ADDR);
    // org-acme OWNER_ADDR is not a member of org-beta at all
    const res = await PUT(req, ctx("org-beta"));
    expect(res.status).toBe(403);
  });

  it("org-beta owner can manage org-beta's allowlist", async () => {
    const BETA_OWNER = "GBETA7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRWA";
    const req = makeRequest("PUT", { tokens: ["XLM"] }, BETA_OWNER);
    const res = await PUT(req, ctx("org-beta"));
    expect(res.status).toBe(200);
    expect((await res.json()).data.tokens).toContain("XLM");
  });

  it("org-acme and org-beta allowlists are independent", async () => {
    const BETA_OWNER = "GBETA7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRWA";

    // Set org-beta list to only EURC
    await PUT(makeRequest("PUT", { tokens: [EURC] }, BETA_OWNER), ctx("org-beta"));

    // org-acme list unchanged (still has XLM + USDC from seed)
    const acmeGet = await GET(makeRequest("GET"), ctx("org-acme"));
    const acmeBody = await acmeGet.json();
    expect(acmeBody.data.tokens).toContain("XLM");
    expect(acmeBody.data.tokens).not.toContain(`EURC:${EURC_ISSUER}`);

    // org-beta list is EURC only
    const betaGet = await GET(makeRequest("GET"), ctx("org-beta"));
    const betaBody = await betaGet.json();
    expect(betaBody.data.tokens).toContain(`EURC:${EURC_ISSUER}`);
    expect(betaBody.data.tokens).not.toContain("XLM");
  });
});
