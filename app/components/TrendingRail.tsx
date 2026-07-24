"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Flame, TrendingUp, Users } from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrendingMarket {
  id: string
  title: string
  category: string
  /** 24h volume, e.g. "$42.1k" */
  volume: string
  participants: number
  odds: number
  /** Visual marker: hot/trending if true */
  isHot?: boolean
  href: string
}

// ---------------------------------------------------------------------------
// Default trending markets (curated for the marketing home page)
// ---------------------------------------------------------------------------

export const TRENDING_MARKETS: TrendingMarket[] = [
  {
    id: "trending-btc",
    title: "Will BTC close above $100k this month?",
    category: "Crypto",
    volume: "$42.1k",
    participants: 2310,
    odds: 1.6,
    isHot: true,
    href: "/events",
  },
  {
    id: "trending-eth",
    title: "ETH ETF approval before year end?",
    category: "Crypto",
    volume: "$28.7k",
    participants: 980,
    odds: 2.9,
    isHot: true,
    href: "/events",
  },
  {
    id: "trending-ucl",
    title: "Champions League: Real Madrid to reach the final?",
    category: "Football",
    volume: "$35.2k",
    participants: 1190,
    odds: 2.1,
    href: "/events",
  },
  {
    id: "trending-senate",
    title: "US Senate majority after the midterms?",
    category: "Politics",
    volume: "$19.8k",
    participants: 670,
    odds: 2.4,
    href: "/events",
  },
  {
    id: "trending-nvda",
    title: "Will NVDA beat its Q2 earnings estimate?",
    category: "Stocks",
    volume: "$15.3k",
    participants: 530,
    odds: 1.9,
    href: "/events",
  },
  {
    id: "trending-lakers",
    title: "Will the Lakers make the playoffs?",
    category: "Sports",
    volume: "$22.4k",
    participants: 720,
    odds: 1.7,
    isHot: true,
    href: "/events",
  },
  {
    id: "trending-ai",
    title: "Will a major AI safety bill pass this quarter?",
    category: "Politics",
    volume: "$18.4k",
    participants: 340,
    odds: 3.5,
    href: "/events",
  },
  {
    id: "trending-oscar",
    title: "Best Picture winner at next year's Oscars?",
    category: "Entertainment",
    volume: "$8.9k",
    participants: 305,
    odds: 4.1,
    href: "/events",
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TrendingRailProps {
  /** Override the default trending markets. */
  markets?: TrendingMarket[]
  className?: string
}

/**
 * A horizontally-scrollable rail of trending prediction markets for the
 * marketing home page. Highlights markets with high 24h volume and activity.
 *
 * Features:
 * - Responsive horizontal carousel with snap scrolling
 * - Keyboard-navigable (ArrowLeft / ArrowRight)
 * - Hot markets get a flame badge
 * - Accessible: labelled region, ARIA controls
 */
export function TrendingRail({
  markets = TRENDING_MARKETS,
  className,
}: TrendingRailProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateScrollState = () => {
    const el = scrollContainerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(
      el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    )
  }

  useEffect(() => {
    updateScrollState()
  }, [markets])

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current
    if (!el) return
    const amount = el.clientWidth * 0.75
    el.scrollTo({
      left:
        direction === "left"
          ? el.scrollLeft - amount
          : el.scrollLeft + amount,
      behavior: "smooth",
    })
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

  if (markets.length === 0) return null

  return (
    <section
      className={cn("w-full py-12 sm:py-16", className)}
      aria-labelledby="trending-rail-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20">
            <Flame className="h-5 w-5 text-orange-400" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="trending-rail-heading"
              className="text-xl font-bold text-white sm:text-2xl"
            >
              What&apos;s happening now
            </h2>
            <p className="text-sm text-slate-300">
              Trending markets with the most action right now
            </p>
          </div>
        </div>

        {/* Carousel */}
        <div className="relative group">
          {/* Scroll buttons */}
          {canScrollLeft && (
            <button
              type="button"
              className={cn(
                "absolute -left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center",
                "rounded-full border border-white/20 bg-slate-900/90 text-white shadow-lg",
                "opacity-0 backdrop-blur-sm transition-opacity duration-200",
                "hover:bg-slate-800 hover:border-white/40",
                "focus:outline-none focus:ring-2 focus:ring-orange-500/50",
                "group-hover:opacity-100",
              )}
              onClick={() => scroll("left")}
              aria-label="Scroll trending markets left"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              className={cn(
                "absolute -right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center",
                "rounded-full border border-white/20 bg-slate-900/90 text-white shadow-lg",
                "opacity-0 backdrop-blur-sm transition-opacity duration-200",
                "hover:bg-slate-800 hover:border-white/40",
                "focus:outline-none focus:ring-2 focus:ring-orange-500/50",
                "group-hover:opacity-100",
              )}
              onClick={() => scroll("right")}
              aria-label="Scroll trending markets right"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          )}

          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2"
            onScroll={updateScrollState}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="region"
            aria-label="Trending markets carousel"
          >
            {markets.map((market) => (
              <Link
                key={market.id}
                href={market.href}
                className={cn(
                  "flex-shrink-0 snap-start w-[280px] sm:w-[300px]",
                  "rounded-2xl border border-white/10 bg-white/5 p-5",
                  "hover:bg-white/10 hover:border-white/20",
                  "focus:outline-none focus:ring-2 focus:ring-orange-500/50",
                  "transition-all duration-200",
                  "group/card",
                )}
              >
                {/* Top row: category + hot badge */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-300">
                    {market.category}
                  </span>
                  {market.isHot && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-semibold text-orange-400">
                      <Flame className="h-3 w-3" aria-hidden="true" />
                      Hot
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="mb-3 text-sm font-semibold leading-snug text-white group-hover/card:text-orange-300 transition-colors">
                  {market.title}
                </h3>

                {/* Volume */}
                <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
                  <TrendingUp className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />
                  <span className="font-mono font-medium text-white">
                    {market.volume}
                  </span>
                  <span className="text-slate-500">24h vol</span>
                </div>

                {/* Bottom row: participants + odds */}
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    {market.participants.toLocaleString()}
                  </span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono font-semibold text-white">
                    {market.odds.toFixed(1)}x
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
