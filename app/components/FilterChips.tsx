"use client"

/**
 * FilterChips — Active search-filter chips for the GrantFox FWC26 campaign.
 *
 * Renders one removable chip per active filter so users can see exactly which
 * filters are applied and dismiss them individually or all at once.
 *
 * Supported filter dimensions
 * ───────────────────────────
 * • search      — free-text query (one chip, prefixed with 🔍)
 * • category[]  — one chip per selected category
 * • oddsRange   — shown only when the range differs from the default [0, 10]
 * • dateRange   — shown when either `from` or `to` is set
 *
 * Accessibility (WCAG 2.1 AA)
 * ───────────────────────────
 * • The chip list has role="list" so screen readers announce it as a group.
 * • Each chip has role="listitem".
 * • Remove buttons carry descriptive aria-label="Remove <filter name> filter".
 * • "Clear all" is a clearly labelled <button>.
 * • Keyboard: all interactive elements are reachable via Tab; remove buttons
 *   are standard <button> elements so Enter/Space work natively.
 * • Reduced-motion: entrance animation uses `motion-safe:` prefix.
 *
 * Dark-mode / design tokens
 * ─────────────────────────
 * Uses only Tailwind design-token classes (bg-secondary, text-foreground,
 * border-border, etc.) so the component respects the active theme without
 * any hard-coded colours.
 */

import * as React from "react"
import { X } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useEventsStore } from "@/lib/events-store"

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default odds range; chips outside this range are considered "active". */
const DEFAULT_ODDS_MIN = 0
const DEFAULT_ODDS_MAX = 10

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single derived chip ready to render. */
interface FilterChip {
  /** Stable, unique key for React reconciliation. */
  id: string
  /** Human-readable label shown inside the chip. */
  label: string
  /** Called when the user removes this chip. */
  onRemove: () => void
}

export interface FilterChipsProps {
  /** Additional class names applied to the outermost wrapper. */
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Reads active filters from the global events store and renders a row of
 * removable chips.  Renders nothing when no filters are active.
 *
 * @example
 * ```tsx
 * // Drop it below <SearchInput /> and <MarketFilters /> on the events page.
 * <FilterChips />
 * ```
 */
export function FilterChips({ className }: FilterChipsProps) {
  const { filters, setFilters } = useEventsStore()

  // ── Derive chip list from current filter state ────────────────────────────
  const chips = React.useMemo<FilterChip[]>(() => {
    const result: FilterChip[] = []

    // 1. Free-text search
    if (filters.search.trim()) {
      result.push({
        id: "search",
        label: `"${filters.search.trim()}"`,
        onRemove: () => setFilters({ search: "" }),
      })
    }

    // 2. Selected categories (one chip each)
    filters.category.forEach((cat) => {
      result.push({
        id: `category-${cat}`,
        label: cat,
        // Use the store's current value at call time so that rapid removals
        // don't cause stale-closure overwrites of each other.
        onRemove: () =>
          setFilters({
            category: useEventsStore.getState().filters.category.filter(
              (c) => c !== cat
            ),
          }),
      })
    })

    // 3. Odds range (only when it differs from the default [0, 10])
    const [min, max] = filters.oddsRange
    if (min !== DEFAULT_ODDS_MIN || max !== DEFAULT_ODDS_MAX) {
      result.push({
        id: "oddsRange",
        label: `Odds: ${min}–${max}`,
        onRemove: () =>
          setFilters({ oddsRange: [DEFAULT_ODDS_MIN, DEFAULT_ODDS_MAX] }),
      })
    }

    // 4. Date range (from / to or both)
    const { from, to } = filters.dateRange
    if (from || to) {
      const fromLabel = from ? format(from, "MMM d, yyyy") : null
      const toLabel = to ? format(to, "MMM d, yyyy") : null
      const label =
        fromLabel && toLabel
          ? `${fromLabel} – ${toLabel}`
          : fromLabel
          ? `From ${fromLabel}`
          : `Until ${toLabel}`
      result.push({
        id: "dateRange",
        label: label!,
        onRemove: () => setFilters({ dateRange: { from: null, to: null } }),
      })
    }

    return result
  }, [filters, setFilters])

  // Nothing to show → render nothing (keeps layout clean)
  if (chips.length === 0) return null

  // ── Clear all handler ─────────────────────────────────────────────────────
  const handleClearAll = () => {
    setFilters({
      search: "",
      category: [],
      oddsRange: [DEFAULT_ODDS_MIN, DEFAULT_ODDS_MAX],
      dateRange: { from: null, to: null },
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        className
      )}
      // Announce to AT that this is the active-filters summary region
      aria-label="Active filters"
    >
      {/* Chip list */}
      <ul
        role="list"
        className="flex flex-wrap items-center gap-2 m-0 p-0 list-none"
        aria-label="Applied filters"
      >
        {chips.map((chip) => (
          <li
            key={chip.id}
            role="listitem"
            className={cn(
              // Layout & shape
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1",
              // Typography
              "text-label font-medium",
              // Colour tokens (light + dark via CSS variables)
              "bg-secondary text-secondary-foreground border-border",
              // Hover state for the whole chip (subtle)
              "dark:bg-secondary/60",
              // Entrance animation (respects prefers-reduced-motion)
              "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95",
            )}
          >
            {/* Filter label */}
            <span className="max-w-[180px] truncate sm:max-w-[240px]">
              {chip.label}
            </span>

            {/* Remove button */}
            <button
              type="button"
              onClick={chip.onRemove}
              aria-label={`Remove ${chip.label} filter`}
              className={cn(
                "flex-shrink-0 rounded-full p-0.5",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-muted",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "transition-colors",
              )}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {/* Clear all — only shown when ≥2 chips, saving one click */}
      {chips.length >= 2 && (
        <button
          type="button"
          onClick={handleClearAll}
          aria-label="Clear all active filters"
          className={cn(
            "rounded-full border border-dashed border-border px-3 py-1",
            "text-label font-medium text-muted-foreground",
            "hover:border-destructive/60 hover:text-destructive",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "transition-colors",
          )}
        >
          Clear all
        </button>
      )}
    </div>
  )
}

export default FilterChips
