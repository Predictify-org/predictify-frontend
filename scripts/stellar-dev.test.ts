// scripts/stellar-dev.test.ts
// Tests for stellar-dev script logic: prod guard, env validation, keypair helpers, fixtures.
// Coverage target: 100% of stellar-dev-lib.js

import {
  checkProdGuard,
  validateEnv,
  parseKeypair,
  isValidStellarPublicKey,
  isValidStellarSecretKey,
  buildFixturePayloads,
} from "./stellar-dev-lib";

// ── checkProdGuard ───────────────────────────────────────────────────────────────

describe("checkProdGuard", () => {
  it("returns an error message when NODE_ENV is production", () => {
    const result = checkProdGuard("production");
    expect(result).not.toBeNull();
    expect(result).toMatch(/production/i);
  });

  it("returns null for development", () => {
    expect(checkProdGuard("development")).toBeNull();
  });

  it("returns null for test", () => {
    expect(checkProdGuard("test")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(checkProdGuard(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(checkProdGuard("")).toBeNull();
  });

  it("is case-sensitive: 'Production' is not blocked", () => {
    // Only exact lowercase 'production' is blocked (matches bash NODE_ENV convention)
    expect(checkProdGuard("Production")).toBeNull();
  });
});

// ── validateEnv ─────────────────────────────────────────────────────────────────

describe("validateEnv", () => {
  it("returns empty array when all required vars are present", () => {
    const missing = validateEnv({ NEXT_PUBLIC_API_URL: "http://localhost:4000" });
    expect(missing).toHaveLength(0);
  });

  it("reports NEXT_PUBLIC_API_URL as missing when absent", () => {
    const missing = validateEnv({});
    expect(missing).toContain("NEXT_PUBLIC_API_URL");
  });

  it("reports NEXT_PUBLIC_API_URL as missing when empty string", () => {
    const missing = validateEnv({ NEXT_PUBLIC_API_URL: "" });
    expect(missing).toContain("NEXT_PUBLIC_API_URL");
  });

  it("does not report extra unknown vars", () => {
    const missing = validateEnv({
      NEXT_PUBLIC_API_URL: "http://localhost:4000",
      SOME_EXTRA_VAR: "value",
    });
    expect(missing).toHaveLength(0);
  });
});

// ── parseKeypair ─────────────────────────────────────────────────────────────────

describe("parseKeypair", () => {
  it("splits a valid SECRET:PUBLIC string", () => {
    const kp = parseKeypair("SAAAA:GBBBB");
    expect(kp.secretKey).toBe("SAAAA");
    expect(kp.publicKey).toBe("GBBBB");
  });

  it("handles colons in the public key portion", () => {
    // Only the first colon is the separator
    const kp = parseKeypair("SKEY:GKEY:extra");
    expect(kp.secretKey).toBe("SKEY");
    expect(kp.publicKey).toBe("GKEY:extra");
  });

  it("throws when no colon is present", () => {
    expect(() => parseKeypair("INVALIDNOCODON")).toThrow(/Invalid keypair format/);
  });
});

// ── isValidStellarPublicKey ──────────────────────────────────────────────────────

describe("isValidStellarPublicKey", () => {
  const VALID_PUBLIC = "G" + "A".repeat(55); // 56 chars starting with G

  it("accepts a 56-char key starting with G", () => {
    expect(isValidStellarPublicKey(VALID_PUBLIC)).toBe(true);
  });

  it("rejects a key not starting with G", () => {
    expect(isValidStellarPublicKey("S" + "A".repeat(55))).toBe(false);
  });

  it("rejects a key shorter than 56 chars", () => {
    expect(isValidStellarPublicKey("G" + "A".repeat(54))).toBe(false);
  });

  it("rejects a key longer than 56 chars", () => {
    expect(isValidStellarPublicKey("G" + "A".repeat(56))).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidStellarPublicKey(null as unknown as string)).toBe(false);
    expect(isValidStellarPublicKey(undefined as unknown as string)).toBe(false);
    expect(isValidStellarPublicKey(123 as unknown as string)).toBe(false);
  });
});

// ── isValidStellarSecretKey ──────────────────────────────────────────────────────

describe("isValidStellarSecretKey", () => {
  const VALID_SECRET = "S" + "A".repeat(55); // 56 chars starting with S

  it("accepts a 56-char key starting with S", () => {
    expect(isValidStellarSecretKey(VALID_SECRET)).toBe(true);
  });

  it("rejects a key not starting with S", () => {
    expect(isValidStellarSecretKey("G" + "A".repeat(55))).toBe(false);
  });

  it("rejects a key shorter than 56 chars", () => {
    expect(isValidStellarSecretKey("S" + "A".repeat(54))).toBe(false);
  });

  it("rejects a key longer than 56 chars", () => {
    expect(isValidStellarSecretKey("S" + "A".repeat(56))).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidStellarSecretKey(null as unknown as string)).toBe(false);
    expect(isValidStellarSecretKey(undefined as unknown as string)).toBe(false);
  });
});

// ── buildFixturePayloads ─────────────────────────────────────────────────────────

describe("buildFixturePayloads", () => {
  const SENDER = "G" + "A".repeat(55);

  it("returns exactly 3 fixture streams", () => {
    const payloads = buildFixturePayloads(SENDER);
    expect(payloads).toHaveLength(3);
  });

  it("sets sender on every payload", () => {
    const payloads = buildFixturePayloads(SENDER);
    for (const p of payloads) {
      expect(p.sender).toBe(SENDER);
    }
  });

  it("all payloads have required fields", () => {
    const payloads = buildFixturePayloads(SENDER);
    for (const p of payloads) {
      expect(p).toHaveProperty("sender");
      expect(p).toHaveProperty("recipient");
      expect(p).toHaveProperty("amount");
      expect(p).toHaveProperty("asset");
      expect(p).toHaveProperty("memo");
    }
  });

  it("all amounts are valid decimal strings with 7 fractional digits", () => {
    const payloads = buildFixturePayloads(SENDER);
    for (const p of payloads) {
      expect(p.amount).toMatch(/^\d+\.\d{7}$/);
    }
  });

  it("all assets are XLM", () => {
    const payloads = buildFixturePayloads(SENDER);
    for (const p of payloads) {
      expect(p.asset).toBe("XLM");
    }
  });

  it("all memos start with 'fixture:'", () => {
    const payloads = buildFixturePayloads(SENDER);
    for (const p of payloads) {
      expect(p.memo).toMatch(/^fixture:/);
    }
  });

  it("works with an empty sender string", () => {
    const payloads = buildFixturePayloads("");
    expect(payloads).toHaveLength(3);
    expect(payloads[0].sender).toBe("");
  });
});
