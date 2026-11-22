/**
 * Pure portfolio analytics engine for computing realised/unrealised P&L,
 * ROI, win rate, category breakdowns, and cumulative P&L time series.
 *
 * Uses integer stroops (1 unit = 10^7 stroops) backed by BigInt to avoid
 * IEEE-754 floating-point drift across small decimals and large numbers.
 */

export type PositionStatus = "open" | "won" | "lost" | "void";

export interface Position {
  marketId: string;
  category: string;
  side: string;
  stake: number;
  payout?: number;
  currentValue?: number;
  status: PositionStatus;
  openedAt: Date | string | number;
  closedAt?: Date | string | number;
  title?: string;
}

export interface ComputePortfolioOptions {
  now?: Date | string | number;
}

export interface PortfolioTotals {
  invested: number;
  realisedPnl: number;
  unrealisedPnl: number;
  totalPnl: number;
  /** Return on investment as a percentage (e.g. -100 for -100%, 25 for +25%). 0 when invested is 0. */
  roi: number;
}

export interface CategoryBreakdown {
  category: string;
  invested: number;
  realisedPnl: number;
  unrealisedPnl: number;
  totalPnl: number;
  roi: number;
  /** Win rate as a percentage (0–100), or undefined when there are no settled won/lost positions. */
  winRate: number | undefined;
  wins: number;
  losses: number;
  openCount: number;
  voidCount: number;
  positionCount: number;
}

export interface PnlTimeSeriesPoint {
  timestamp: string;
  date: string;
  pnl: number;
  cumulativePnl: number;
}

export interface PortfolioSummary {
  totals: PortfolioTotals;
  /** Overall win rate as a percentage (0–100), or undefined when there are 0 closed won/lost positions. */
  winRate: number | undefined;
  wins: number;
  losses: number;
  openCount: number;
  voidCount: number;
  byCategory: CategoryBreakdown[];
  timeSeries: PnlTimeSeriesPoint[];
}

const STROOPS_DECIMALS = 7;
const STROOPS_SCALE = 10_000_000n;
const PERCENT_SCALE = 10_000n; // 4 decimal places for percentages

/**
 * Converts a finite decimal number to integer stroops (10^7 scale) using BigInt
 * to avoid floating-point drift.
 */
export function toStroops(value: number): bigint {
  if (!Number.isFinite(value) || value === 0) {
    return 0n;
  }

  const fixed = value.toFixed(STROOPS_DECIMALS);
  const negative = fixed.startsWith("-");
  const unsigned = negative ? fixed.slice(1) : fixed;
  const [wholePart, fracPart = ""] = unsigned.split(".");
  const paddedFrac = fracPart.padEnd(STROOPS_DECIMALS, "0").slice(0, STROOPS_DECIMALS);
  const stroops = BigInt(wholePart + paddedFrac);
  return negative ? -stroops : stroops;
}

/**
 * Converts integer stroops (BigInt) back to a JS number without float division drift.
 */
export function fromStroops(stroops: bigint): number {
  if (stroops === 0n) {
    return 0;
  }

  const negative = stroops < 0n;
  const abs = negative ? -stroops : stroops;
  const whole = abs / STROOPS_SCALE;
  const frac = (abs % STROOPS_SCALE)
    .toString()
    .padStart(STROOPS_DECIMALS, "0")
    .replace(/0+$/, "");

  const str = `${negative ? "-" : ""}${whole.toString()}${frac ? `.${frac}` : ""}`;
  return Number(str);
}

/**
 * Computes (numerator / denominator) * 100 rounded to 4 decimal places using BigInt.
 */
function computePercentage(numerator: bigint, denominator: bigint): number {
  if (denominator === 0n) {
    return 0;
  }

  const scaled = numerator * 100n * PERCENT_SCALE;
  const half = denominator / 2n;
  const rounded = scaled >= 0n ? (scaled + half) / denominator : (scaled - half) / denominator;
  return Number(rounded) / Number(PERCENT_SCALE);
}

function toTimestampMs(input: Date | string | number | undefined, fallbackMs: number): number {
  if (input === undefined) {
    return fallbackMs;
  }
  const ms = input instanceof Date ? input.getTime() : new Date(input).getTime();
  return Number.isFinite(ms) ? ms : fallbackMs;
}

interface CategoryAccumulator {
  invested: bigint;
  realisedPnl: bigint;
  unrealisedPnl: bigint;
  wins: number;
  losses: number;
  openCount: number;
  voidCount: number;
  positionCount: number;
}

/**
 * Computes portfolio totals, win rate, per-category breakdown, and a
 * chronologically ordered cumulative P&L time series from a list of positions.
 */
export function computePortfolio(
  positions: readonly Position[],
  options: ComputePortfolioOptions = {}
): PortfolioSummary {
  const nowMs = toTimestampMs(options.now, Date.now());

  let totalInvested = 0n;
  let totalRealisedPnl = 0n;
  let totalUnrealisedPnl = 0n;
  let totalWins = 0;
  let totalLosses = 0;
  let totalOpen = 0;
  let totalVoid = 0;

  const categoryMap = new Map<string, CategoryAccumulator>();
  const pnlByTimestamp = new Map<number, bigint>();

  for (const position of positions) {
    const categoryKey = position.category.trim() || "Uncategorized";
    let acc = categoryMap.get(categoryKey);
    if (!acc) {
      acc = {
        invested: 0n,
        realisedPnl: 0n,
        unrealisedPnl: 0n,
        wins: 0,
        losses: 0,
        openCount: 0,
        voidCount: 0,
        positionCount: 0,
      };
      categoryMap.set(categoryKey, acc);
    }

    acc.positionCount += 1;

    const stakeStroops = toStroops(Math.max(0, Number.isFinite(position.stake) ? position.stake : 0));

    if (position.status === "void") {
      // Stake is returned; excluded from invested, P&L, and win rate.
      totalVoid += 1;
      acc.voidCount += 1;
      const eventMs = toTimestampMs(position.closedAt ?? position.openedAt, nowMs);
      pnlByTimestamp.set(eventMs, (pnlByTimestamp.get(eventMs) ?? 0n) + 0n);
      continue;
    }

    totalInvested += stakeStroops;
    acc.invested += stakeStroops;

    if (position.status === "won" || position.status === "lost") {
      const payoutValue =
        position.payout !== undefined && Number.isFinite(position.payout)
          ? Math.max(0, position.payout)
          : 0;
      const payoutStroops = toStroops(payoutValue);
      const pnlStroops = payoutStroops - stakeStroops;

      totalRealisedPnl += pnlStroops;
      acc.realisedPnl += pnlStroops;

      if (position.status === "won") {
        totalWins += 1;
        acc.wins += 1;
      } else {
        totalLosses += 1;
        acc.losses += 1;
      }

      const eventMs = toTimestampMs(position.closedAt ?? position.openedAt, nowMs);
      pnlByTimestamp.set(eventMs, (pnlByTimestamp.get(eventMs) ?? 0n) + pnlStroops);
    } else {
      // Open position: mark-to-market using currentValue when available, else 0 unrealised P&L.
      totalOpen += 1;
      acc.openCount += 1;

      const unrealisedStroops =
        position.currentValue !== undefined && Number.isFinite(position.currentValue)
          ? toStroops(Math.max(0, position.currentValue)) - stakeStroops
          : 0n;

      totalUnrealisedPnl += unrealisedStroops;
      acc.unrealisedPnl += unrealisedStroops;

      pnlByTimestamp.set(nowMs, (pnlByTimestamp.get(nowMs) ?? 0n) + unrealisedStroops);
    }
  }

  const totalPnlStroops = totalRealisedPnl + totalUnrealisedPnl;
  const totalSettled = totalWins + totalLosses;

  const byCategory: CategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([category, acc]) => {
      const catTotalPnl = acc.realisedPnl + acc.unrealisedPnl;
      const catSettled = acc.wins + acc.losses;
      return {
        category,
        invested: fromStroops(acc.invested),
        realisedPnl: fromStroops(acc.realisedPnl),
        unrealisedPnl: fromStroops(acc.unrealisedPnl),
        totalPnl: fromStroops(catTotalPnl),
        roi: computePercentage(catTotalPnl, acc.invested),
        winRate:
          catSettled > 0 ? computePercentage(BigInt(acc.wins), BigInt(catSettled)) : undefined,
        wins: acc.wins,
        losses: acc.losses,
        openCount: acc.openCount,
        voidCount: acc.voidCount,
        positionCount: acc.positionCount,
      };
    })
    .sort((a, b) => {
      if (b.invested !== a.invested) {
        return b.invested - a.invested;
      }
      return a.category.localeCompare(b.category);
    });

  const sortedTimestamps = Array.from(pnlByTimestamp.keys()).sort((a, b) => a - b);
  let runningCumulative = 0n;
  const timeSeries: PnlTimeSeriesPoint[] = sortedTimestamps.map((ms) => {
    const delta = pnlByTimestamp.get(ms) ?? 0n;
    runningCumulative += delta;
    const iso = new Date(ms).toISOString();
    return {
      timestamp: iso,
      date: iso.slice(0, 10),
      pnl: fromStroops(delta),
      cumulativePnl: fromStroops(runningCumulative),
    };
  });

  return {
    totals: {
      invested: fromStroops(totalInvested),
      realisedPnl: fromStroops(totalRealisedPnl),
      unrealisedPnl: fromStroops(totalUnrealisedPnl),
      totalPnl: fromStroops(totalPnlStroops),
      roi: computePercentage(totalPnlStroops, totalInvested),
    },
    winRate:
      totalSettled > 0 ? computePercentage(BigInt(totalWins), BigInt(totalSettled)) : undefined,
    wins: totalWins,
    losses: totalLosses,
    openCount: totalOpen,
    voidCount: totalVoid,
    byCategory,
    timeSeries,
  };
}
