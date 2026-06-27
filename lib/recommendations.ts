import type { Bet, CategoryColor } from "./types"

export interface RecommendedMarket {
  id: string
  title: string
  category: CategoryColor
  categoryLabel: string
  participants: number
  odds: number
  /** A recent market in this category resolved with a popular outcome — used as a ranking signal, not a data fetch. */
  isRecentWinner?: boolean
  href: string
}

export const CATEGORY_LABELS: Record<CategoryColor, string> = {
  football: "Football",
  politics: "Politics",
  crypto: "Crypto",
  stocks: "Stocks",
  entertainment: "Entertainment",
  sports: "Sports",
}

export const RECOMMENDATION_CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryColor[]

/**
 * Small, hand-curated candidate pool for the dashboard recommendation strip.
 * Deliberately separate from the full events/bets datasets — this strip only
 * ever surfaces a handful of cards, not the whole markets catalog.
 */
const CANDIDATE_MARKETS: RecommendedMarket[] = [
  { id: "rec-football-1", title: "Will Arsenal win the Premier League?", category: "football", categoryLabel: "Football", participants: 842, odds: 3.2, href: "/events" },
  { id: "rec-football-2", title: "Champions League: Real Madrid to reach the final?", category: "football", categoryLabel: "Football", participants: 1190, odds: 2.1, isRecentWinner: true, href: "/events" },
  { id: "rec-politics-1", title: "Will the EU agree on the new trade deal by Q3?", category: "politics", categoryLabel: "Politics", participants: 410, odds: 1.8, href: "/events" },
  { id: "rec-politics-2", title: "US Senate majority after the midterms?", category: "politics", categoryLabel: "Politics", participants: 670, odds: 2.4, isRecentWinner: true, href: "/events" },
  { id: "rec-crypto-1", title: "Will BTC close above $100k this month?", category: "crypto", categoryLabel: "Crypto", participants: 2310, odds: 1.6, isRecentWinner: true, href: "/events" },
  { id: "rec-crypto-2", title: "ETH ETF approval before year end?", category: "crypto", categoryLabel: "Crypto", participants: 980, odds: 2.9, href: "/events" },
  { id: "rec-stocks-1", title: "Will NVDA beat its Q2 earnings estimate?", category: "stocks", categoryLabel: "Stocks", participants: 530, odds: 1.9, href: "/events" },
  { id: "rec-entertainment-1", title: "Best Picture winner at next year's Oscars?", category: "entertainment", categoryLabel: "Entertainment", participants: 305, odds: 4.1, href: "/events" },
  { id: "rec-sports-1", title: "Will the Lakers make the playoffs?", category: "sports", categoryLabel: "Sports", participants: 720, odds: 1.7, isRecentWinner: true, href: "/events" },
]

/**
 * Ranks categories by how often they appear in the given bets — the "top
 * categories" half of the heuristic. Returns [] for a user with no bets yet
 * (new user), which is the empty-state trigger.
 */
export function getTopCategories(bets: Pick<Bet, "category">[], limit = 2): CategoryColor[] {
  const counts = new Map<CategoryColor, number>()
  for (const bet of bets) {
    const category = bet.category.color
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category]) => category)
}

/**
 * Lightweight recommendation heuristic: only consider markets in the given
 * categories, then rank "recent winner" markets (social proof) above plain
 * popularity. Returns [] when there are no candidates for the given
 * categories — e.g. when `categories` itself is empty.
 */
export function getRecommendedMarkets(categories: CategoryColor[], limit = 6): RecommendedMarket[] {
  if (categories.length === 0) return []

  return CANDIDATE_MARKETS.filter((market) => categories.includes(market.category))
    .sort((a, b) => {
      if (!!a.isRecentWinner !== !!b.isRecentWinner) return a.isRecentWinner ? -1 : 1
      return b.participants - a.participants
    })
    .slice(0, limit)
}
