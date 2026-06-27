"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Sparkles, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CATEGORY_LABELS,
  RECOMMENDATION_CATEGORIES,
  getRecommendedMarkets,
  getTopCategories,
  type RecommendedMarket,
} from "@/lib/recommendations"
import { mockActiveBets } from "@/lib/mock-data"
import type { Bet, CategoryColor } from "@/lib/types"

interface RecommendationsStripProps {
  /** Signal source for the "top categories" heuristic. Defaults to the user's active bets. */
  bets?: Pick<Bet, "category">[]
  className?: string
}

/**
 * A market card distinct from ActiveBetCard on purpose: lighter border, no
 * thumbnail/progress bar, and a "Suggested" chip instead of a colored
 * category chip — this is a lower-commitment discovery surface, not a bet
 * the user is tracking.
 */
function RecommendationCard({ market }: { market: RecommendedMarket }) {
  return (
    <Link
      href={market.href}
      className={cn(
        "flex-shrink-0 snap-start rounded-xl border border-border/30 bg-card/20 p-4",
        "w-[calc(100vw-3rem)] max-w-[260px] sm:w-[260px]",
        "hover:bg-card/40 hover:border-border/50",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
        "transition-all duration-200"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Suggested
        </Badge>
        {market.isRecentWinner && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" aria-hidden="true" />
            Trending
          </span>
        )}
      </div>

      <h3 className="mb-2 text-sm font-semibold leading-tight text-foreground">{market.title}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{market.categoryLabel}</p>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{market.participants.toLocaleString()} participants</span>
        <span className="font-mono font-medium text-foreground">{market.odds.toFixed(1)}x</span>
      </div>
    </Link>
  )
}

function CategoryPreferenceChips({ onSelect }: { onSelect: (category: CategoryColor) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Pick a category you're interested in">
      {RECOMMENDATION_CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onSelect(category)}
          className={cn(
            "rounded-full border border-border/50 bg-card/30 px-3 py-1.5 text-xs font-medium text-foreground",
            "hover:border-primary/50 hover:bg-card/50",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            "transition-colors"
          )}
        >
          {CATEGORY_LABELS[category]}
        </button>
      ))}
    </div>
  )
}

function EmptyState({ onSelectCategory }: { onSelectCategory: (category: CategoryColor) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/40 px-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
        <Sparkles className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">No suggestions yet</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Place a bet or pick a category below and we&apos;ll start surfacing markets you might like.
        </p>
      </div>
      <CategoryPreferenceChips onSelect={onSelectCategory} />
    </div>
  )
}

export function RecommendationsStrip({ bets = mockActiveBets, className }: RecommendationsStripProps) {
  const [manualCategories, setManualCategories] = useState<CategoryColor[] | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const categories = manualCategories ?? getTopCategories(bets)
  const markets = useMemo(() => getRecommendedMarkets(categories), [categories])

  const updateScrollState = () => {
    const el = scrollContainerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }

  useEffect(() => {
    updateScrollState()
  }, [markets])

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current
    if (!el) return
    const amount = el.clientWidth
    el.scrollTo({ left: direction === "left" ? el.scrollLeft - amount : el.scrollLeft + amount, behavior: "smooth" })
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft" && canScrollLeft) {
      event.preventDefault()
      scroll("left")
    } else if (event.key === "ArrowRight" && canScrollRight) {
      event.preventDefault()
      scroll("right")
    }
  }

  return (
    <section className={cn("w-full", className)} aria-labelledby="recommendations-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="recommendations-heading" className="text-xl font-bold text-foreground">
          Markets you might like
        </h2>
      </div>

      {markets.length === 0 ? (
        <EmptyState onSelectCategory={(category) => setManualCategories([category])} />
      ) : (
        <div className="relative group">
          {canScrollLeft && (
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full border-border/50 bg-background/80 opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-background/90 group-hover:opacity-100"
              onClick={() => scroll("left")}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {canScrollRight && (
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full border-border/50 bg-background/80 opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-background/90 group-hover:opacity-100"
              onClick={() => scroll("right")}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          <div
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory px-1 pb-2 sm:gap-4 sm:px-0"
            onScroll={updateScrollState}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="region"
            aria-label="Markets you might like carousel"
          >
            {markets.map((market) => (
              <RecommendationCard key={market.id} market={market} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
