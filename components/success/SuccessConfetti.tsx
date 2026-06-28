"use client"

import { useEffect, useState } from "react"
import { CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const CONFETTI_COLORS = [
  "success-confetti-piece--cyan",
  "success-confetti-piece--green",
  "success-confetti-piece--violet",
  "success-confetti-piece--amber",
  "success-confetti-piece--pink",
  "success-confetti-piece--blue",
] as const

export interface SuccessConfettiProps {
  /** When false, nothing is rendered. */
  active?: boolean
  className?: string
  /** Accessible label for the static reduced-motion success state. */
  ariaLabel?: string
}

/**
 * Decorative success confetti. Under `prefers-reduced-motion: reduce`, renders a
 * static check icon instead of falling particles (WCAG 2.3.3).
 */
export function SuccessConfetti({
  active = true,
  className,
  ariaLabel = "Success",
}: SuccessConfettiProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    const onChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener("change", onChange)
    return () => mediaQuery.removeEventListener("change", onChange)
  }, [])

  if (!active) {
    return null
  }

  if (prefersReducedMotion) {
    return (
      <div
        className={cn("success-confetti-static", className)}
        role="img"
        aria-label={ariaLabel}
      >
        <CheckCircle
          className="success-confetti-static__icon h-12 w-12"
          aria-hidden="true"
        />
      </div>
    )
  }

  return (
    <div className={cn("success-confetti", className)} aria-hidden="true">
      {CONFETTI_COLORS.flatMap((colorClass, index) =>
        [0, 1].map((duplicate) => (
          <span
            key={`${colorClass}-${duplicate}-${index}`}
            className={cn("success-confetti-piece", colorClass)}
            style={{
              left: `${8 + index * 14 + duplicate * 4}%`,
              animationDelay: `${index * 70 + duplicate * 35}ms`,
            }}
          />
        )),
      )}
    </div>
  )
}
