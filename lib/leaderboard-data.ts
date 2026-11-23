export interface LeaderboardUser {
  rank: number;
  name: string;
  avatarUrl?: string;
  profit: number;
  winRate: number;
  predictions: number;
  isCurrentUser?: boolean;
}

export const LEADERBOARD_ENTRY_COUNT = 100;
export const CURRENT_USER_INDEX = 42;
export const CURRENT_USER_NAME = "You (User)";

/**
 * Fixed seed for the mock leaderboard. Changing this value changes the mock
 * data (and therefore snapshots/tests), so treat it as part of the fixture.
 */
export const LEADERBOARD_SEED = 0x5eed_1234;

/**
 * Small deterministic PRNG (mulberry32).
 *
 * The mock leaderboard must not depend on non-deterministic randomness: the
 * same data has to render on the server and the client to avoid hydration
 * mismatches, and tests need stable values across runs and module resets.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build the mock leaderboard with the same value ranges as the previous
 * random implementation:
 *
 * - profit: 0.00 – 499.99 XLM
 * - winRate: 50 – 89 %
 * - predictions: 10 – 509
 *
 * Entries are returned in rank order (1…100); they are deliberately not sorted
 * by profit, because consumers own sorting and filtering. No avatar URLs are
 * generated: consumers render initials so the app makes no third-party image
 * requests.
 */
export function createLeaderboardData(
  seed: number = LEADERBOARD_SEED,
  count: number = LEADERBOARD_ENTRY_COUNT,
): LeaderboardUser[] {
  const random = mulberry32(seed);

  return Array.from({ length: count }, (_, index) => ({
    rank: index + 1,
    name: index === CURRENT_USER_INDEX ? CURRENT_USER_NAME : `Predictor_${index + 1}`,
    profit: Math.floor(random() * 50000) / 100,
    winRate: Math.floor(random() * 40) + 50,
    predictions: Math.floor(random() * 500) + 10,
    isCurrentUser: index === CURRENT_USER_INDEX,
  }));
}

export const mockLeaderboardData: LeaderboardUser[] = createLeaderboardData();
