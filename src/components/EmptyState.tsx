"use client"

import * as React from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * StellarWaveEmptyState — Issue #651: Polish for narrow viewports (≤375px).
 *
 * Responsive adjustments:
 * - Padding: px-4 sm:px-6 py-8 sm:py-12 — reduces horizontal padding on
 *   very narrow screens so content doesn't hit the edges.
 * - Min-height: min-h-[300px] sm:min-h-[400px] — a smaller minimum on
 *   mobile ensures the empty state doesn't push other content too far
 *   down on short viewports.
 * - Icon: h-20 w-20 sm:h-24 sm:w-24 — scales the decorative Sparkles
 *   container down slightly on mobile while keeping the inner icon at a
 *   comfortable size.
 * - CTA button: uses size="lg" (≥44px height) on all breakpoints to meet
 *   WCAG 2.5.5 target-size requirements. The hover scale effect is
 *   suppressed under prefers-reduced-motion via motion-safe: prefix.
 */

export interface StellarWaveEmptyStateProps {
  title?: string
  description?: string
  ctaText?: string
  ctaHref?: string
  onCtaClick?: () => void
  className?: string
}

export function StellarWaveEmptyState({
  title = "No Stellar Wave data yet",
  description = "Join the GrantFox FWC26 campaign to start seeing your predictions and market data here.",
  ctaText = "Explore Campaigns",
  ctaHref = "/campaigns",
  onCtaClick,
  className,
}: StellarWaveEmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] px-4 sm:px-6 py-8 sm:py-12 text-center",
        "rounded-2xl border border-dashed border-[#540D8D]/50 bg-[#540D8D]/5 backdrop-blur-sm",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300",
        className
      )}
    >
      <div className="relative mb-4 sm:mb-6 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-[#540D8D]/10 text-[#540D8D] dark:text-purple-400">
        <Sparkles className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden="true" />
      </div>
      <div className="mx-auto max-w-md space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      <div className="mt-6 sm:mt-8">
        {ctaHref && !onCtaClick ? (
          <Button asChild variant="default" size="lg" className="bg-[#540D8D] hover:bg-[#540D8D]/90 text-white shadow-sm motion-safe:transition-all motion-safe:hover:scale-[1.02]">
            <Link href={ctaHref}>
              {ctaText}
            </Link>
          </Button>
        ) : (
          <Button
            onClick={onCtaClick}
            variant="default"
            size="lg"
            className="bg-[#540D8D] hover:bg-[#540D8D]/90 text-white shadow-sm motion-safe:transition-all motion-safe:hover:scale-[1.02]"
          >
            {ctaText}
          </Button>
        )}
      </div>
    </div>
  )
}
