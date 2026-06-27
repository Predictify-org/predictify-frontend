/** @jest-environment node */

import jwt from "jsonwebtoken";
import {
  _resetAdminStateForTesting,
  checkNotPaused,
  getAdminAddress,
  getAdminState,
  isPaused,
  requireAdmin,
  resolveCallerAddress,
  setAdmin,
  setPaused,
} from "@/app/lib/admin-guard";
import { JWT_AUDIENCE, JWT_ISSUER, JWT_SECRET, signToken } from "@/app/lib/auth";

const ADMIN = "GADMIN_DEV_PLACEHOLDER_DO_NOT_USE_IN_PROD";
const OTHER = "GOTHER000000000000000000000000000000000000000000000000000000";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/admin/pause", { headers });
}

function makeAuthRequest(walletAddress: string): Request {
  return makeRequest({ Authorization: `Bearer ${signToken(walletAddress)}` });
}

beforeEach(() => {
  _resetAdminStateForTesting();
});

// ── isPaused / getAdminAddress / getAdminState ────────────────────────────────

describe("view helpers", () => {
  it("isPaused returns false by default", () => {
    expect(isPaused()).toBe(false);
  });

  it("getAdminAddress returns the seeded admin", () => {
    expect(getAdminAddress()).toBe(ADMIN);
  });

  it("getAdminState snapshot is a copy, not the live object", () => {
    const snap = getAdminState();
    expect(snap.paused).toBe(false);
    expect(snap.adminAddress).toBe(ADMIN);
    // Mutating the snapshot does not affect live state
    (snap as { paused: boolean }).paused = true;
    expect(isPaused()).toBe(false);
  });
});

// ── resolveCallerAddress ──────────────────────────────────────────────────────

describe("resolveCallerAddress", () => {
  it("returns null when no auth header and no actor header", () => {
    expect(resolveCallerAddress(makeRequest())).toBeNull();
  });

  it("returns address from valid JWT sub claim", () => {
    const req = makeAuthRequest(ADMIN);
    expect(resolveCallerAddress(req)).toBe(ADMIN);
  });

  it("returns null for expired JWT", () => {
    const token = jwt.sign(
      { sub: ADMIN, iss: JWT_ISSUER, aud: JWT_AUDIENCE },
      JWT_SECRET,
      { expiresIn: -1, algorithm: "HS256" },
    );
    const req = makeRequest({ Authorization: `Bearer ${token}` });
    expect(resolveCallerAddress(req)).toBeNull();
  });

  it("returns null for JWT signed with wrong secret", () => {
    const token = jwt.sign(
      { sub: ADMIN, iss: JWT_ISSUER, aud: JWT_AUDIENCE },
      "wrong-secret-that-is-long-enough-for-validation",
      { expiresIn: "15m", algorithm: "HS256" },
    );
    const req = makeRequest({ Authorization: `Bearer ${token}` });
    expect(resolveCallerAddress(req)).toBeNull();
  });

  it("returns null for JWT with tampered payload (alg=none bypass attempt)", () => {
    // Craft a token with alg=none — should be rejected
    const [header64] = jwt.sign({ sub: ADMIN }, JWT_SECRET, { algorithm: "HS256" }).split(".");
    const fakeHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload    = Buffer.from(JSON.stringify({ sub: ADMIN, iss: JWT_ISSUER, aud: JWT_AUDIENCE })).toString("base64url");
    const noneToken  = `${fakeHeader}.${payload}.`;
    const req = makeRequest({ Authorization: `Bearer ${noneToken}` });
    expect(resolveCallerAddress(req)).toBeNull();
  });

  it("returns null for JWT missing sub claim", () => {
    const token = jwt.sign(
      { iss: JWT_ISSUER, aud: JWT_AUDIENCE },
      JWT_SECRET,
      { expiresIn: "15m", algorithm: "HS256" },
    );
    const req = makeRequest({ Authorization: `Bearer ${token}` });
    expect(resolveCallerAddress(req)).toBeNull();
  });

  it("returns null for JWT with wrong issuer", () => {
    const token = jwt.sign(
      { sub: ADMIN, iss: "evil-issuer", aud: JWT_AUDIENCE },
      JWT_SECRET,
      { expiresIn: "15m", algorithm: "HS256" },
    );
    const req = makeRequest({ Authorization: `Bearer ${token}` });
    expect(resolveCallerAddress(req)).toBeNull();
  });

  it("returns null for JWT with wrong audience", () => {
    const token = jwt.sign(
      { sub: ADMIN, iss: JWT_ISSUER, aud: "wrong-audience" },
      JWT_SECRET,
      { expiresIn: "15m", algorithm: "HS256" },
    );
    const req = makeRequest({ Authorization: `Bearer ${token}` });
    expect(resolveCallerAddress(req)).toBeNull();
  });

  it("returns address from Actor-Wallet-Address header when no JWT", () => {
    const req = makeRequest({ "Actor-Wallet-Address": ADMIN });
    expect(resolveCallerAddress(req)).toBe(ADMIN);
  });

  it("trims whitespace from Actor-Wallet-Address header", () => {
    const req = makeRequest({ "Actor-Wallet-Address": `  ${ADMIN}  ` });
    expect(resolveCallerAddress(req)).toBe(ADMIN);
  });

  it("JWT sub takes precedence over Actor-Wallet-Address header", () => {
    const token = signToken(ADMIN);
    const req = makeRequest({
      Authorization: `Bearer ${token}`,
      "Actor-Wallet-Address": OTHER,
    });
    expect(resolveCallerAddress(req)).toBe(ADMIN);
  });
});

// ── requireAdmin ──────────────────────────────────────────────────────────────

describe("requireAdmin", () => {
  it("returns admin address for valid admin JWT", () => {
    const result = requireAdmin(makeAuthRequest(ADMIN));
    expect(result).toBe(ADMIN);
  });

  it("returns 403 when no credentials provided", async () => {
    const result = requireAdmin(makeRequest());
    expect(result).toBeInstanceOf(Response);
    const body = await (result as Response).json();
    expect((result as Response).status).toBe(403);
    expect(body.error.code).toBe("Unauthorized");
  });

  it("returns 403 when caller is not the admin", async () => {
    const result = requireAdmin(makeAuthRequest(OTHER));
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it("returns 403 for expired token", async () => {
    const token = jwt.sign(
      { sub: ADMIN, iss: JWT_ISSUER, aud: JWT_AUDIENCE },
      JWT_SECRET,
      { expiresIn: -1, algorithm: "HS256" },
    );
    const result = requireAdmin(makeRequest({ Authorization: `Bearer ${token}` }));
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it("returns 403 for tampered claims (sub swapped to admin after signing as other)", async () => {
    // Sign as OTHER, then manually patch the payload — signature won't match
    const [h, , s] = signToken(OTHER).split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: ADMIN, iss: JWT_ISSUER, aud: JWT_AUDIENCE, exp: Date.now() / 1000 + 900 }),
    ).toString("base64url");
    const tamperedToken = `${h}.${tamperedPayload}.${s}`;
    const result = requireAdmin(makeRequest({ Authorization: `Bearer ${tamperedToken}` }));
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it("returns 403 for missing scope (no sub in token)", async () => {
    const token = jwt.sign(
      { iss: JWT_ISSUER, aud: JWT_AUDIENCE, role: "admin" },
      JWT_SECRET,
      { expiresIn: "15m", algorithm: "HS256" },
    );
    const result = requireAdmin(makeRequest({ Authorization: `Bearer ${token}` }));
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });
});

// ── setPaused ─────────────────────────────────────────────────────────────────

describe("setPaused", () => {
  it("admin can pause the contract", () => {
    const result = setPaused(makeAuthRequest(ADMIN), true);
    expect(result).not.toBeInstanceOf(Response);
    expect((result as { paused: boolean }).paused).toBe(true);
    expect(isPaused()).toBe(true);
  });

  it("admin can unpause the contract", () => {
    setPaused(makeAuthRequest(ADMIN), true);
    setPaused(makeAuthRequest(ADMIN), false);
    expect(isPaused()).toBe(false);
  });

  it("returns 403 when non-admin attempts to pause", async () => {
    const result = setPaused(makeAuthRequest(OTHER), true);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
    expect(isPaused()).toBe(false); // state unchanged
  });

  it("returns 403 when unauthenticated request attempts to pause", async () => {
    const result = setPaused(makeRequest(), true);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
    expect(isPaused()).toBe(false);
  });

  it("records pausedAt timestamp on toggle", () => {
    setPaused(makeAuthRequest(ADMIN), true);
    expect(getAdminState().pausedAt).not.toBeNull();
  });
});

// ── setAdmin ──────────────────────────────────────────────────────────────────

describe("setAdmin", () => {
  it("admin can rotate to a new address", () => {
    const result = setAdmin(makeAuthRequest(ADMIN), OTHER);
    expect(result).not.toBeInstanceOf(Response);
    expect(getAdminAddress()).toBe(OTHER);
  });

  it("returns 403 when non-admin attempts rotation", async () => {
    const result = setAdmin(makeAuthRequest(OTHER), OTHER);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
    expect(getAdminAddress()).toBe(ADMIN);
  });

  it("returns 400 when newAdmin is empty string", async () => {
    const result = setAdmin(makeAuthRequest(ADMIN), "");
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
    expect(getAdminAddress()).toBe(ADMIN);
  });

  it("returns 400 when newAdmin is whitespace only", async () => {
    const result = setAdmin(makeAuthRequest(ADMIN), "   ");
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  it("trims whitespace from new admin address", () => {
    const result = setAdmin(makeAuthRequest(ADMIN), `  ${OTHER}  `);
    expect(result).not.toBeInstanceOf(Response);
    expect(getAdminAddress()).toBe(OTHER);
  });

  it("old admin token is rejected after rotation", async () => {
    setAdmin(makeAuthRequest(ADMIN), OTHER);
    // Original admin token is now for a non-admin address
    const result = setPaused(makeAuthRequest(ADMIN), true);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it("records adminRotatedAt timestamp on rotation", () => {
    setAdmin(makeAuthRequest(ADMIN), OTHER);
    expect(getAdminState().adminRotatedAt).not.toBeNull();
  });
});

// ── checkNotPaused ────────────────────────────────────────────────────────────

describe("checkNotPaused", () => {
  it("returns null when not paused", () => {
    expect(checkNotPaused("create_stream")).toBeNull();
  });

  it("returns 503 when paused", async () => {
    setPaused(makeAuthRequest(ADMIN), true);
    const result = checkNotPaused("create_stream");
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(503);
    const body = await (result as Response).json();
    expect(body.error.code).toBe("ContractPaused");
    expect(body.error.message).toContain("create_stream");
  });

  it("includes the operation name in the error message", async () => {
    setPaused(makeAuthRequest(ADMIN), true);
    const result = checkNotPaused("withdraw");
    const body = await (result as Response).json();
    expect(body.error.message).toContain("withdraw");
  });

  it("returns null again after unpause", () => {
    setPaused(makeAuthRequest(ADMIN), true);
    setPaused(makeAuthRequest(ADMIN), false);
    expect(checkNotPaused("create_stream")).toBeNull();
  });
});
