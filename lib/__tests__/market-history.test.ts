import {
  DEFAULT_HISTORY_RANGE,
  HISTORY_RANGES,
  type OddsPoint,
  downsample,
  getOddsHistory,
  parseHistoryRange,
} from "../market-history";

const FIXED_NOW = Date.UTC(2026, 5, 1, 12, 0, 0);
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

describe("lib/market-history", () => {
  describe("parseHistoryRange", () => {
    it("accepts all valid ranges", () => {
      for (const range of HISTORY_RANGES) {
        expect(parseHistoryRange(range)).toBe(range);
      }
    });

    it("falls back to default 7D for invalid or missing values", () => {
      expect(parseHistoryRange(null)).toBe(DEFAULT_HISTORY_RANGE);
      expect(parseHistoryRange(undefined)).toBe(DEFAULT_HISTORY_RANGE);
      expect(parseHistoryRange("")).toBe(DEFAULT_HISTORY_RANGE);
      expect(parseHistoryRange("90D")).toBe(DEFAULT_HISTORY_RANGE);
      expect(parseHistoryRange("7d")).toBe(DEFAULT_HISTORY_RANGE);
    });
  });

  describe("getOddsHistory", () => {
    it("returns deterministic series for the same marketId, range, and now", async () => {
      const first = await getOddsHistory("market-123", "7D", { now: FIXED_NOW });
      const second = await getOddsHistory("market-123", "7D", { now: FIXED_NOW });
      expect(first).toEqual(second);
      expect(first.length).toBeGreaterThan(2);
    });

    it("returns distinct series for different marketIds", async () => {
      const a = await getOddsHistory("market-alpha", "7D", { now: FIXED_NOW });
      const b = await getOddsHistory("market-beta", "7D", { now: FIXED_NOW });
      expect(a).not.toEqual(b);
    });

    it("returns probabilities bounded within [1, 99] in chronological order", async () => {
      for (const range of HISTORY_RANGES) {
        const points = await getOddsHistory("world-cup-2026", range, {
          now: FIXED_NOW,
        });
        expect(points.length).toBeGreaterThan(0);
        for (let i = 0; i < points.length; i++) {
          expect(points[i].probability).toBeGreaterThanOrEqual(1);
          expect(points[i].probability).toBeLessThanOrEqual(99);
          if (i > 0) {
            expect(points[i].t).toBeGreaterThan(points[i - 1].t);
          }
        }
      }
    });

    it("returns empty array for unknown or blank market ids", async () => {
      for (const badId of ["", "   ", "not-found", "404", "empty", "invalid", "unknown"]) {
        const result = await getOddsHistory(badId, "7D", { now: FIXED_NOW });
        expect(result).toEqual([]);
      }
    });

    it("handles All range over a market younger than 1 day", async () => {
      const createdAt = FIXED_NOW - 6 * HOUR_MS; // 6 hours old
      const points = await getOddsHistory("young-market", "All", {
        now: FIXED_NOW,
        createdAt,
      });
      expect(points.length).toBeGreaterThan(2);
      expect(points[0].t).toBeGreaterThanOrEqual(createdAt);
      expect(points[points.length - 1].t).toBe(FIXED_NOW);
    });

    it("handles single data point when createdAt equals now", async () => {
      const points = await getOddsHistory("brand-new-market", "1D", {
        now: FIXED_NOW,
        createdAt: FIXED_NOW,
      });
      expect(points).toHaveLength(1);
      expect(points[0].t).toBe(FIXED_NOW);
    });
  });

  describe("downsample", () => {
    const makeSeries = (count: number): OddsPoint[] =>
      Array.from({ length: count }, (_, i) => ({
        t: FIXED_NOW - (count - 1 - i) * HOUR_MS,
        probability: 50 + Math.sin(i / 3) * 20,
      }));

    it("returns empty array when maxPoints <= 0 or input is empty", () => {
      expect(downsample([], 10)).toEqual([]);
      expect(downsample(makeSeries(10), 0)).toEqual([]);
      expect(downsample(makeSeries(10), -5)).toEqual([]);
    });

    it("returns a shallow copy when series length <= maxPoints", () => {
      const series = makeSeries(5);
      const result = downsample(series, 10);
      expect(result).toEqual(series);
      expect(result).not.toBe(series);
    });

    it("handles maxPoints === 1 and maxPoints === 2", () => {
      const series = makeSeries(20);
      expect(downsample(series, 1)).toEqual([series[series.length - 1]]);
      expect(downsample(series, 2)).toEqual([series[0], series[series.length - 1]]);
    });

    it("downsamples long series to exact maxPoints while preserving endpoints and order", () => {
      const series = makeSeries(500);
      const result = downsample(series, 50);
      expect(result).toHaveLength(50);
      expect(result[0]).toEqual(series[0]);
      expect(result[result.length - 1]).toEqual(series[series.length - 1]);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].t).toBeGreaterThan(result[i - 1].t);
      }
    });

    it("handles flat series cleanly", () => {
      const flat: OddsPoint[] = Array.from({ length: 100 }, (_, i) => ({
        t: FIXED_NOW - (99 - i) * DAY_MS,
        probability: 50,
      }));
      const result = downsample(flat, 20);
      expect(result).toHaveLength(20);
      expect(result.every((p) => p.probability === 50)).toBe(true);
    });
  });
});
