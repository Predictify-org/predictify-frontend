"use client"

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RefreshIndicatorProps {
  /** Called when the user clicks the refresh button. */
  onRefresh?: () => void
  /** ISO-8601 timestamp or Date of the last successful data fetch. */
  lastRefreshedAt?: Date | null
}

/**
 * Displays the time elapsed since the last dashboard data refresh and
 * provides a button to trigger a manual refresh.
 *
 * Accessibility: the elapsed label is wrapped in an `aria-live="polite"`
 * region so screen-reader users are informed of updates without interruption.
 * A visually-hidden companion `<span>` supplies the accessible label required
 * by WCAG 2.1 AA (Success Criterion 4.1.3 – Status Messages).
 */
export function RefreshIndicator({
  onRefresh,
  lastRefreshedAt,
}: RefreshIndicatorProps) {
  const [label, setLabel] = useState<string>("Never refreshed")

  useEffect(() => {
    if (!lastRefreshedAt) {
      setLabel("Never refreshed")
      return
    }

    const update = () => {
      const diffMs = Date.now() - lastRefreshedAt.getTime()
      const diffSec = Math.floor(diffMs / 1000)

      if (diffSec < 60) {
        setLabel("Just now")
      } else if (diffSec < 3600) {
        const mins = Math.floor(diffSec / 60)
        setLabel(`${mins} min${mins !== 1 ? "s" : ""} ago`)
      } else {
        const hrs = Math.floor(diffSec / 3600)
        setLabel(`${hrs} hr${hrs !== 1 ? "s" : ""} ago`)
      }
    }

    update()
    const interval = setInterval(update, 30_000)
    return () => clearInterval(interval)
  }, [lastRefreshedAt])

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {/* SR-only prefix for screen readers */}
      <span className="sr-only">Last refresh:</span>

      {/* Visible elapsed time; aria-live notifies AT on change */}
      <span aria-live="polite" aria-atomic="true">
        {label}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        aria-label="Refresh dashboard data"
        onClick={onRefresh}
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  )
}
