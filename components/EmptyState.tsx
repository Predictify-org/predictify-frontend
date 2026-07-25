"use client"

import * as React from "react"
import Link from "next/link"
import { LucideIcon, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface EmptyStateProps {
  /** The main heading text for the empty state */
  title?: string
  /** The secondary description text providing context or next steps */
  description?: string
  /** Text label for the Call-To-Action button */
  ctaText?: string
  /** Optional URL path for the CTA button to link to */
  ctaHref?: string
  /** Optional click handler for the CTA button */
  onCtaClick?: () => void
  /** Optional custom icon to replace the default illustration */
  icon?: LucideIcon
  /** Additional custom class names for the container */
  className?: string
}

/**
 * EmptyState — A premium, themed, accessible empty state component.
 *
 * Designed to:
 * - Match the application's typography, design tokens, and dark-mode configuration.
 * - Meet WCAG 2.1 AA requirements (uses role="status", polite live regions, and semantic elements).
 * - Be fully responsive across all breakpoints.
 * - Respect prefers-reduced-motion for animations.
 */
export function EmptyState({
  title = "Market Not Found",
  description = "The prediction market you are looking for does not exist, has been removed, or is currently unavailable.",
  ctaText = "Back to Markets",
  ctaHref = "/",
  onCtaClick,
  icon: CustomIcon,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        // Layout and spacing
        "flex flex-col items-center justify-center min-h-[400px] px-6 py-12 text-center",
        // Themed border and container styles
        "rounded-2xl border border-dashed border-border/60 bg-card/30 backdrop-blur-sm",
        // Subtle entrance animation (disabled under prefers-reduced-motion)
        "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300",
        className
      )}
    >
      {/* ── Illustration / Icon Section ────────────────────────────────── */}
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
        {CustomIcon ? (
          <CustomIcon className="h-12 w-12 text-[#540D8D] dark:text-purple-400" aria-hidden="true" />
        ) : (
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-muted-foreground/80 dark:text-muted-foreground/60"
            aria-hidden="true"
          >
            {/* Custom themed illustration representing an empty/not-found market chart */}
            <rect x="8" y="12" width="48" height="40" rx="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 40L28 28L36 34L48 22" stroke="#540D8D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="dark:stroke-purple-400" />
            <circle cx="48" cy="22" r="3" fill="#540D8D" className="dark:fill-purple-400" />
            <circle cx="16" cy="40" r="3" fill="currentColor" />
            <circle cx="28" cy="28" r="3" fill="currentColor" />
            <circle cx="36" cy="34" r="3" fill="currentColor" />
            <line x1="8" y1="44" x2="56" y2="44" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
        )}
      </div>

      {/* ── Copy Block ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-md space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {/* ── Call To Action (CTA) ────────────────────────────────────────── */}
      <div className="mt-8">
        {ctaHref && !onCtaClick ? (
          <Button asChild variant="default" size="lg" className="gap-2 font-medium shadow-sm transition-all hover:scale-[1.02]">
            <Link href={ctaHref}>
              <ArrowLeft className="h-4 w-4" />
              {ctaText}
            </Link>
          </Button>
        ) : (
          <Button
            onClick={onCtaClick}
            variant="default"
            size="lg"
            className="gap-2 font-medium shadow-sm transition-all hover:scale-[1.02]"
          >
            <ArrowLeft className="h-4 w-4" />
            {ctaText}
          </Button>
        )}
      </div>
    </div>
  )
}
