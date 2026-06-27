/**
 * @jest-environment node
 *
 * Per-org token allowlist — unit tests
 *
 * Covers:
 *   - checkTokenAllowedForOrg: per-org list enforcement
 *   - Fallback to global allowlist when org has no list
 *   - Malformed token handling
 *   - Interaction with global allowlist state
 *   - Edge cases (empty list, undefined list, duplicates)
 */

import {
  checkTokenAllowedForOrg,
  addAllowedToken,
  removeAllowedToken,
  normaliseToken,
  _resetAllowlistForTesting,
} from "./token-allowlist";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USDC_ISSUER = "GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW";
const USDC = `USDC:${USDC_ISSUER}`;
const EURC_ISSUER = "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPPA";
const EURC = `EURC:${EURC_ISSUER}`;

/** Builds a minimal org-like object with a token allowlist. */
function orgWith(tokenAllowlist: string[] | undefined) {
  return { tokenAllowlist };
}

beforeEach(() => {
  _resetAllowlistForTesting();
});

// ─── Per-org list active ───────────────────────────────────────────────────────

describe("checkTokenAllowedForOrg — per-org list active", () => {
  it("accepts a token that is in the org list", async () => {
    const org = orgWith(["XLM", normaliseToken(USDC)]);
    const result = await checkTokenAllowedForOrg("XLM", org);
    expect(result).toEqual({ accepted: true });
  });

  it("accepts USDC that is in the org list", async () => {
    const org = orgWith([normaliseToken(USDC)]);
    const result = await checkTokenAllowedForOrg(USDC, org);
    expect(result).toEqual({ accepted: true });
  });

  it("rejects a token absent from the org list", async () => {
    const org = orgWith(["XLM"]);
    const result = await checkTokenAllowedForOrg(USDC, org);
    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.reason).toContain("not in this org's accepted token list");
      expect(result.reason).toContain(normaliseToken(USDC));
    }
  });

  it("rejects EURC when only XLM and USDC are allowed", async () => {
    const org = orgWith(["XLM", normaliseToken(USDC)]);
    const result = await checkTokenAllowedForOrg(EURC, org);
    expect(result.accepted).toBe(false);
  });

  it("ignores the global allowlist when org has its own list", async () => {
    // Global allows USDC; org list only allows XLM
    addAllowedToken(USDC);
    const org = orgWith(["XLM"]);

    // USDC is globally allowed but not in org list → rejected
    const usdcResult = await checkTokenAllowedForOrg(USDC, org);
    expect(usdcResult.accepted).toBe(false);

    // XLM is in org list → accepted regardless of global state
    const xlmResult = await checkTokenAllowedForOrg("XLM", org);
    expect(xlmResult.accepted).toBe(true);
  });

  it("normalises token input before checking (case-insensitive XLM)", async () => {
    const org = orgWith(["XLM"]);
    expect((await checkTokenAllowedForOrg("xlm", org)).accepted).toBe(true);
    expect((await checkTokenAllowedForOrg("native", org)).accepted).toBe(true);
    expect((await checkTokenAllowedForOrg("NATIVE", org)).accepted).toBe(true);
    expect((await checkTokenAllowedForOrg("  XLM  ", org)).accepted).toBe(true);
  });
});

// ─── Fallback to global allowlist ─────────────────────────────────────────────

describe("checkTokenAllowedForOrg — fallback to global", () => {
  it("falls back to global (open mode) when org has no list and global is disabled", async () => {
    const orgNoList = orgWith(undefined);
    // Global is disabled → any well-formed token accepted
    const result = await checkTokenAllowedForOrg("XLM", orgNoList);
    expect(result).toEqual({ accepted: true });
  });

  it("falls back to global (open mode) when org has an empty list", async () => {
    const orgEmptyList = orgWith([]);
    const result = await checkTokenAllowedForOrg(USDC, orgEmptyList);
    expect(result).toEqual({ accepted: true });
  });

  it("falls back to global list when org has no list and global is enabled", async () => {
    addAllowedToken("XLM");
    const orgNoList = orgWith(undefined);

    // XLM is in global list → accepted
    expect((await checkTokenAllowedForOrg("XLM", orgNoList)).accepted).toBe(true);

    // USDC is not in global list → rejected
    const usdcResult = await checkTokenAllowedForOrg(USDC, orgNoList);
    expect(usdcResult.accepted).toBe(false);
    if (!usdcResult.accepted) {
      expect(usdcResult.reason).toContain("not in the accepted token allowlist");
    }
  });

  it("falls back to global list when org has empty list and global is enabled", async () => {
    addAllowedToken("XLM");
    const orgEmptyList = orgWith([]);

    expect((await checkTokenAllowedForOrg("XLM", orgEmptyList)).accepted).toBe(true);
    expect((await checkTokenAllowedForOrg(USDC, orgEmptyList)).accepted).toBe(false);
  });
});

// ─── Malformed token handling ─────────────────────────────────────────────────

describe("checkTokenAllowedForOrg — malformed tokens", () => {
  it("empty string normalises to XLM and is checked against the org list", async () => {
    // normaliseToken("") → "XLM" (existing behaviour: empty = native)
    const orgWithXlm = orgWith(["XLM"]);
    const result = await checkTokenAllowedForOrg("", orgWithXlm);
    expect(result.accepted).toBe(true); // "" treated as XLM, which is allowed

    const orgWithoutXlm = orgWith([normaliseToken(USDC)]);
    const rejected = await checkTokenAllowedForOrg("", orgWithoutXlm);
    expect(rejected.accepted).toBe(false); // "" → XLM, not in USDC-only list
  });

  it("whitespace-only string normalises to XLM and is checked against the org list", async () => {
    // normaliseToken("   ") → "XLM" (trims to empty, treated as native)
    const orgWithXlm = orgWith(["XLM"]);
    const result = await checkTokenAllowedForOrg("   ", orgWithXlm);
    expect(result.accepted).toBe(true);
  });

  it("rejects a malformed CODE:ISSUER (short issuer)", async () => {
    const org = orgWith(["XLM"]);
    const result = await checkTokenAllowedForOrg("USDC:SHORTKEY", org);
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toContain("Invalid token format");
  });

  it("rejects malformed token even when org list is empty (fallback path)", async () => {
    const org = orgWith([]);
    const result = await checkTokenAllowedForOrg("BAD:::FORMAT", org);
    expect(result.accepted).toBe(false);
  });
});

// ─── Org list mutation interaction ────────────────────────────────────────────

describe("checkTokenAllowedForOrg — list mutation", () => {
  it("reflects changes to the tokenAllowlist array directly (no cache needed)", async () => {
    const list: string[] = ["XLM"];
    const org = { tokenAllowlist: list };

    expect((await checkTokenAllowedForOrg("XLM", org)).accepted).toBe(true);
    expect((await checkTokenAllowedForOrg(USDC, org)).accepted).toBe(false);

    // Mutate the list in place
    list.push(normaliseToken(USDC));

    expect((await checkTokenAllowedForOrg(USDC, org)).accepted).toBe(true);
  });

  it("transitions from per-org enforcement to global fallback when list emptied", async () => {
    const list: string[] = ["XLM"];
    const org = { tokenAllowlist: list };

    // Per-org: USDC rejected
    expect((await checkTokenAllowedForOrg(USDC, org)).accepted).toBe(false);

    // Clear the per-org list
    list.length = 0;

    // Global is open → USDC now accepted via fallback
    expect((await checkTokenAllowedForOrg(USDC, org)).accepted).toBe(true);
  });
});

// ─── Integration: global disabled + org list active ──────────────────────────

describe("checkTokenAllowedForOrg — integration", () => {
  it("org list takes effect independently even when global is disabled", async () => {
    // Global allowlist is empty (disabled) — normally everything passes
    const orgRestrictive = orgWith(["XLM"]);

    // XLM passes through the org filter
    expect((await checkTokenAllowedForOrg("XLM", orgRestrictive)).accepted).toBe(true);

    // USDC blocked by org filter even though global would pass it
    const result = await checkTokenAllowedForOrg(USDC, orgRestrictive);
    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.reason).toContain("not in this org's accepted token list");
    }
  });

  it("two orgs with different lists enforce independently", async () => {
    const orgA = orgWith(["XLM"]);
    const orgB = orgWith([normaliseToken(USDC)]);

    expect((await checkTokenAllowedForOrg("XLM", orgA)).accepted).toBe(true);
    expect((await checkTokenAllowedForOrg(USDC, orgA)).accepted).toBe(false);

    expect((await checkTokenAllowedForOrg("XLM", orgB)).accepted).toBe(false);
    expect((await checkTokenAllowedForOrg(USDC, orgB)).accepted).toBe(true);
  });

  it("org with no list and global disabled accepts any valid token", async () => {
    const orgOpen = orgWith(undefined);
    expect((await checkTokenAllowedForOrg("XLM", orgOpen)).accepted).toBe(true);
    expect((await checkTokenAllowedForOrg(USDC, orgOpen)).accepted).toBe(true);
    expect((await checkTokenAllowedForOrg(EURC, orgOpen)).accepted).toBe(true);
  });

  it("removing all tokens from global list does not affect per-org enforcement", async () => {
    addAllowedToken("XLM");
    removeAllowedToken("XLM");
    // Global is now disabled

    const orgRestrictive = orgWith(["XLM"]);
    // Org still enforces its own list
    expect((await checkTokenAllowedForOrg("XLM", orgRestrictive)).accepted).toBe(true);
    expect((await checkTokenAllowedForOrg(USDC, orgRestrictive)).accepted).toBe(false);
  });
});
