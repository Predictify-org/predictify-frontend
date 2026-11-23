import { buildWatchlist, filterWatchlist, sortWatchlist } from "@/lib/watchlist";

describe("watchlist helpers", () => {
  const markets = [
    { id: "a", title: "Alpha", category: "Crypto", status: "ongoing", endDate: "2026-12-01T00:00:00Z" },
    { id: "b", title: "Beta", category: "Politics", status: "upcoming", endDate: "2026-10-01T00:00:00Z" },
  ];

  it("aggregates a market in all three sources once", () => {
    const rows = buildWatchlist({
      bookmarkedIds: new Set(["a"]),
      followedIds: new Set(["a"]),
      savedIds: new Set(["a"]),
      markets,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].sources).toEqual(["bookmark", "follow", "saved"]);
  });

  it("shows stale ids as unavailable", () => {
    const rows = buildWatchlist({
      bookmarkedIds: new Set(["deleted"]),
      followedIds: new Set(),
      savedIds: new Set(),
      markets,
    });
    expect(rows[0].title).toBe("Market unavailable");
    expect(rows[0].category).toBe("Unknown");
  });

  it("filters and sorts rows", () => {
    const rows = buildWatchlist({
      bookmarkedIds: new Set(["a", "b"]),
      followedIds: new Set(),
      savedIds: new Set(),
      markets,
    });
    expect(filterWatchlist(rows, { category: "Crypto" })).toHaveLength(1);
    expect(sortWatchlist(rows, "title").map((row) => row.title)).toEqual(["Alpha", "Beta"]);
    expect(sortWatchlist(rows, "closing-soon")[0].marketId).toBe("b");
  });

  it("handles more than 100 entries", () => {
    const ids = new Set(Array.from({ length: 150 }, (_, index) => `id-${index}`));
    const largeMarkets = Array.from({ length: 150 }, (_, index) => ({
      id: `id-${index}`,
      title: `Market ${index}`,
      category: "Crypto",
      status: "ongoing",
    }));
    expect(buildWatchlist({
      bookmarkedIds: ids,
      followedIds: new Set(),
      savedIds: new Set(),
      markets: largeMarkets,
    })).toHaveLength(150);
  });
});
