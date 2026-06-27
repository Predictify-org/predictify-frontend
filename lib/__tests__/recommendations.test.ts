import { getTopCategories, getRecommendedMarkets, RECOMMENDATION_CATEGORIES } from "../recommendations"
import type { Bet } from "../types"

function bet(category: Bet["category"]["color"]): Pick<Bet, "category"> {
  return { category: { name: category, color: category } }
}

describe("getTopCategories", () => {
  it("returns no categories for a user with no bets yet", () => {
    expect(getTopCategories([])).toEqual([])
  })

  it("ranks categories by frequency, most-bet first", () => {
    const bets = [bet("crypto"), bet("football"), bet("crypto"), bet("crypto"), bet("football")]
    expect(getTopCategories(bets)).toEqual(["crypto", "football"])
  })

  it("respects the limit", () => {
    const bets = [bet("crypto"), bet("football"), bet("stocks")]
    expect(getTopCategories(bets, 1)).toEqual(["crypto"])
  })
})

describe("getRecommendedMarkets", () => {
  it("returns no markets when there are no categories to recommend from", () => {
    expect(getRecommendedMarkets([])).toEqual([])
  })

  it("only returns markets in the requested categories", () => {
    const markets = getRecommendedMarkets(["stocks"])
    expect(markets.length).toBeGreaterThan(0)
    expect(markets.every((m) => m.category === "stocks")).toBe(true)
  })

  it("ranks recent-winner markets above plain popularity", () => {
    const markets = getRecommendedMarkets(["crypto"])
    expect(markets[0].isRecentWinner).toBe(true)
  })

  it("respects the limit", () => {
    const markets = getRecommendedMarkets(["football", "crypto", "politics", "stocks"], 2)
    expect(markets).toHaveLength(2)
  })

  it("has at least one candidate for every recommendation category", () => {
    for (const category of RECOMMENDATION_CATEGORIES) {
      expect(getRecommendedMarkets([category]).length).toBeGreaterThan(0)
    }
  })
})
