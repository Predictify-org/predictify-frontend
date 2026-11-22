/**
 * Market odds history data provider and downsampling utilities.
 *
 * Provides a typed interface (`OddsHistoryProvider`) backed by a deterministic
 * seeded mock implementation so a real backend API can be swapped in without
 * changing chart consumers.
 */

export interface OddsPoint {
  /** Unix timestamp in milliseconds */
  t: number;
  /** Implied probability as a percentage in the range [0, 100] */
  probability: number;
}

export const HISTORY_RANGES = ["1D", "7D", "30D", "All"] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

export const DEFAULT_HISTORY_RANGE: HistoryRange = "7D";

export interface OddsHistoryOptions {
  /** Reference "current" timestamp in ms (defaults to Date.now()) */
  now?: number;
  /** Optional market creation timestamp in ms; series will not start before this */
  createdAt?: number;
  /** Maximum number of points to return after downsampling (defaults to 120) */
  maxPoints?: number;
}

export interface OddsHistoryProvider {
  getOddsHistory(
    marketId: string,
    range: HistoryRange,
    options?: OddsHistoryOptions
  ): Promise<OddsPoint[]>;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Known invalid/missing mock market IDs (mirrors app/markets/[id]/page.tsx). */
const UNKNOWN_MARKET_IDS = new Set([
  "not-found",
  "404",
  "empty",
  "invalid",
  "unknown",
]);

/**
 * Validates and normalizes an untrusted range string (e.g. from URL search params).
 * Falls back to `DEFAULT_HISTORY_RANGE` ("7D") for any invalid or missing value.
 */
export function parseHistoryRange(
  value: string | null | undefined
): HistoryRange {
  if (!value) return DEFAULT_HISTORY_RANGE;
  return (HISTORY_RANGES as readonly string[]).includes(value)
    ? (value as HistoryRange)
    : DEFAULT_HISTORY_RANGE;
}

/**
 * Deterministic 32-bit FNV-1a hash for seeding the mock PRNG from a market ID.
 */
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 deterministic PRNG returning floats in [0, 1).
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampProbability(value: number): number {
  return Math.round(Math.min(99, Math.max(1, value)) * 10) / 10;
}

/**
 * Downsamples a chronologically ordered odds series to at most `maxPoints`
 * using Largest-Triangle-Three-Buckets (LTTB), preserving the first and last
 * points as well as visual peaks and troughs.
 */
export function downsample(
  points: readonly OddsPoint[],
  maxPoints: number
): OddsPoint[] {
  if (maxPoints <= 0 || points.length === 0) {
    return [];
  }
  if (points.length <= maxPoints) {
    return points.slice();
  }
  if (maxPoints === 1) {
    return [points[points.length - 1]];
  }
  if (maxPoints === 2) {
    return [points[0], points[points.length - 1]];
  }

  const sampled: OddsPoint[] = [points[0]];
  const bucketSize = (points.length - 2) / (maxPoints - 2);
  let prevIndex = 0;

  for (let i = 0; i < maxPoints - 2; i++) {
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.min(
      Math.floor((i + 2) * bucketSize) + 1,
      points.length
    );

    let avgT = 0;
    let avgP = 0;
    const avgCount = Math.max(1, avgRangeEnd - avgRangeStart);
    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgT += points[j].t;
      avgP += points[j].probability;
    }
    avgT /= avgCount;
    avgP /= avgCount;

    const rangeStart = Math.floor(i * bucketSize) + 1;
    const rangeEnd = Math.min(
      Math.floor((i + 1) * bucketSize) + 1,
      points.length - 1
    );

    const pointAT = points[prevIndex].t;
    const pointAP = points[prevIndex].probability;

    let maxArea = -1;
    let selectedIndex = rangeStart;

    for (let j = rangeStart; j < rangeEnd; j++) {
      const area =
        Math.abs(
          (pointAT - avgT) * (points[j].probability - pointAP) -
            (pointAT - points[j].t) * (avgP - pointAP)
        ) * 0.5;
      if (area > maxArea) {
        maxArea = area;
        selectedIndex = j;
      }
    }

    sampled.push(points[selectedIndex]);
    prevIndex = selectedIndex;
  }

  sampled.push(points[points.length - 1]);
  return sampled;
}

const RANGE_DURATION_MS: Record<HistoryRange, number> = {
  "1D": 1 * DAY_MS,
  "7D": 7 * DAY_MS,
  "30D": 30 * DAY_MS,
  All: 90 * DAY_MS,
};

const RANGE_STEP_MS: Record<HistoryRange, number> = {
  "1D": 30 * 60 * 1000, // 30 minutes
  "7D": 2 * HOUR_MS, // 2 hours
  "30D": 6 * HOUR_MS, // 6 hours
  All: 12 * HOUR_MS, // 12 hours
};

/**
 * Deterministic seeded mock provider.
 * Generates a realistic bounded random-walk odds series per marketId and range.
 */
export const mockOddsHistoryProvider: OddsHistoryProvider = {
  async getOddsHistory(
    marketId: string,
    range: HistoryRange,
    options?: OddsHistoryOptions
  ): Promise<OddsPoint[]> {
    const trimmedId = marketId.trim();
    if (!trimmedId || UNKNOWN_MARKET_IDS.has(trimmedId.toLowerCase())) {
      return [];
    }

    const validRange = parseHistoryRange(range);
    const now = options?.now ?? Date.now();
    const maxPoints = options?.maxPoints ?? 120;

    // Default market age is 90 days unless caller specifies createdAt
    const defaultCreatedAt = now - 90 * DAY_MS;
    const createdAt =
      options?.createdAt !== undefined
        ? Math.min(options.createdAt, now)
        : defaultCreatedAt;

    const requestedStart = now - RANGE_DURATION_MS[validRange];
    const start = Math.max(requestedStart, createdAt);
    const span = now - start;

    const seed = hashString(`${trimmedId}:${validRange}`);
    const rand = mulberry32(seed);
    let currentProb = 25 + rand() * 50; // initial probability in [25, 75]

    // Edge case: market created at `now` (zero span) -> single data point
    if (span <= 0) {
      return [{ t: now, probability: clampProbability(currentProb) }];
    }

    // Choose a step that yields a sensible resolution even for markets younger than 1 day
    let step = RANGE_STEP_MS[validRange];
    if (span < step * 4) {
      step = Math.max(60 * 1000, Math.floor(span / 12));
    }

    const points: OddsPoint[] = [];
    const volatility = validRange === "1D" ? 2.2 : validRange === "7D" ? 3.2 : 4.2;

    for (let t = start; t < now; t += step) {
      points.push({ t, probability: clampProbability(currentProb) });
      // Mean-reverting random step so probabilities stay realistic
      const drift = (50 - currentProb) * 0.03;
      const shock = (rand() - 0.5) * 2 * volatility;
      currentProb = clampProbability(currentProb + drift + shock);
    }

    // Always include the latest point at `now`
    if (points.length === 0 || points[points.length - 1].t < now) {
      points.push({ t: now, probability: clampProbability(currentProb) });
    }

    return downsample(points, maxPoints);
  },
};

let activeProvider: OddsHistoryProvider = mockOddsHistoryProvider;

/**
 * Allows swapping the backing odds history provider (e.g. to a real API or test double).
 */
export function setOddsHistoryProvider(provider: OddsHistoryProvider): void {
  activeProvider = provider;
}

/**
 * Fetches historical odds points for a market and time range.
 */
export async function getOddsHistory(
  marketId: string,
  range: HistoryRange,
  options?: OddsHistoryOptions
): Promise<OddsPoint[]> {
  return activeProvider.getOddsHistory(marketId, range, options);
}
