export type WatchlistSource = "bookmark" | "follow" | "saved";

export interface WatchlistMarket {
  id: string;
  title?: string;
  category?: string;
  status?: string;
  endDate?: string;
  closesAt?: string;
  endsIn?: string;
}

export interface WatchlistRow {
  marketId: string;
  title: string;
  category: string;
  status: string;
  sources: WatchlistSource[];
  closesAt: string | null;
  recentlyAddedIndex?: number;
}

export type WatchlistSort = "closing-soon" | "recently-added" | "title";

export interface WatchlistFilters {
  source?: WatchlistSource | "all";
  category?: string | "all";
  status?: string | "all";
  query?: string;
}

export function buildWatchlist({
  bookmarkedIds,
  followedIds,
  savedIds,
  markets,
}: {
  bookmarkedIds: Iterable<string> | Set<string> | null | undefined;
  followedIds: Iterable<string> | Set<string> | null | undefined;
  savedIds: Iterable<string> | Set<string> | null | undefined;
  markets: readonly WatchlistMarket[];
}): WatchlistRow[] {
  const marketById = new Map(markets.map((market) => [market.id, market]));
  const grouped = new Map<string, { sources: WatchlistSource[]; index: number }>();
  let index = 0;

  const add = (ids: Iterable<string> | null | undefined, source: WatchlistSource) => {
    if (!ids) return;
    for (const marketId of ids) {
      if (typeof marketId !== "string" || !marketId) continue;
      const entry = grouped.get(marketId) ?? { sources: [], index: index++ };
      if (!entry.sources.includes(source)) entry.sources.push(source);
      grouped.set(marketId, entry);
    }
  };

  add(bookmarkedIds as Iterable<string>, "bookmark");
  add(followedIds as Iterable<string>, "follow");
  add(savedIds as Iterable<string>, "saved");

  return Array.from(grouped.entries()).map(([marketId, entry]) => {
    const market = marketById.get(marketId);
    if (!market) {
      return {
        marketId,
        title: "Market unavailable",
        category: "Unknown",
        status: "unknown",
        sources: entry.sources,
        closesAt: null,
        recentlyAddedIndex: entry.index,
      };
    }

    return {
      marketId,
      title: market.title ?? "Market unavailable",
      category: market.category ?? "Unknown",
      status: market.status ?? "unknown",
      sources: entry.sources,
      closesAt: market.closesAt ?? market.endDate ?? null,
      recentlyAddedIndex: entry.index,
    };
  });
}

export function sortWatchlist(
  rows: readonly WatchlistRow[],
  sort: WatchlistSort = "recently-added"
): WatchlistRow[] {
  const sorted = [...rows];
  if (sort === "title") {
    return sorted.sort((a, b) => a.title.localeCompare(b.title));
  }
  if (sort === "closing-soon") {
    return sorted.sort((a, b) => {
      const aTime = a.closesAt ? Date.parse(a.closesAt) : Number.POSITIVE_INFINITY;
      const bTime = b.closesAt ? Date.parse(b.closesAt) : Number.POSITIVE_INFINITY;
      if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return a.title.localeCompare(b.title);
      if (!Number.isFinite(aTime)) return 1;
      if (!Number.isFinite(bTime)) return -1;
      return aTime - bTime;
    });
  }
  return sorted.sort((a, b) => (b.recentlyAddedIndex ?? 0) - (a.recentlyAddedIndex ?? 0));
}

export function filterWatchlist(
  rows: readonly WatchlistRow[],
  filters: WatchlistFilters = {}
): WatchlistRow[] {
  const source = filters.source ?? "all";
  const category = filters.category ?? "all";
  const status = filters.status ?? "all";
  const query = filters.query?.trim().toLowerCase();

  return rows.filter((row) => {
    if (source !== "all" && !row.sources.includes(source)) return false;
    if (category !== "all" && row.category !== category) return false;
    if (status !== "all" && row.status !== status) return false;
    if (query && !row.title.toLowerCase().includes(query)) return false;
    return true;
  });
}
