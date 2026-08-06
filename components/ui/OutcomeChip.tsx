"use client"

/**
 * OutcomeChip.tsx
 *
 * A color-blind accessible chip that displays an outcome label with:
 *  1. A chart token background (bg-chart-1 … bg-chart-5) — chosen to
 *     provide ≥4.5:1 contrast ratio against white text (WCAG 2.1 AA,
 *     SC 1.4.3 Contrast (Minimum)).
 *  2. A subtle geometric overlay pattern (diagonal stripes, dots, etc.)
 *     so the state is still identifiable when hue perception is reduced,
 *     fulfilling SC 1.4.1 (Use of Color).
 *
 * Mobile audit (issue #821):
 *  - Chip no longer truncates or overflows at <=375px: label wraps onto a
 *    second line instead of clipping (whitespace-normal, break-words).
 *  - Minimum 44px tap target at all breakpoints (WCAG 2.1 AA / 2.5.5),
 *    achieved via min-h-[44px] + py-3 rather than a fixed height so the
 *    label can still wrap without clipping the target.
 *  - Responsive padding: tighter on mobile (px-2.5) vs desktop (px-3).
 *  - Responsive font: text-xs on mobile, text-sm on sm+.
 *
 * Dark mode is handled automatically because the chart-* tokens are
 * defined in globals.css with separate HSL values for :root and .dark.
 */

import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Maps outcome semantic to chart token index and pattern class.
 * Extend this map when new outcomes are added.
 */
const OUTCOME_STYLES = {
  positive: { chart: "bg-chart-1", pattern: "pattern-diagonal" },
  negative: { chart: "bg-chart-2", pattern: "pattern-dots" },
  neutral:  { chart: "bg-chart-3", pattern: "pattern-crosshatch" },
  tie:      { chart: "bg-chart-4", pattern: "pattern-horizontal" },
  dispute:  { chart: "bg-chart-5", pattern: "pattern-vertical" },
} as const

export type OutcomeVariant = keyof typeof OUTCOME_STYLES

interface OutcomeChipProps {
  /** The outcome text shown inside the chip */
  children: ReactNode
  /** Semantic variant that picks chart colour + pattern */
  variant?: OutcomeVariant
  /** Override chart token class (e.g. "bg-chart-1") */
  chartClass?: string
  /** Override pattern class (e.g. "pattern-diagonal") */
  patternClass?: string
  /** Additional classes forwarded to the Badge element */
  className?: string
  /** Accessible label for screen readers (defaults to children) */
  ariaLabel?: string
}

export function OutcomeChip({
  children,
  variant = "neutral",
  chartClass,
  patternClass,
  className,
  ariaLabel,
}: OutcomeChipProps) {
  const style = OUTCOME_STYLES[variant]

  return (
    <Badge
      role="img"
      className={cn(
        // text-white on darkened chart tokens satisfies WCAG 2.1 AA SC 1.4.3
        // font-semibold boosts effective contrast for small badge text
        "border-transparent text-white font-semibold",

        // Mobile-responsive layout (issue #821):
        // - min-h-[44px] ensures WCAG 2.1 AA 2.5.5 minimum tap target at all breakpoints
        // - whitespace-normal + break-words allows label to wrap instead of clipping
        // - py-3 gives vertical padding while keeping 44px min-height
        // - px-2.5 on mobile, px-3 on sm+ for tighter fit on small screens
        // - text-xs on mobile, text-sm on sm+ for readability
        "min-h-[44px] whitespace-normal break-words py-3 px-2.5 sm:px-3 text-xs sm:text-sm",

        chartClass ?? style.chart,
        patternClass ?? style.pattern,
        className,
      )}
      aria-label={ariaLabel ?? (typeof children === "string" ? children : undefined)}
    >
      {children}
    </Badge>
  )
}
