import {
  classifyClaimEvidenceFreshness,
  DEFAULT_STALE_AFTER_MS,
  deriveClaimEligibility,
  deriveClaimEligibilities,
  formatClaimEligibilityRelativeTime,
  unknownClaimEligibility,
  ClaimEligibilityInputError,
} from "@/lib/claim-eligibility";
import type { ClaimEvidence } from "@/types/claim-eligibility";

const NOW = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function evidence(
  overrides: Partial<ClaimEvidence> = {},
): ClaimEvidence {
  return {
    marketId: "m1",
    outcome: "Lakers to win",
    userPrediction: "Lakers to win",
    resolvedAt: NOW - 2 * HOUR,
    source: "oracle",
    claimed: false,
    claimStatus: "available",
    winnings: 18,
    winningsToken: "XLM",
    ...overrides,
  };
}

describe("classifyClaimEvidenceFreshness", () => {
  it("returns unknown for null/zero/negative timestamps", () => {
    expect(classifyClaimEvidenceFreshness(null, NOW)).toBe("unknown");
    expect(classifyClaimEvidenceFreshness(0, NOW)).toBe("unknown");
    expect(classifyClaimEvidenceFreshness(-1, NOW)).toBe("unknown");
  });

  it("returns unknown for non-finite timestamps", () => {
    expect(classifyClaimEvidenceFreshness(Number.NaN, NOW)).toBe("unknown");
    expect(classifyClaimEvidenceFreshness(Infinity, NOW)).toBe("unknown");
  });

  it("returns unknown when the timestamp is in the future", () => {
    expect(classifyClaimEvidenceFreshness(NOW + DAY, NOW)).toBe("unknown");
  });

  it("returns fresh within the threshold", () => {
    expect(classifyClaimEvidenceFreshness(NOW - HOUR, NOW)).toBe("fresh");
    expect(
      classifyClaimEvidenceFreshness(NOW - DEFAULT_STALE_AFTER_MS, NOW),
    ).toBe("fresh");
  });

  it("returns stale at or beyond the threshold", () => {
    expect(
      classifyClaimEvidenceFreshness(NOW - (DEFAULT_STALE_AFTER_MS + 1), NOW),
    ).toBe("stale");
  });

  it("honors a custom stale threshold", () => {
    const opts = { staleAfterMs: HOUR };
    expect(classifyClaimEvidenceFreshness(NOW - 2 * HOUR, NOW, opts)).toBe(
      "stale",
    );
    expect(classifyClaimEvidenceFreshness(NOW - 30 * 60 * 1000, NOW, opts)).toBe(
      "fresh",
    );
  });
});

describe("unknownClaimEligibility", () => {
  it("returns a stable unknown shape", () => {
    const status = unknownClaimEligibility("m1");
    expect(status.decision).toBe("unknown");
    expect(status.canClaim).toBe(false);
    expect(status.freshness).toBe("unknown");
    expect(status.matched).toBe(false);
    expect(status.marketId).toBe("m1");
  });
});

describe("deriveClaimEligibility", () => {
  it("derives an eligible claim when the position matches", () => {
    const result = deriveClaimEligibility(evidence(), NOW);
    expect(result.decision).toBe("eligible");
    expect(result.canClaim).toBe(true);
    expect(result.matched).toBe(true);
    expect(result.freshness).toBe("fresh");
    expect(result.evidenceSource).toBe("oracle");
  });

  it("matches case-insensitively and ignores surrounding whitespace", () => {
    const result = deriveClaimEligibility(
      evidence({
        outcome: "  LAKERS TO WIN ",
        userPrediction: "lakers to win",
      }),
      NOW,
    );
    expect(result.decision).toBe("eligible");
    expect(result.matched).toBe(true);
  });

  it("marks a stale but still eligible claim (freshness does not block)", () => {
    const result = deriveClaimEligibility(
      evidence({ resolvedAt: NOW - 5 * DAY }),
      NOW,
    );
    expect(result.decision).toBe("eligible");
    expect(result.canClaim).toBe(true);
    expect(result.freshness).toBe("stale");
  });

  it("marks ineligible when the outcome differs from the prediction", () => {
    const result = deriveClaimEligibility(
      evidence({ userPrediction: "Heat to win" }),
      NOW,
    );
    expect(result.decision).toBe("ineligible_wrong_outcome");
    expect(result.canClaim).toBe(false);
    expect(result.matched).toBe(false);
  });

  it("marks already_claimed when settled, overriding available", () => {
    const result = deriveClaimEligibility(
      evidence({ claimed: true, claimStatus: "available" }),
      NOW,
    );
    expect(result.decision).toBe("already_claimed");
    expect(result.canClaim).toBe(false);
  });

  it("marks pending and disputed claims as not claimable", () => {
    expect(deriveClaimEligibility(evidence({ claimStatus: "pending" }), NOW).decision).toBe(
      "pending",
    );
    expect(deriveClaimEligibility(evidence({ claimStatus: "disputed" }), NOW).decision).toBe(
      "disputed",
    );
  });

  it("treats an empty outcome as unresolved (not claimable)", () => {
    const result = deriveClaimEligibility(evidence({ outcome: "" }), NOW);
    expect(result.decision).toBe("ineligible_unresolved");
    expect(result.canClaim).toBe(false);
  });

  it("treats an unknown timestamp as untrustworthy (unknown, not eligible)", () => {
    const result = deriveClaimEligibility(evidence({ resolvedAt: 0 }), NOW);
    expect(result.decision).toBe("unknown");
    expect(result.canClaim).toBe(false);
    expect(result.freshness).toBe("unknown");
  });

  describe("validation (rejection)", () => {
    it("throws on a non-object evidence", () => {
      expect(() => deriveClaimEligibility(null as never, NOW)).toThrow(
        ClaimEligibilityInputError,
      );
    });

    it("throws on an empty marketId", () => {
      expect(() =>
        deriveClaimEligibility(evidence({ marketId: "  " }), NOW),
      ).toThrow(ClaimEligibilityInputError);
    });

    it("throws on a negative timestamp", () => {
      expect(() =>
        deriveClaimEligibility(evidence({ resolvedAt: -5 }), NOW),
      ).toThrow(ClaimEligibilityInputError);
    });

    it("throws on an invalid source", () => {
      expect(() =>
        deriveClaimEligibility(
          evidence({ source: "bogus" as never }),
          NOW,
        ),
      ).toThrow(ClaimEligibilityInputError);
    });

    it("throws on an invalid claimStatus", () => {
      expect(() =>
        deriveClaimEligibility(
          evidence({ claimStatus: "weird" as never }),
          NOW,
        ),
      ).toThrow(ClaimEligibilityInputError);
    });

    it("throws on negative winnings", () => {
      expect(() =>
        deriveClaimEligibility(evidence({ winnings: -1 }), NOW),
      ).toThrow(ClaimEligibilityInputError);
    });
  });
});

describe("deriveClaimEligibilities", () => {
  it("returns an empty list for an empty input", () => {
    expect(deriveClaimEligibilities([], NOW)).toEqual([]);
  });

  it("derives one result per evidence record (order independent)", () => {
    const results = deriveClaimEligibilities(
      [evidence({ marketId: "a" }), evidence({ marketId: "b" })],
      NOW,
    );
    expect(results).toHaveLength(2);
    expect(results[0].marketId).toBe("a");
    expect(results[1].marketId).toBe("b");
  });

  it("throws on a duplicate marketId (no silent data loss)", () => {
    expect(() =>
      deriveClaimEligibilities(
        [evidence({ marketId: "a" }), evidence({ marketId: "a" })],
        NOW,
      ),
    ).toThrow(ClaimEligibilityInputError);
  });

  it("throws on a non-array input", () => {
    expect(() =>
      deriveClaimEligibilities(null as never, NOW),
    ).toThrow(ClaimEligibilityInputError);
  });
});

describe("formatClaimEligibilityRelativeTime", () => {
  it("returns unknown for null/zero/negative", () => {
    expect(formatClaimEligibilityRelativeTime(null, NOW)).toBe("unknown");
    expect(formatClaimEligibilityRelativeTime(0, NOW)).toBe("unknown");
    expect(formatClaimEligibilityRelativeTime(-1, NOW)).toBe("unknown");
  });

  it("returns just now within the minute", () => {
    expect(formatClaimEligibilityRelativeTime(NOW - 30 * 1000, NOW)).toBe(
      "just now",
    );
  });

  it("returns minutes, hours, days, months", () => {
    expect(formatClaimEligibilityRelativeTime(NOW - 5 * 60 * 1000, NOW)).toBe(
      "5m ago",
    );
    expect(formatClaimEligibilityRelativeTime(NOW - 3 * HOUR, NOW)).toBe(
      "3h ago",
    );
    expect(formatClaimEligibilityRelativeTime(NOW - 4 * DAY, NOW)).toBe(
      "4d ago",
    );
    expect(formatClaimEligibilityRelativeTime(NOW - 60 * DAY, NOW)).toBe(
      "2mo ago",
    );
  });

  it("returns just now for future timestamps (clock skew)", () => {
    expect(formatClaimEligibilityRelativeTime(NOW + 1000, NOW)).toBe("just now");
  });
});
