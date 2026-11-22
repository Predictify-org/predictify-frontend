import {
  computePortfolio,
  fromStroops,
  toStroops,
  type Position,
} from "../portfolio-analytics";
import { allTransactions, mapMockDataToPositions, mockActiveBets } from "../mock-data";

describe("stroops decimal-safe helpers", () => {
  it("converts decimal values without floating-point drift", () => {
    const sum = toStroops(0.1) + toStroops(0.2);
    expect(fromStroops(sum)).toBe(0.3);
  });

  it("preserves 7-decimal stroop precision", () => {
    const a = toStroops(0.0000001);
    const b = toStroops(0.0000002);
    expect(fromStroops(a + b)).toBe(0.0000003);
  });

  it("handles large numbers without overflow", () => {
    const large = toStroops(1_000_000_000.25) + toStroops(2_000_000_000.75);
    expect(fromStroops(large)).toBe(3_000_000_001);
  });

  it("handles non-finite values safely", () => {
    expect(toStroops(Number.NaN)).toBe(0n);
    expect(toStroops(Number.POSITIVE_INFINITY)).toBe(0n);
    expect(toStroops(Number.NEGATIVE_INFINITY)).toBe(0n);
  });
});

describe("computePortfolio", () => {
  const fixedNow = new Date("2025-06-15T12:00:00.000Z");

  it("computes hand-verified totals, ROI, win rate, and per-category breakdown", () => {
    const fixture: Position[] = [
      {
        marketId: "m-1",
        category: "Sports",
        side: "yes",
        stake: 100,
        payout: 250,
        status: "won",
        openedAt: "2025-06-01T10:00:00.000Z",
        closedAt: "2025-06-02T10:00:00.000Z",
      },
      {
        marketId: "m-2",
        category: "Sports",
        side: "no",
        stake: 50,
        payout: 0,
        status: "lost",
        openedAt: "2025-06-02T11:00:00.000Z",
        closedAt: "2025-06-03T10:00:00.000Z",
      },
      {
        marketId: "m-3",
        category: "Crypto",
        side: "yes",
        stake: 200,
        currentValue: 260,
        status: "open",
        openedAt: "2025-06-04T09:00:00.000Z",
      },
      {
        marketId: "m-4",
        category: "Crypto",
        side: "yes",
        stake: 75,
        payout: 75,
        status: "void",
        openedAt: "2025-06-05T09:00:00.000Z",
        closedAt: "2025-06-05T12:00:00.000Z",
      },
    ];

    const result = computePortfolio(fixture, { now: fixedNow });

    // Non-void invested = 100 + 50 + 200 = 350
    // Realised P&L = (250 - 100) + (0 - 50) = +150 - 50 = +100
    // Unrealised P&L = 260 - 200 = +60
    // Total P&L = +160
    // ROI = (160 / 350) * 100 = 45.7143%
    // Win rate = 1 / 2 = 50% (void excluded)
    expect(result.totals.invested).toBe(350);
    expect(result.totals.realisedPnl).toBe(100);
    expect(result.totals.unrealisedPnl).toBe(60);
    expect(result.totals.totalPnl).toBe(160);
    expect(result.totals.roi).toBeCloseTo(45.7143, 4);
    expect(result.winRate).toBe(50);
    expect(result.wins).toBe(1);
    expect(result.losses).toBe(1);
    expect(result.openCount).toBe(1);
    expect(result.voidCount).toBe(1);

    // Categories sorted by invested desc: Crypto (200), Sports (150)
    expect(result.byCategory).toHaveLength(2);
    const crypto = result.byCategory.find((c) => c.category === "Crypto")!;
    const sports = result.byCategory.find((c) => c.category === "Sports")!;

    expect(crypto.invested).toBe(200);
    expect(crypto.realisedPnl).toBe(0);
    expect(crypto.unrealisedPnl).toBe(60);
    expect(crypto.roi).toBe(30);
    expect(crypto.winRate).toBeUndefined();
    expect(crypto.voidCount).toBe(1);

    expect(sports.invested).toBe(150);
    expect(sports.realisedPnl).toBe(100);
    expect(sports.unrealisedPnl).toBe(0);
    expect(sports.roi).toBeCloseTo(66.6667, 4);
    expect(sports.winRate).toBe(50);
  });

  it("handles an empty portfolio without NaN or Infinity", () => {
    const result = computePortfolio([], { now: fixedNow });

    expect(result.totals).toEqual({
      invested: 0,
      realisedPnl: 0,
      unrealisedPnl: 0,
      totalPnl: 0,
      roi: 0,
    });
    expect(result.winRate).toBeUndefined();
    expect(result.byCategory).toEqual([]);
    expect(result.timeSeries).toEqual([]);
  });

  it("handles an all-void portfolio", () => {
    const positions: Position[] = [
      {
        marketId: "v-1",
        category: "Politics",
        side: "yes",
        stake: 100,
        payout: 100,
        status: "void",
        openedAt: "2025-05-01T00:00:00.000Z",
        closedAt: "2025-05-02T00:00:00.000Z",
      },
      {
        marketId: "v-2",
        category: "Politics",
        side: "no",
        stake: 250,
        status: "void",
        openedAt: "2025-05-03T00:00:00.000Z",
        closedAt: "2025-05-04T00:00:00.000Z",
      },
    ];

    const result = computePortfolio(positions, { now: fixedNow });

    expect(result.totals.invested).toBe(0);
    expect(result.totals.realisedPnl).toBe(0);
    expect(result.totals.unrealisedPnl).toBe(0);
    expect(result.totals.totalPnl).toBe(0);
    expect(result.totals.roi).toBe(0);
    expect(result.winRate).toBeUndefined();
    expect(result.voidCount).toBe(2);
    expect(Number.isNaN(result.totals.roi)).toBe(false);
  });

  it("handles a single losing bet with ROI -100%", () => {
    const positions: Position[] = [
      {
        marketId: "loss-1",
        category: "Sports",
        side: "yes",
        stake: 120,
        payout: 0,
        status: "lost",
        openedAt: "2025-05-10T00:00:00.000Z",
        closedAt: "2025-05-11T00:00:00.000Z",
      },
    ];

    const result = computePortfolio(positions, { now: fixedNow });

    expect(result.totals.invested).toBe(120);
    expect(result.totals.realisedPnl).toBe(-120);
    expect(result.totals.roi).toBe(-100);
    expect(result.winRate).toBe(0);
  });

  it("handles a win with payout < stake (negative realised P&L, still counts as win)", () => {
    const positions: Position[] = [
      {
        marketId: "partial-win",
        category: "Crypto",
        side: "yes",
        stake: 100,
        payout: 80,
        status: "won",
        openedAt: "2025-05-10T00:00:00.000Z",
        closedAt: "2025-05-11T00:00:00.000Z",
      },
    ];

    const result = computePortfolio(positions, { now: fixedNow });

    expect(result.totals.realisedPnl).toBe(-20);
    expect(result.totals.roi).toBe(-20);
    expect(result.winRate).toBe(100);
    expect(result.wins).toBe(1);
    expect(result.losses).toBe(0);
  });

  it("handles zero stake positions without NaN or Infinity", () => {
    const positions: Position[] = [
      {
        marketId: "zero-1",
        category: "General",
        side: "yes",
        stake: 0,
        payout: 0,
        status: "won",
        openedAt: "2025-05-10T00:00:00.000Z",
        closedAt: "2025-05-11T00:00:00.000Z",
      },
    ];

    const result = computePortfolio(positions, { now: fixedNow });

    expect(result.totals.invested).toBe(0);
    expect(result.totals.roi).toBe(0);
    expect(Number.isFinite(result.totals.roi)).toBe(true);
    expect(result.winRate).toBe(100);
  });

  it("handles open positions with no currentValue and 0 closed positions", () => {
    const positions: Position[] = [
      {
        marketId: "open-1",
        category: "Stocks",
        side: "yes",
        stake: 300,
        status: "open",
        openedAt: "2025-06-01T00:00:00.000Z",
      },
    ];

    const result = computePortfolio(positions, { now: fixedNow });

    expect(result.totals.invested).toBe(300);
    expect(result.totals.unrealisedPnl).toBe(0);
    expect(result.totals.realisedPnl).toBe(0);
    expect(result.totals.roi).toBe(0);
    expect(result.winRate).toBeUndefined();
    expect(result.openCount).toBe(1);
  });

  it("handles large numbers accurately", () => {
    const positions: Position[] = [
      {
        marketId: "whale-1",
        category: "Crypto",
        side: "yes",
        stake: 1_000_000_000,
        payout: 1_500_000_000.5,
        status: "won",
        openedAt: "2025-01-01T00:00:00.000Z",
        closedAt: "2025-01-02T00:00:00.000Z",
      },
    ];

    const result = computePortfolio(positions, { now: fixedNow });

    expect(result.totals.invested).toBe(1_000_000_000);
    expect(result.totals.realisedPnl).toBe(500_000_000.5);
    expect(result.totals.roi).toBe(50);
  });

  it("orders time series chronologically and aggregates same-timestamp positions", () => {
    const sameTs = "2025-06-05T10:00:00.000Z";
    const positions: Position[] = [
      {
        marketId: "late",
        category: "Sports",
        side: "yes",
        stake: 50,
        payout: 100,
        status: "won",
        openedAt: "2025-06-09T00:00:00.000Z",
        closedAt: "2025-06-10T00:00:00.000Z",
      },
      {
        marketId: "same-a",
        category: "Sports",
        side: "yes",
        stake: 100,
        payout: 140,
        status: "won",
        openedAt: "2025-06-01T00:00:00.000Z",
        closedAt: sameTs,
      },
      {
        marketId: "same-b",
        category: "Crypto",
        side: "no",
        stake: 20,
        payout: 0,
        status: "lost",
        openedAt: "2025-06-02T00:00:00.000Z",
        closedAt: sameTs,
      },
    ];

    const result = computePortfolio(positions, { now: fixedNow });

    expect(result.timeSeries).toHaveLength(2);
    // First point at sameTs: +40 - 20 = +20
    expect(result.timeSeries[0]).toEqual({
      timestamp: sameTs,
      date: "2025-06-05",
      pnl: 20,
      cumulativePnl: 20,
    });
    // Second point at 2025-06-10: +50 -> cumulative +70
    expect(result.timeSeries[1]).toEqual({
      timestamp: "2025-06-10T00:00:00.000Z",
      date: "2025-06-10",
      pnl: 50,
      cumulativePnl: 70,
    });
  });
});

describe("mapMockDataToPositions", () => {
  it("maps mock bets and transactions into Position[] excluding deposits and withdrawals", () => {
    const positions = mapMockDataToPositions(mockActiveBets, allTransactions);
    const nonTransferTxCount = allTransactions.filter(
      (tx) => tx.type !== "deposit" && tx.type !== "withdraw"
    ).length;

    expect(positions).toHaveLength(mockActiveBets.length + nonTransferTxCount);
    expect(positions.some((p) => p.status === "open")).toBe(true);
    expect(positions.some((p) => p.status === "won")).toBe(true);
    expect(positions.some((p) => p.status === "lost")).toBe(true);
    expect(positions.some((p) => p.status === "void")).toBe(true);
  });
});
