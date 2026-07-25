"use client"

import { cn } from "@/lib/utils"

interface HeatStripProps {
  data?: number[] | null
  className?: string
  "data-testid"?: string
}

/**
 * HeatStrip — a compact 24-cell activity heat map.
 *
 * Renders a row of coloured blocks where colour intensity corresponds to
 * activity level (cool‑blue → hot‑red). Designed for 24‑hour activity data
 * (one block per hour) while remaining accessible and resilient to bad input.
 */
const HEAT_COLORS = [
  { threshold: 0, color: "hsl(210, 15%, 65%)" },
  { threshold: 20, color: "hsl(170, 45%, 50%)" },
  { threshold: 40, color: "hsl(85, 55%, 45%)" },
  { threshold: 60, color: "hsl(40, 80%, 55%)" },
  { threshold: 80, color: "hsl(10, 80%, 55%)" },
]

function getHeatColor(value: number): string {
  for (let i = HEAT_COLORS.length - 1; i >= 0; i--) {
    if (value >= HEAT_COLORS[i].threshold) return HEAT_COLORS[i].color
  }
  return HEAT_COLORS[0].color
}

function normalizeData(data?: number[] | null): number[] {
  if (!Array.isArray(data)) return []

  return data
    .filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value),
    )
    .map((value) => Math.min(100, Math.max(0, Math.round(value))))
}

export function HeatStrip({
  data,
  className,
  "data-testid": testId,
}: HeatStripProps) {
  const normalizedData = normalizeData(data)

  if (normalizedData.length === 0) return null

  const ariaLabel = `24-hour activity: ${normalizedData
    .map((value, index) => `Hour ${index + 1}: ${value}%`)
    .join(", ")}`

  return (
    <div className={cn("flex flex-col gap-2", className)} data-testid={testId}>
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">
        24h activity
      </p>
      <div className="flex gap-px overflow-hidden rounded-sm" role="img" aria-label={ariaLabel}>
        <span className="sr-only">
          24-hour activity heat map. Values range from 0 (cold) to 100 (hot).
        </span>
        {normalizedData.map((value, index) => (
          <div
            key={index}
            className="h-2 flex-1 rounded-[1px]"
            style={{ backgroundColor: getHeatColor(value) }}
          />
        ))}
      </div>
    </div>
  )
}
