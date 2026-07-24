"use client"

/**
 * NoMatchEmptyState — "no matching markets" illustrated empty state.
 *
 * Rendered by EventsTable when the active filter combination returns zero
 * results.  Designed to:
 *   - Communicate clearly *why* nothing is shown (search vs category vs date)
 *   - Offer a single-click escape hatch via the "Clear all filters" button
 *   - Meet WCAG 2.1 AA requirements (role="status", aria-live, contrast tokens)
 *   - Respect prefers-reduced-motion (no animation when requested)
 *   - Work on all breakpoints without horizontal overflow
 *   - Stay consistent with the site's design-token / dark-mode system
 *
 * Props
 * -----
 * @param hasSearch      - whether a search query is active
 * @param hasCategories  - whether category filters are active
 * @param hasDateRange   - whether a date-range filter is active
 * @param onClearFilters - callback invoked when the user clicks "Clear all filters"
 */

import * as React from "react"
import { Search, Tag, CalendarX, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface NoMatchEmptyStateProps {
  /** True when a search query is contributing to the zero-result state */
  hasSearch?: boolean
  /** True when one or more category pills are active */
  hasCategories?: boolean
  /** True when a date range is set */
  hasDateRange?: boolean
  /** Called when the user wants to reset all active filters */
  onClearFilters: () => void
  /** Additional class names for the wrapper */
  className?: string
}

/**
 * Returns contextual copy based on which filter(s) are active.
 * Falls back to a generic message when the active filter is unclear.
 */
function resolveMessage(hasSearch: boolean, hasCategories: boolean, hasDateRange: boolean) {
  if (hasSearch && !hasCategories && !hasDateRange) {
    return {
      heading: "No markets match your search",
      body: "We couldn't find any prediction markets for that query. Try different keywords or clear your search.",
      Icon: Search,
      iconLabel: "Magnifying glass",
    }
  }
  if (hasCategories && !hasSearch && !hasDateRange) {
    return {
      heading: "No markets in this category",
      body: "There are no prediction markets for the selected categories right now. Try a different category or come back later.",
      Icon: Tag,
      iconLabel: "Category tag",
    }
  }
  if (hasDateRange && !hasSearch && !hasCategories) {
    return {
      heading: "No markets in that date range",
      body: "No prediction markets are scheduled within the selected dates. Try widening the date range.",
      Icon: CalendarX,
      iconLabel: "Calendar with no events",
    }
  }
  // Mixed / generic fallback
  return {
    heading: "No matching markets",
    body: "Your current filters didn't return any prediction markets. Adjust your search, category, or date filters to see results.",
    Icon: Filter,
    iconLabel: "Filter",
  }
}

export function NoMatchEmptyState({
  hasSearch = false,
  hasCategories = false,
  hasDateRange = false,
  onClearFilters,
  className,
}: NoMatchEmptyStateProps) {
  const { heading, body, Icon, iconLabel } = resolveMessage(hasSearch, hasCategories, hasDateRange)

  return (
    /*
     * role="status" + aria-live="polite" ensures screen readers announce the
     * state change when the list transitions from populated to empty without a
     * full page reload.
     */
    <div
      role="status"
      aria-live="polite"
      aria-label={heading}
      className={cn(
        // Layout — centered column, generous vertical breathing room
        "flex flex-col items-center justify-center",
        "gap-4 py-16 px-4 text-center",
        // Visual boundary — dashed border matches the RecommendationsStrip empty pattern
        "rounded-xl border border-dashed border-border/40",
        // Background uses token so it inverts correctly in dark mode
        "bg-background",
        // Subtle entrance animation; skipped when prefers-reduced-motion is set
        "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300",
        className
      )}
    >
      {/* ── Illustration circle ──────────────────────────────────────────── */}
      <div
        className={cn(
          "flex h-16 w-16 shrink-0 items-center justify-center",
          "rounded-full",
          // Muted background ring using design token — adapts to dark mode
          "bg-muted"
        )}
        aria-hidden="true"
      >
        <Icon
          className="h-7 w-7 text-[#540D8D]"
          aria-label={iconLabel}
          aria-hidden="true"
        />
      </div>

      {/* ── Copy block ───────────────────────────────────────────────────── */}
      <div className="space-y-2 max-w-sm">
        <h3 className="text-base font-semibold text-foreground">
          {heading}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {body}
        </p>
      </div>

      {/* ── Clear filters CTA ────────────────────────────────────────────── */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClearFilters}
        className={cn(
          "mt-2",
          // Ensure the button is clearly visible on both light and dark backgrounds
          "border-border text-foreground hover:bg-accent hover:text-accent-foreground",
          // High-contrast mode support via the custom Tailwind variant
          "high-contrast:border-2 high-contrast:font-semibold"
        )}
      >
        Clear all filters
      </Button>
    </div>
  )
}
