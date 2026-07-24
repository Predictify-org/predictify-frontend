"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed"

interface RecentlyViewedRailProps {
  className?: string
}

function RecentlyViewedCard({
  item,
  onRemove,
}: {
  item: { id: string; title: string; category: string; href: string; viewedAt: number }
  onRemove: (id: string) => void
}) {
  return (
    <div className="relative flex-shrink-0 snap-start">
      <Link
        href={item.href}
        className={cn(
          "block rounded-xl border border-border/30 bg-card/20 p-4",
          "w-[calc(100vw-3rem)] max-w-[260px] sm:w-[260px]",
          "hover:bg-card/40 hover:border-border/50",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
          "transition-all duration-200"
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            Recent
          </Badge>
        </div>

        <h3 className="mb-2 text-sm font-semibold leading-tight text-foreground line-clamp-2">
          {item.title}
        </h3>
        <p className="text-xs text-muted-foreground">{item.category}</p>
      </Link>

      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-1.5 -top-1.5 z-10 h-5 w-5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onRemove(item.id)
        }}
        aria-label={`Remove ${item.title} from recently viewed`}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/40 px-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
        <Clock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">No recently viewed markets</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Markets you visit will appear here so you can quickly find them again.
        </p>
      </div>
    </div>
  )
}

export function RecentlyViewedRail({ className }: RecentlyViewedRailProps) {
  const { items, removeRecentlyViewed } = useRecentlyViewed()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }, [])

  useEffect(() => {
    updateScrollState()
  }, [items, updateScrollState])

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollContainerRef.current
    if (!el) return
    const amount = el.clientWidth
    el.scrollTo({
      left: direction === "left" ? el.scrollLeft - amount : el.scrollLeft + amount,
      behavior: "smooth",
    })
  }, [])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft" && canScrollLeft) {
      event.preventDefault()
      scroll("left")
    } else if (event.key === "ArrowRight" && canScrollRight) {
      event.preventDefault()
      scroll("right")
    }
  }

  if (items.length === 0) {
    return (
      <section className={cn("w-full", className)} aria-labelledby="recently-viewed-heading">
        <h2 id="recently-viewed-heading" className="mb-4 text-xl font-bold text-foreground">
          Recently viewed
        </h2>
        <EmptyState />
      </section>
    )
  }

  return (
    <section className={cn("w-full", className)} aria-labelledby="recently-viewed-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="recently-viewed-heading" className="text-xl font-bold text-foreground">
          Recently viewed
        </h2>
      </div>

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
          aria-label="Recently viewed markets carousel"
        >
          {items.map((item) => (
            <RecentlyViewedCard
              key={item.id}
              item={item}
              onRemove={removeRecentlyViewed}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
