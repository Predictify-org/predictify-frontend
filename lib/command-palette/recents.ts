/**
 * Recents Manager
 *
 * Tracks the last 5 visited markets/events.
 * Persists data to localStorage with a 30-day TTL.
 */

export interface RecentMarket {
  id: string;
  title: string;
  category: string;
  odds: number;
  visitedAt: number; // Timestamp (ms)
}

const LOCAL_STORAGE_KEY = "command-palette.recent-markets";
const MAX_RECENTS = 5;
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

/**
 * Fetch the list of recently visited markets.
 * Auto-prunes expired items.
 */
export function getRecentMarkets(): RecentMarket[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return [];

    const parsed: RecentMarket[] = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    // Prune items older than 30 days
    const active = parsed.filter(item => now - item.visitedAt < TTL_MS);

    // Save pruned list back to localStorage if items were pruned
    if (active.length !== parsed.length) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(active));
    }

    return active.slice(0, MAX_RECENTS);
  } catch (e) {
    console.error("Failed to parse recent markets from localStorage", e);
    return [];
  }
}

/**
 * Add a market to the recently visited list.
 * Moves it to the top of the list if it already exists, and trims the list to 5 items.
 */
export function addRecentMarket(market: Omit<RecentMarket, "visitedAt">): void {
  if (typeof window === "undefined") return;

  try {
    const current = getRecentMarkets();
    const now = Date.now();

    // Filter out duplicate if it already exists, then prepend new visit
    const updated = [
      { ...market, visitedAt: now },
      ...current.filter(item => item.id !== market.id)
    ].slice(0, MAX_RECENTS);

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to add recent market to localStorage", e);
  }
}

/**
 * Clear all recent markets.
 */
export function clearRecentMarkets(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear recent markets from localStorage", e);
  }
}
