"use client"

/**
 * CompareSelectionChip.tsx
 *
 * Floating bar that appears at the bottom of the viewport whenever one or more
 * markets are selected for comparison. Shows selected titles, a "Compare" CTA,
 * and a clear button.
 *
 * Accessibility: role="status" announces selection count to screen readers;
 * focus-visible rings on all buttons.
 */

import * as React from "react"
import { X, GitCompareArrows } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCompareStore, MAX_COMPARE } from "@/lib/compare-store"
import { useEventsStore } from "@/lib/events-store"

export function CompareSelectionChip() {
  const { selectedIds, clear, openOverlay, deselect } = useCompareStore()
  const { events } = useEventsStore()

  if (selectedIds.length === 0) return null

  const selected = selectedIds
    .map((id) => events.find((e) => e.id === id))
    .filter(Boolean)

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${selectedIds.length} market${selectedIds.length > 1 ? "s" : ""} selected for comparison`}
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-40",
        "flex items-center gap-3 flex-wrap justify-center",
        "bg-background border shadow-xl rounded-full px-4 py-2.5",
        "max-w-[90vw]"
      )}
    >
      {/* Selected market pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {selected.map((event) =>
          event ? (
            <Badge
              key={event.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1 text-xs"
            >
              <span className="max-w-[120px] truncate">{event.title}</span>
              <button
                onClick={() => deselect(event.id)}
                aria-label={`Remove ${event.title} from comparison`}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ) : null
        )}
      </div>

      {/* Separator */}
      <span className="h-4 w-px bg-border" aria-hidden="true" />

      {/* Compare CTA — enabled only when exactly 2 selected */}
      <Button
        size="sm"
        onClick={openOverlay}
        disabled={selectedIds.length < MAX_COMPARE}
        aria-disabled={selectedIds.length < MAX_COMPARE}
        className="rounded-full h-7 px-3 text-xs bg-[#540D8D] hover:bg-[#6B1DAB] text-white"
      >
        <GitCompareArrows className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
        Compare
        {selectedIds.length < MAX_COMPARE && (
          <span className="ml-1 text-white/70">
            ({MAX_COMPARE - selectedIds.length} more)
          </span>
        )}
      </Button>

      {/* Clear all */}
      <button
        onClick={clear}
        aria-label="Clear all selections"
        className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
