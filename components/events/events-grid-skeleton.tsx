"use client"

/**
 * EventsGridSkeleton — themed loading placeholder for the EventsGrid.
 *
 * Renders shape-parity skeleton cards that mirror the real EventsGrid card
 * layout, preventing layout shift when data loads. The skeleton uses the
 * GrantFox FWC26 campaign palette (dark background, purple accents) with
 * a subtle shimmer animation.
 *
 * Accessibility:
 * - `aria-hidden="true"` on the wrapper so assistive tech ignores placeholders
 * - `aria-label="Loading events"` on the wrapper for screen-reader context
 * - `prefers-reduced-motion` respected via `motion-reduce:` overrides
 *
 * Shape-parity per card:
 *   - Header row: avatar orb + heading + badge pill
 *   - Title line
 *   - Description lines (2)
 *   - Progress bar pill
 *   - Footer stats row
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

// Number of skeleton cards to render while loading
const SKELETON_COUNT = 6

export interface EventsGridSkeletonProps {
  /** Additional class names for the grid wrapper */
  className?: string
  /** Number of skeleton cards to render (default: 6) */
  count?: number
}

export function EventsGridSkeleton({
  className,
  count = SKELETON_COUNT,
}: EventsGridSkeletonProps) {
  return (
    <div
      data-testid="events-grid-skeleton"
      aria-label="Loading events"
      aria-busy="true"
      role="status"
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            // Card container — matches real card border-radius, background, border
            "rounded-2xl border border-[#540D8D]/20 bg-[#0A0A1A] p-5 space-y-4",
            // Stagger animation delay for progressive reveal (respects reduced motion)
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
          )}
          style={{
            animationDelay: `${i * 60}ms`,
            animationFillMode: "both",
          }}
          aria-hidden="true"
        >
          {/* ── Header row: avatar orb + title + badge ── */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Category icon orb */}
              <Skeleton className="h-10 w-10 rounded-xl shrink-0 bg-[#540D8D]/10" />
              <div className="space-y-2 min-w-0 flex-1">
                {/* Title line */}
                <Skeleton className="h-4 w-3/4 rounded-md bg-[#540D8D]/10" />
                {/* Subtitle / txHash line */}
                <Skeleton className="h-3 w-1/2 rounded-md bg-[#540D8D]/8" />
              </div>
            </div>
            {/* Category badge pill */}
            <Skeleton className="h-6 w-16 rounded-full shrink-0 bg-[#540D8D]/10" />
          </div>

          {/* ── Odds / Stats row ── */}
          <div className="flex items-center gap-4">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-12 rounded-md bg-[#540D8D]/8" />
              <Skeleton className="h-5 w-16 rounded-md bg-[#540D8D]/10" />
            </div>
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-16 rounded-md bg-[#540D8D]/8" />
              <Skeleton className="h-5 w-20 rounded-md bg-[#540D8D]/10" />
            </div>
            <div className="space-y-1.5 flex-1 text-right">
              <Skeleton className="h-3 w-14 rounded-md bg-[#540D8D]/8 ml-auto" />
              <Skeleton className="h-5 w-12 rounded-md bg-[#540D8D]/10 ml-auto" />
            </div>
          </div>

          {/* ── Time remaining progress bar ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24 rounded-md bg-[#540D8D]/8" />
              <Skeleton className="h-3 w-12 rounded-md bg-[#540D8D]/8" />
            </div>
            {/* Progress bar track */}
            <Skeleton className="h-2 w-full rounded-full bg-[#540D8D]/10" />
          </div>

          {/* ── Date range row ── */}
          <div className="flex items-center justify-between pt-1 border-t border-[#540D8D]/10">
            <Skeleton className="h-3 w-28 rounded-md bg-[#540D8D]/8" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4 rounded-md bg-[#540D8D]/8" />
              <Skeleton className="h-3 w-10 rounded-md bg-[#540D8D]/8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

