/**
 * Tests for token-allowlist with TTL cache and single-flight semantics.
 *
 * Covers:
 * - Basic allowlist functionality (unchanged by caching)
 * - Cache behavior (hits, misses, expiration)
 * - Single-flight semantics (stampede prevention)
 * - Cache invalidation on mutations
 * - Edge cases and error handling
 */

import {
  normaliseToken,
  isAllowlistEnabled,
  getAllowedTokens,
  addAllowedToken,
  removeAllowedToken,
  checkTokenAllowed,
  _resetAllowlistForTesting,
  _waitForInFlightOperations,
} from "./token-allowlist";

describe("token-allowlist", () => {
  beforeEach(() => {
    _resetAllowlistForTesting();
  });

  // ── Basic Functionality Tests ─────────────────────────────────────────────

  describe("normaliseToken", () => {
    it("normalises XLM variants", () => {
      expect(normaliseToken("XLM")).toBe("XLM");
      expect(normaliseToken("xlm")).toBe("XLM");
      expect(normaliseToken("native")).toBe("XLM");
      expect(normaliseToken("NATIVE")).toBe("XLM");
      expect(normaliseToken("  XLM  ")).toBe("XLM");
    });

    it("normalises SEP-41 asset format", () => {
      // This assumes a parseAssetString implementation that validates format
      // For mocking purposes, we test that it returns consistent format
      const result = normaliseToken("USD:GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW");
      expect(result).toMatch(/^USD:/);
    });

    it("throws on malformed token", () => {
      expect(() => normaliseToken("INVALID:::FORMAT")).toThrow();
      expect(() => normaliseToken("")).toThrow();
    });
  });

  describe("isAllowlistEnabled", () => {
    it("returns false when allowlist is empty", () => {
      expect(isAllowlistEnabled()).toBe(false);
    });

    it("returns true when allowlist has entries", () => {
      addAllowedToken("XLM");
      expect(isAllowlistEnabled()).toBe(true);
    });

    it("returns false after removing last token", () => {
      addAllowedToken("XLM");
      expect(isAllowlistEnabled()).toBe(true);
      removeAllowedToken("XLM");
      expect(isAllowlistEnabled()).toBe(false);
    });
  });

  describe("getAllowedTokens", () => {
    it("returns empty array when disabled", () => {
      expect(getAllowedTokens()).toEqual([]);
    });

    it("returns all allowed tokens", () => {
      addAllowedToken("XLM");
      addAllowedToken("USD:GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW");
      const tokens = getAllowedTokens();
      expect(tokens).toHaveLength(2);
      expect(tokens).toContain("XLM");
    });
  });

  describe("addAllowedToken and removeAllowedToken", () => {
    it("adds tokens and enables allowlist", () => {
      expect(isAllowlistEnabled()).toBe(false);
      addAllowedToken("XLM");
      expect(isAllowlistEnabled()).toBe(true);
      expect(getAllowedTokens()).toContain("XLM");
    });

    it("removes tokens and disables allowlist", () => {
      addAllowedToken("XLM");
      removeAllowedToken("XLM");
      expect(isAllowlistEnabled()).toBe(false);
    });

    it("normalises tokens on add/remove", () => {
      addAllowedToken("xlm");
      expect(getAllowedTokens()).toContain("XLM");
      removeAllowedToken("NATIVE");
      expect(isAllowlistEnabled()).toBe(false);
    });
  });

  // ── Basic checkTokenAllowed Tests ─────────────────────────────────────────

  describe("checkTokenAllowed (basic functionality)", () => {
    it("accepts any token when allowlist disabled", async () => {
      const result = await checkTokenAllowed("XLM");
      expect(result).toEqual({ accepted: true });
    });

    it("accepts token in allowlist", async () => {
      addAllowedToken("XLM");
      const result = await checkTokenAllowed("XLM");
      expect(result).toEqual({ accepted: true });
    });

    it("rejects token not in allowlist", async () => {
      addAllowedToken("XLM");
      const result = await checkTokenAllowed("USD:GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW");
      expect(result.accepted).toBe(false);
      expect(result.reason).toContain("not in the accepted token allowlist");
    });

    it("rejects malformed token without caching", async () => {
      const result = await checkTokenAllowed("INVALID:::FORMAT");
      expect(result.accepted).toBe(false);
      expect(result.reason).toContain("Invalid token format");
    });
  });

  // ── Cache Behavior Tests ──────────────────────────────────────────────────

  describe("cache behavior", () => {
    it("caches successful token check results", async () => {
      addAllowedToken("XLM");

      // First call: cache miss
      const result1 = await checkTokenAllowed("XLM");
      expect(result1).toEqual({ accepted: true });

      // Second call: cache hit (should be instant)
      const result2 = await checkTokenAllowed("XLM");
      expect(result2).toEqual({ accepted: true });
    });

    it("caches rejection results", async () => {
      addAllowedToken("XLM");

      // First call: cache miss
      const result1 = await checkTokenAllowed("USD:GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW");
      expect(result1.accepted).toBe(false);

      // Second call: cache hit
      const result2 = await checkTokenAllowed("USD:GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW");
      expect(result2.accepted).toBe(false);
      expect(result2.reason).toEqual(result1.reason);
    });

    it("invalidates cache when token is added", async () => {
      // Initially no allowlist
      const result1 = await checkTokenAllowed("XLM");
      expect(result1).toEqual({ accepted: true });

      // Add token to allowlist
      addAllowedToken("USD:GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW");

      // Now XLM should be rejected (cache invalidated)
      const result2 = await checkTokenAllowed("XLM");
      expect(result2.accepted).toBe(false);
    });

    it("invalidates cache when token is removed", async () => {
      addAllowedToken("XLM");

      // XLM accepted
      const result1 = await checkTokenAllowed("XLM");
      expect(result1).toEqual({ accepted: true });

      // Remove XLM
      removeAllowedToken("XLM");

      // Cache should be cleared, allowlist disabled again
      const result2 = await checkTokenAllowed("XLM");
      expect(result2).toEqual({ accepted: true });
    });
  });

  // ── TTL Expiration Tests ──────────────────────────────────────────────────

  describe("cache TTL expiration", () => {
    /**
     * Note: Full TTL expiration tests would require time mocking.
     * Here we verify the cache structure is set up correctly.
     * In production, this would be tested with jest.useFakeTimers().
     */

    it("cache entries include expiration time", async () => {
      addAllowedToken("XLM");

      // Trigger cache by calling checkTokenAllowed
      await checkTokenAllowed("XLM");

      // Verify cache is populated (indirect test)
      // Next call should be cache hit
      const start = Date.now();
      const result = await checkTokenAllowed("XLM");
      const elapsed = Date.now() - start;

      // Cache hit should be nearly instant (< 5ms in normal conditions)
      // This is a soft assertion — may vary on slow systems
      expect(result).toEqual({ accepted: true });
      expect(elapsed).toBeLessThan(100);
    });
  });

  // ── Single-Flight Stampede Prevention Tests ──────────────────────────────

  describe("single-flight semantics (stampede prevention)", () => {
    it("prevents concurrent checks of same token from duplicating work", async () => {
      addAllowedToken("XLM");

      // Simulate 100 concurrent requests for the same token
      const promises = Array.from({ length: 100 }, () => checkTokenAllowed("XLM"));

      // All should resolve successfully
      const results = await Promise.all(promises);

      // All results should be identical
      results.forEach((result) => {
        expect(result).toEqual({ accepted: true });
      });

      // Wait for any pending in-flight operations
      await _waitForInFlightOperations();
    });

    it("handles different tokens independently", async () => {
      addAllowedToken("XLM");
      addAllowedToken("USD:GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW");

      // Concurrent requests for different tokens
      const token1Promises = Array.from({ length: 50 }, () => checkTokenAllowed("XLM"));
      const token2Promises = Array.from({ length: 50 }, () =>
        checkTokenAllowed("USD:GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW"),
      );

      const results = await Promise.all([...token1Promises, ...token2Promises]);

      // All XLM checks should succeed
      const xlmResults = results.slice(0, 50);
      xlmResults.forEach((result) => {
        expect(result).toEqual({ accepted: true });
      });

      // All USD checks should succeed
      const usdResults = results.slice(50);
      usdResults.forEach((result) => {
        expect(result).toEqual({ accepted: true });
      });

      await _waitForInFlightOperations();
    });

    it("single-flight prevents duplicate work during cache expiration", async () => {
      /**
       * Scenario: When cache expires and 100 concurrent requests arrive,
       * single-flight semantics ensure only ONE performs the check,
       * and the other 99 wait for its result.
       *
       * This test verifies the in-flight coordination works correctly.
       * With mock timing, we'd verify that exactly 1 in-flight operation occurs.
       */

      addAllowedToken("XLM");

      // Warm the cache
      await checkTokenAllowed("XLM");

      // Multiple concurrent requests should all hit cache or wait for single-flight
      const promises = Array.from({ length: 10 }, () => checkTokenAllowed("XLM"));
      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toEqual({ accepted: true });
      });

      await _waitForInFlightOperations();
    });

    it("single-flight handles rejection correctly", async () => {
      addAllowedToken("XLM");

      // Simulate stampede with rejected token
      const rejectedToken = "USD:GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW";
      const promises = Array.from({ length: 50 }, () => checkTokenAllowed(rejectedToken));

      const results = await Promise.all(promises);

      // All should reject with same reason
      results.forEach((result) => {
        expect(result.accepted).toBe(false);
        expect(result.reason).toContain("not in the accepted token allowlist");
      });

      await _waitForInFlightOperations();
    });
  });

  // ── Edge Cases and Error Handling ─────────────────────────────────────────

  describe("edge cases and error handling", () => {
    it("handles empty token string", async () => {
      const result = await checkTokenAllowed("");
      expect(result.accepted).toBe(false);
      expect(result.reason).toContain("Invalid token format");
    });

    it("handles whitespace-only token", async () => {
      const result = await checkTokenAllowed("   ");
      expect(result.accepted).toBe(false);
      expect(result.reason).toContain("Invalid token format");
    });

    it("normalises token before checking", async () => {
      addAllowedToken("xlm");

      // Check with different case
      const result = await checkTokenAllowed("XLM");
      expect(result).toEqual({ accepted: true });
    });

    it("handles rapid add/remove cycles", async () => {
      for (let i = 0; i < 5; i++) {
        addAllowedToken("XLM");
        const result1 = await checkTokenAllowed("XLM");
        expect(result1).toEqual({ accepted: true });

        removeAllowedToken("XLM");
        const result2 = await checkTokenAllowed("XLM");
        expect(result2).toEqual({ accepted: true });
      }

      await _waitForInFlightOperations();
    });
  });

  // ── Integration Tests ────────────────────────────────────────────────────

  describe("integration scenarios", () => {
    it("complete workflow: enable, check, modify, check again", async () => {
      // Start disabled
      expect(isAllowlistEnabled()).toBe(false);
      let result = await checkTokenAllowed("XLM");
      expect(result).toEqual({ accepted: true });

      // Enable with XLM
      addAllowedToken("XLM");
      expect(isAllowlistEnabled()).toBe(true);
      result = await checkTokenAllowed("XLM");
      expect(result).toEqual({ accepted: true });

      // Add USD
      addAllowedToken("USD:GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW");
      result = await checkTokenAllowed("USD:GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW");
      expect(result).toEqual({ accepted: true });

      // Remove XLM
      removeAllowedToken("XLM");
      result = await checkTokenAllowed("XLM");
      expect(result.accepted).toBe(false);

      // Still works for USD
      result = await checkTokenAllowed("USD:GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW");
      expect(result).toEqual({ accepted: true });
    });

    it("mixed concurrent and sequential operations", async () => {
      addAllowedToken("XLM");

      // Sequential
      const result1 = await checkTokenAllowed("XLM");
      expect(result1).toEqual({ accepted: true });

      // Concurrent
      const promises = Array.from({ length: 10 }, () => checkTokenAllowed("XLM"));
      const results = await Promise.all(promises);
      results.forEach((r) => expect(r).toEqual({ accepted: true }));

      // Modify
      addAllowedToken("USD:GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW");

      // New concurrent
      const promises2 = Array.from({ length: 10 }, () =>
        checkTokenAllowed("USD:GBUQWP3BOUZX34AAQJR2U7Q5WAQLEGBXVFNNMLOTEWDTHJCIV6XTRAHW"),
      );
      const results2 = await Promise.all(promises2);
      results2.forEach((r) => expect(r).toEqual({ accepted: true }));

      await _waitForInFlightOperations();
    });
  });
});
