/**
 * Unit tests for command palette recents manager
 */

import {
  getRecentMarkets,
  addRecentMarket,
  clearRecentMarkets,
  RecentMarket
} from "../recents";

describe("Recents Manager", () => {
  beforeEach(() => {
    clearRecentMarkets();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return an empty list initially", () => {
    expect(getRecentMarkets()).toEqual([]);
  });

  it("should add a visited market and assign a timestamp", () => {
    const market = { id: "1", title: "Arsenal vs Liverpool", category: "Football", odds: 7.0 };
    const now = Date.now();
    jest.setSystemTime(now);

    addRecentMarket(market);

    const recents = getRecentMarkets();
    expect(recents.length).toBe(1);
    expect(recents[0]).toEqual({
      ...market,
      visitedAt: now
    });
  });

  it("should maintain ranking by visit recency (most recent first)", () => {
    const m1 = { id: "1", title: "Market 1", category: "Football", odds: 7.0 };
    const m2 = { id: "2", title: "Market 2", category: "Politics", odds: 5.0 };

    addRecentMarket(m1);
    jest.advanceTimersByTime(1000);
    addRecentMarket(m2);

    const recents = getRecentMarkets();
    expect(recents.length).toBe(2);
    expect(recents[0].id).toBe("2");
    expect(recents[1].id).toBe("1");
  });

  it("should deduplicate visits to the same market and move it to the top", () => {
    const m1 = { id: "1", title: "Market 1", category: "Football", odds: 7.0 };
    const m2 = { id: "2", title: "Market 2", category: "Politics", odds: 5.0 };

    addRecentMarket(m1);
    jest.advanceTimersByTime(1000);
    addRecentMarket(m2);
    jest.advanceTimersByTime(1000);
    addRecentMarket(m1); // Re-visit market 1

    const recents = getRecentMarkets();
    expect(recents.length).toBe(2);
    expect(recents[0].id).toBe("1"); // Market 1 moves to the top
    expect(recents[1].id).toBe("2");
  });

  it("should enforce a limit of 5 recent markets", () => {
    for (let i = 1; i <= 7; i++) {
      addRecentMarket({
        id: `m-${i}`,
        title: `Market ${i}`,
        category: "Football",
        odds: 2.0
      });
      jest.advanceTimersByTime(100);
    }

    const recents = getRecentMarkets();
    expect(recents.length).toBe(5);
    // Should contain the last 5 added: m-7, m-6, m-5, m-4, m-3
    expect(recents.map(r => r.id)).toEqual(["m-7", "m-6", "m-5", "m-4", "m-3"]);
  });

  it("should auto-prune items older than 30 days (TTL validation)", () => {
    const mOld = { id: "old", title: "Old Market", category: "Crypto", odds: 1.5 };
    const mNew = { id: "new", title: "New Market", category: "Crypto", odds: 2.5 };

    // Visit Old Market
    addRecentMarket(mOld);

    // Advance time by 31 days (31 * 24 * 60 * 60 * 1000 ms)
    jest.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);

    // Visit New Market
    addRecentMarket(mNew);

    const recents = getRecentMarkets();
    expect(recents.length).toBe(1);
    expect(recents[0].id).toBe("new"); // Old market is pruned
  });

  it("should tolerate localStorage errors gracefully", () => {
    // Mock localStorage to throw an error
    const spyGet = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage full or disabled");
    });
    const spySet = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage full or disabled");
    });

    expect(() => getRecentMarkets()).not.toThrow();
    expect(() => addRecentMarket({ id: "1", title: "Test", category: "Crypto", odds: 2.0 })).not.toThrow();

    spyGet.mockRestore();
    spySet.mockRestore();
  });
});
