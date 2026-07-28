"use client"

/**
 * EventsEmptyState — GrantFox FWC26 / Stellar Wave branded empty state.
 *
 * Rendered by EventsTable when there are genuinely no events for the current
 * status tab (e.g. "upcoming" or "past") AND no active filters are in play.
 * This distinguishes the "truly empty" scenario from the "filters produced no
 * results" scenario handled by NoMatchEmptyState.
 *
 * Design requirements:
 *  - GrantFox FWC26 / Stellar Wave theme: primary brand colour #540D8D,
 *    radial glow, Stellar-branded SVG wave-and-star illustration.
 *  - Responsive across all breakpoints (mobile-first, max-w-lg centred).
 *  - WCAG 2.1 AA compliant: role="status", aria-live="polite", all decorative
 *    elements marked aria-hidden, CTA button is keyboard-focusable with clear
 *    accessible label, contrast meets AA requirements.
 *  - Design-token consistent: background/foreground/muted use CSS-variable
 *    Tailwind tokens so dark-mode inverts automatically.
 *  - Respects prefers-reduced-motion: entrance animation is gated behind the
 *    `motion-safe:` Tailwind variant.
 *
 * Props
 * -----
 * @param title          Heading text (defaults to campaign-specific copy).
 * @param description    Body copy below the heading.
 * @param ctaText        Button label.
 * @param ctaHref        If provided, the CTA renders as a Next.js <Link>.
 * @param onCtaClick     If provided (and ctaHref absent), the CTA is a button.
 * @param className      Additional classes for the outer wrapper.
 */

import * as React from "react"
import Link from "next/link"
import { Plus, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface EventsEmptyStateProps {
  /** Main heading — defaults to GrantFox FWC26 campaign copy */
  title?: string
  /** Supporting description below the heading */
  description?: string
  /** CTA button label */
  ctaText?: string
  /**
   * URL the CTA links to. When set (and onCtaClick is absent) the button
   * renders as a Next.js <Link> for correct client-side navigation.
   */
  ctaHref?: string
  /** Optional click handler; used instead of ctaHref for programmatic actions */
  onCtaClick?: () => void
  /** Additional Tailwind class names for the container */
  className?: string
}

/**
 * Inline SVG illustration: stylised Stellar wave with a star, tinted with the
 * GrantFox FWC26 brand purple (#540D8D).  All paths carry aria-hidden so they
 * are completely invisible to assistive technologies.
 */
function StellarWaveIllustration({ className }: { className?: string }) {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
      role="img"
    >
      {/* Outer glow ring */}
      <circle cx="40" cy="40" r="38" stroke="#540D8D" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.3" />

      {/* Central circle background */}
      <circle cx="40" cy="40" r="28" fill="#540D8D" opacity="0.08" />

      {/* Stellar wave path — bottom ripple */}
      <path
        d="M14 52 Q22 44 30 52 Q38 60 46 52 Q54 44 62 52"
        stroke="#540D8D"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="dark:stroke-purple-400"
      />

      {/* Stellar wave path — middle ripple */}
      <path
        d="M18 44 Q26 36 34 44 Q42 52 50 44 Q58 36 66 44"
        stroke="#540D8D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.6"
        className="dark:stroke-purple-400"
      />

      {/* Star / sparkle at the apex */}
      <path
        d="M40 16 L42.4 23.2 L50 23.2 L44 27.6 L46.4 34.8 L40 30.4 L33.6 34.8 L36 27.6 L30 23.2 L37.6 23.2 Z"
        fill="#540D8D"
        className="dark:fill-purple-400"
      />

      {/* Small accent dots */}
      <circle cx="20" cy="56" r="2.5" fill="#540D8D" opacity="0.4" className="dark:fill-purple-400" />
      <circle cx="60" cy="56" r="2.5" fill="#540D8D" opacity="0.4" className="dark:fill-purple-400" />
      <circle cx="14" cy="44" r="1.5" fill="#540D8D" opacity="0.25" className="dark:fill-purple-400" />
      <circle cx="66" cy="44" r="1.5" fill="#540D8D" opacity="0.25" className="dark:fill-purple-400" />
    </svg>
  )
}

export function EventsEmptyState({
  title = "No events yet — join the wave",
  description = "Be the first to create a prediction market for the GrantFox FWC26 / Stellar Wave campaign. Your market goes live instantly on the Stellar blockchain.",
  ctaText = "Create Your First Event",
  ctaHref = "/events/new",
  onCtaClick,
  className,
}: EventsEmptyStateProps) {
  return (
    /*
     * role="status" + aria-live="polite": when the table transitions from a
     * loading state or populated state to this empty state, screen readers
     * will announce the change without interrupting the user mid-flow.
     */
    <div
      role="status"
      aria-live="polite"
      aria-label={title}
      data-testid="events-empty-state"
      className={cn(
        // Layout: full-width centred column with generous vertical padding
        "flex flex-col items-center justify-center",
        "gap-6 py-16 sm:py-20 px-4 text-center",
        // Visual boundary: dashed border tinted with the brand purple
        "rounded-2xl border border-dashed border-[#540D8D]/40",
        // Background: brand tint + design-token fallback for dark mode
        "bg-[#540D8D]/[0.03] dark:bg-[#540D8D]/[0.06]",
        // Backdrop blur for depth
        "backdrop-blur-sm",
        // Subtle entrance animation — disabled under prefers-reduced-motion
        "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300",
        className
      )}
    >
      {/* ── Illustration ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          "relative flex h-[88px] w-[88px] shrink-0 items-center justify-center",
          "rounded-full",
          // Brand-tinted halo background
          "bg-[#540D8D]/10 dark:bg-[#540D8D]/20",
          // Subtle outer glow ring using box-shadow
          "ring-4 ring-[#540D8D]/10 dark:ring-[#540D8D]/20"
        )}
        aria-hidden="true"
      >
        <StellarWaveIllustration className="h-12 w-12" />
      </div>

      {/* ── Campaign label pill ───────────────────────────────────────────── */}
      <div
        className={cn(
          "inline-flex items-center gap-1.5",
          "rounded-full border border-[#540D8D]/30 bg-[#540D8D]/10",
          "px-3 py-1 text-xs font-medium tracking-wide",
          "text-[#540D8D] dark:text-purple-300"
        )}
        aria-label="Campaign: GrantFox FWC26 — Stellar Wave"
      >
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        GrantFox FWC26 · Stellar Wave
      </div>

      {/* ── Copy block ───────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-md space-y-3">
        {/*
         * h2 because this is a section-level heading within the page; the
         * outer EventsSection already has an h1 ("Events").
         */}
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {/* ── Call-to-Action ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
        {ctaHref && !onCtaClick ? (
          /*
           * When ctaHref is provided, use Next.js <Link> for client-side
           * routing (no full page reload, correct prefetching).
           */
          <Button
            asChild
            size="lg"
            className={cn(
              "gap-2 font-semibold shadow-md",
              // Brand-coloured primary button
              "bg-[#540D8D] hover:bg-[#6B1DAB] text-white",
              // Scale micro-interaction (disabled under prefers-reduced-motion)
              "transition-all motion-safe:hover:scale-[1.02]",
              "focus-visible:ring-2 focus-visible:ring-[#540D8D] focus-visible:ring-offset-2"
            )}
          >
            <Link href={ctaHref}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {ctaText}
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onCtaClick}
            size="lg"
            className={cn(
              "gap-2 font-semibold shadow-md",
              "bg-[#540D8D] hover:bg-[#6B1DAB] text-white",
              "transition-all motion-safe:hover:scale-[1.02]",
              "focus-visible:ring-2 focus-visible:ring-[#540D8D] focus-visible:ring-offset-2"
            )}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {ctaText}
          </Button>
        )}
      </div>
    </div>
  )
}
