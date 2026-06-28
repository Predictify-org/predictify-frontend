"use client"

/**
 * OutcomeChip.tsx
 *
 * A color-blind accessible chip that displays an outcome label with:
 *  1. A chart token background (bg-chart-1 … bg-chart-5) — already chosen
 *     by the colour palette to be distinguishable by most viewers.
 *  2. A subtle geometric overlay pattern (diagonal stripes, dots, etc.)
 *     so the state is still identifiable when hue perception is reduced.
 *
 * This fulfils WCAG 2.1 AA Success Criterion 1.4.1 (Use of Color).
 *
 * Responsive behaviour is inherited from the parent layout; the chip
 * scales its text via Tailwind's text-xs / text-sm utility classes.
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
      className={cn(
        "border-transparent text-white",
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
