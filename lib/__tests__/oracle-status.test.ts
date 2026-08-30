import {
  classifyFreshness,
  DEFAULT_STALE_AFTER_MS,
  deriveOracleStatus,
  formatOracleRelativeTime,
  isValidOracleProviderId,
  OracleStatusInputError,
  unknownOracleStatus,
} from "@/lib/oracle-status";
import type { OracleAttemptResult } from "@/types/oracle-status";

const NOW = 1_700_000_000_000; // fixed clock for deterministic tests
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function attempt(
  overrides: Partial<OracleAttemptResult> = {},
): OracleAttemptResult {
  return {
    provider: "chainlink",
    attempt: 0,
    success: true,
    outcome: "yes",
    timestamp: NOW,
    ...overrides,
  };
}

describe("isValidOracleProviderId", () => {
  it("accepts known providers", () => {
    expect(isValidOracleProviderId("chainlink")).toBe(true);
    expect(isValidOracleProviderId("switchboard")).toBe(true);
    expect(isValidOracleProviderId("pyth")).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isValidOracleProviderId("oracle")).toBe(false);
    expect(isValidOracleProviderId("")).toBe(false);
    expect(isValidOracleProviderId(null)).toBe(false);
    expect(isValidOracleProviderId(42)).toBe(false);
  });
});

describe("classifyFreshness", () => {
  it("returns unknown for null/zero/negative timestamps", () => {
    expect(classifyFreshness(null, NOW)).toBe("unknown");
    expect(classifyFreshness(0, NOW)).toBe("unknown");
    expect(classifyFreshness(-1, NOW)).toBe("unknown");
  });

  it("returns unknown for non-finite timestamps", () => {
    expect(classifyFreshness(Number.NaN, NOW)).toBe("unknown");
    expect(classifyFreshness(Infinity, NOW)).toBe("unknown");
  });

  it("returns unknown when the timestamp is in the future", () => {
    expect(classifyFreshness(NOW + DAY, NOW)).toBe("unknown");
  });

  it("returns fresh within the threshold", () => {
    expect(classifyFreshness(NOW - HOUR, NOW)).toBe("fresh");
    expect(classifyFreshness(NOW - DEFAULT_STALE_AFTER_MS, NOW)).toBe("fresh");
  });

  it("returns stale at or beyond the threshold", () => {
    expect(
      classifyFreshness(NOW - (DEFAULT_STALE_AFTER_MS + 1), NOW),
    ).toBe("stale");
  });

  it("honors a custom stale threshold", () => {
    const opts = { staleAfterMs: HOUR };
    expect(classifyFreshness(NOW - 2 * HOUR, NOW, opts)).toBe("stale");
    expect(classifyFreshness(NOW - 30 * 60 * 1000, NOW, opts)).toBe("fresh");
  });
});

describe("unknownOracleStatus", () => {
  it("returns a stable unknown shape", () => {
    const status = unknownOracleStatus();
    expect(status.source).toBe("unknown");
    expect(status.freshness).toBe("unknown");
    expect(status.provider).toBeNull();
    expect(status.attempts).toEqual([]);
  });
});

describe("deriveOracleStatus", () => {
  it("returns unknown for an empty list (boundary)", () => {
    const status = deriveOracleStatus([], NOW);
    expect(status.source).toBe("unknown");
    expect(status.freshness).toBe("unknown");
    expect(status.provider).toBeNull();
    expect(status.fallback).toBeNull();
  });

  it("derives a primary (no-fallback) success as fresh", () => {
    const status = deriveOracleStatus([attempt()], NOW);
    expect(status.source).toBe("oracle");
    expect(status.freshness).toBe("fresh");
    expect(status.provider).toBe("chainlink");
    expect(status.fallback?.usedFallback).toBe(false);
    expect(status.fallback?.primaryProvider).toBe("chainlink");
  });

  it("detects fallback usage when a primary attempt fails", () => {
    const attempts: OracleAttemptResult[] = [
      attempt({ provider: "chainlink", attempt: 0, success: false }),
      attempt({ provider: "pyth", attempt: 1, success: true }),
    ];
    const status = deriveOracleStatus(attempts, NOW);
    expect(status.source).toBe("fallback");
    expect(status.provider).toBe("pyth");
    expect(status.fallback?.usedFallback).toBe(true);
    expect(status.fallback?.primaryProvider).toBe("chainlink");
    expect(status.fallback?.resolvedProvider).toBe("pyth");
    expect(status.fallback?.totalAttempts).toBe(2);
  });

  it("treats an exhausted chain (all fail) as unknown with no provider", () => {
    const attempts: OracleAttemptResult[] = [
      attempt({ attempt: 0, success: false }),
      attempt({ provider: "pyth", attempt: 1, success: false }),
    ];
    const status = deriveOracleStatus(attempts, NOW);
    expect(status.source).toBe("unknown");
    expect(status.provider).toBeNull();
    expect(status.freshness).toBe("unknown");
    expect(status.attempts).toHaveLength(2);
  });

  it("is order-independent (sorts by attempt index)", () => {
    const attempts: OracleAttemptResult[] = [
      attempt({ provider: "pyth", attempt: 1, success: true }),
      attempt({ provider: "chainlink", attempt: 0, success: false }),
    ];
    const status = deriveOracleStatus(attempts, NOW);
    expect(status.provider).toBe("pyth");
    expect(status.fallback?.usedFallback).toBe(true);
  });

  it("computes staleness from the resolved attempt's timestamp", () => {
    const attempts: OracleAttemptResult[] = [
      attempt({ attempt: 0, success: false }),
      attempt({ provider: "pyth", attempt: 1, success: true, timestamp: NOW - 2 * DAY }),
    ];
    const status = deriveOracleStatus(attempts, NOW);
    expect(status.freshness).toBe("stale");
    expect(status.lastUpdatedAt).toBe(NOW - 2 * DAY);
  });

  it("treats a zero timestamp as unknown freshness", () => {
    const status = deriveOracleStatus(
      [attempt({ timestamp: 0 })],
      NOW,
    );
    expect(status.freshness).toBe("unknown");
    expect(status.lastUpdatedAt).toBeNull();
  });

  describe("validation (rejection)", () => {
    it("throws on a non-array input", () => {
      expect(() => deriveOracleStatus(null as never, NOW)).toThrow(
        OracleStatusInputError,
      );
    });

    it("throws on an invalid provider", () => {
      expect(() =>
        deriveOracleStatus(
          [attempt({ provider: "bogus" as never })],
          NOW,
        ),
      ).toThrow(OracleStatusInputError);
    });

    it("throws on a negative attempt index", () => {
      expect(() =>
        deriveOracleStatus([attempt({ attempt: -1 })], NOW),
      ).toThrow(OracleStatusInputError);
    });

    it("throws on a non-integer attempt index", () => {
      expect(() =>
        deriveOracleStatus([attempt({ attempt: 1.5 })], NOW),
      ).toThrow(OracleStatusInputError);
    });

    it("throws on a duplicate attempt index", () => {
      expect(() =>
        deriveOracleStatus(
          [
            attempt({ attempt: 0, success: false }),
            attempt({ attempt: 0, success: true }),
          ],
          NOW,
        ),
      ).toThrow(OracleStatusInputError);
    });

    it("throws on a negative timestamp", () => {
      expect(() =>
        deriveOracleStatus([attempt({ timestamp: -5 })], NOW),
      ).toThrow(OracleStatusInputError);
    });

    it("throws on a non-boolean success", () => {
      expect(() =>
        deriveOracleStatus(
          [attempt({ success: "yes" as never })],
          NOW,
        ),
      ).toThrow(OracleStatusInputError);
    });
  });
});

describe("formatOracleRelativeTime", () => {
  it("returns unknown for null/zero/negative", () => {
    expect(formatOracleRelativeTime(null, NOW)).toBe("unknown");
    expect(formatOracleRelativeTime(0, NOW)).toBe("unknown");
    expect(formatOracleRelativeTime(-1, NOW)).toBe("unknown");
  });

  it("returns just now within the minute", () => {
    expect(formatOracleRelativeTime(NOW - 30 * 1000, NOW)).toBe("just now");
  });

  it("returns minutes", () => {
    expect(formatOracleRelativeTime(NOW - 5 * 60 * 1000, NOW)).toBe("5m ago");
  });

  it("returns hours", () => {
    expect(formatOracleRelativeTime(NOW - 3 * HOUR, NOW)).toBe("3h ago");
  });

  it("returns days", () => {
    expect(formatOracleRelativeTime(NOW - 4 * DAY, NOW)).toBe("4d ago");
  });

  it("returns months", () => {
    expect(formatOracleRelativeTime(NOW - 60 * DAY, NOW)).toBe("2mo ago");
  });

  it("returns just now for future timestamps (clock skew)", () => {
    expect(formatOracleRelativeTime(NOW + 1000, NOW)).toBe("just now");
  });
});
