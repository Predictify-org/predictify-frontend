"use client";

/**
 * MarketHero — market detail hero for the GrantFox FWC26 campaign.
 *
 * Design goals (per issue):
 *  - Rebalanced hero elements: title, status, and stats share visual weight
 *    without one section dominating the others.
 *  - Tight typography hierarchy using the repo's design-token scale
 *    (text-h1-responsive → text-h3-responsive → text-body-md).
 *  - Key stats (volume, participants, countdown) rendered as a scannable
 *    stat strip rather than buried in a full card layout.
 *  - GrantFox FWC26 campaign badge surfaces prominently but unobtrusively.
 *  - Dark-mode consistent: all colours are CSS-variable tokens or
 *    Tailwind semantic classes (no hardcoded hex).
 *  - WCAG 2.1 AA: every interactive element is keyboard-reachable and
 *    labelled; status changes use role="status"; progress bars use
 *    role="progressbar" with aria-valuenow/min/max.
 *  - Responsive: single-column on mobile (< sm), two-column on ≥ md.
 *
 * @see docs/MARKET_HERO.md
 */

import React, { useId } from "react";
import { Clock, Users, DollarSign, TrendingUp, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type MarketStatus } from "@/components/market/StatusBadge";
import { LiveRegion } from "@/components/ui/live-region";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single binary outcome option shown in the probability strip. */
export interface MarketOutcome {
  /** Display label, e.g. "Yes" or "No". */
  label: string;
  /** Probability percentage (0–100). */
  probability: number;
}

/** Props accepted by the MarketHero component. */
export interface MarketHeroProps {
  /** Market question / title — rendered as the primary `<h1>`. */
  title: string;
  /** Short description displayed beneath the title. */
  description?: string;
  /** Current lifecycle status passed through to StatusBadge. */
  status: MarketStatus;
  /** Category label, e.g. "Football". */
  category?: string;
  /** Total staked value formatted as a display string, e.g. "15,780 USDC". */
  volume?: string;
  /** Number of unique participants. */
  participants?: number;
  /** Human-readable time remaining, e.g. "3 days". */
  timeLeft?: string;
  /**
   * One or two outcome options rendered as a probability bar.
   * When only one option is provided the bar spans the full width.
   * When two options are provided the bar is split proportionally.
   */
  outcomes?: [MarketOutcome] | [MarketOutcome, MarketOutcome];
  /**
   * When `true`, renders a GrantFox FWC26 campaign badge.
   * @default false
   */
  isGrantFoxCampaign?: boolean;
  /**
   * Optional callback when the Share button is clicked.
   * If omitted the Share button is not rendered.
   */
  onShare?: () => void;
  /** Optional trigger element for the "About this market" modal. */
  aboutModalTrigger?: React.ReactNode;
  /** Additional CSS classes applied to the root element. */
  className?: string;
  /** Renders a loading placeholder that mirrors the final hero layout. */
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Stat pill — a small labelled figure used in the stat strip.
 * Kept internal to this file; exported only for testing via a named export
 * lower in this module.
 *
 * Tabular-nums contract (issue #556): the value span wears `text-stat-sm`,
 * which is bound to `font-variant-numeric: tabular-nums` in
 * `styles/globals.css`.  An explicit `tabular-nums` is also applied here
 * for redundancy and so the DOM-level contract is straightforward to
 * assert in tests — both layers resolve to the same CSS property and
 * there is no visual conflict.
 */
interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function StatPill({ icon, label, value }: StatPillProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="flex items-center gap-1 text-caption text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-stat-sm font-bold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

/** Exported for testing convenience. */
export { StatPill };

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * MarketHero renders the top section of a market detail page.
 *
 * Visual hierarchy (top-to-bottom):
 *  1. Campaign badge (optional) + StatusBadge + category tag — small labels
 *  2. Market title (h1) + description
 *  3. Probability bar (one or two outcomes)
 *  4. Stat strip: volume · participants · time left
 *  5. Share button (optional)
 *
 * @example
 * ```tsx
 * <MarketHero
 *   title="Will Argentina win the 2026 FIFA World Cup?"
 *   status="open"
 *   category="Football"
 *   volume="42,000 USDC"
 *   participants={3840}
 *   timeLeft="18 days"
 *   outcomes={[
 *     { label: "Yes", probability: 62 },
 *     { label: "No", probability: 38 },
 *   ]}
 *   isGrantFoxCampaign
 *   onShare={() => console.log("share!")}
 * />
 * ```
 */
export function MarketHero({
  title,
  description,
  status,
  category,
  volume,
  participants,
  timeLeft,
  outcomes,
  isGrantFoxCampaign = false,
  onShare,
  aboutModalTrigger,
  className,
  isLoading = false,
}: MarketHeroProps) {
  const heroId = useId();
  const descId = `${heroId}-desc`;

  // Determine the leading outcome probability for the aria label on the bar.
  const leadOutcome = outcomes?.[0];
  const trailOutcome = outcomes?.[1];

  if (isLoading) {
    return (
      <section
        aria-labelledby={`${heroId}-title`}
        data-testid="market-hero-skeleton"
        className={cn(
          "w-full rounded-2xl border border-border bg-card px-5 py-6 sm:px-8 sm:py-8",
          "bg-gradient-to-br from-card to-muted/30 dark:from-card dark:to-muted/10",
          className
        )}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2" data-testid="market-hero-skeleton-lines">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        <div className="mb-5 space-y-2" data-testid="market-hero-skeleton-text">
          <Skeleton className="h-8 w-3/4 rounded-md" data-testid="market-hero-skeleton-line" />
          <Skeleton className="h-4 w-full rounded-md" data-testid="market-hero-skeleton-line" />
          <Skeleton className="h-4 w-5/6 rounded-md" data-testid="market-hero-skeleton-line" />
        </div>

        <div className="mb-5 space-y-2" data-testid="market-hero-skeleton-bar">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20 rounded-md" data-testid="market-hero-skeleton-line" />
            <Skeleton className="h-4 w-20 rounded-md" data-testid="market-hero-skeleton-line" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>

        <div
          className="mb-5 flex flex-wrap gap-x-6 gap-y-3 border-t border-border pt-4"
          data-testid="market-hero-skeleton-stats"
        >
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={`${heroId}-title`}
      className={cn(
        // Base layout
        "w-full rounded-2xl border border-border bg-card px-5 py-6 sm:px-8 sm:py-8",
        // Subtle gradient tint that respects dark mode via Tailwind's `dark:` prefix
        "bg-gradient-to-br from-card to-muted/30 dark:from-card dark:to-muted/10",
        // Ensure keyboard users can see a clear focus outline when the hero
        // itself receives focus, such as when used in a composite surface.
        "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
    >
      {/* ── Row 1 · Labels ──────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* GrantFox FWC26 campaign badge */}
        {isGrantFoxCampaign && (
          <Badge
            variant="secondary"
            className="gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
          >
            {/* Trophy emoji conveying the FWC context — purely decorative */}
            <span aria-hidden="true">🏆</span>
            GrantFox FWC26
          </Badge>
        )}

        {/* Market lifecycle status */}
        <StatusBadge status={status} />

        {/* Category tag */}
        {category && (
          <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-caption font-medium text-muted-foreground">
            {category}
          </span>
        )}
      </div>

      {/* ── Row 2 · Title + description ─────────────────────────── */}
      <div className="mb-5">
        <h1
          id={`${heroId}-title`}
          className="text-h2-responsive font-bold tracking-tight text-foreground text-balance"
        >
          {title}
        </h1>

        {description && (
          <p
            id={descId}
            className="mt-2 text-body-md leading-relaxed text-muted-foreground line-clamp-3"
          >
            {description}
          </p>
        )}
      </div>

      {/* ── Row 3 · Probability bar ──────────────────────────────── */}
      {leadOutcome && (
        <div className="mb-5" data-testid="probability-section">
          {/* Outcome labels */}
          <div className="mb-1.5 flex justify-between text-body-sm font-medium">
            {/*
             * Tabular-nums contract (issue #556): the parent `<span>` uses
             * `text-body-sm`, which is NOT one of the stat tokens bound to
             * `font-variant-numeric: tabular-nums` by `styles/globals.css`,
             * so the property is absent in the cascade for this subtree.
             * An explicit `tabular-nums` on the inner span is therefore
             * required, and it keeps the digits column-aligned regardless
             * of the leading label or trailing "%" spacing.
             */}
            <span className="text-emerald-600 dark:text-emerald-400">
              {leadOutcome.label}{" "}
              <span className="tabular-nums">{leadOutcome.probability}%</span>
            </span>
            {trailOutcome && (
              <span className="text-muted-foreground">
                {trailOutcome.label}{" "}
                <span className="tabular-nums">{trailOutcome.probability}%</span>
              </span>
            )}
          </div>

          {/* Bar track */}
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-muted"
            aria-hidden="true"
          >
            {/* Leading outcome fill */}
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
              style={{ width: `${leadOutcome.probability}%` }}
            />
          </div>

          {/*
           * Accessible progress bar — screen readers use this, sighted users
           * see the visual bar above (aria-hidden).
           */}
          <div
            role="progressbar"
            aria-valuenow={leadOutcome.probability}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${leadOutcome.label} probability: ${leadOutcome.probability}%`}
            className="sr-only"
          />
        </div>
      )}

      {/* ── Row 4 · Stat strip ───────────────────────────────────── */}
      {(volume || participants != null || timeLeft) && (
        <div
          className="mb-5 flex flex-wrap gap-x-6 gap-y-3 border-t border-border pt-4"
          data-testid="stat-strip"
        >
          {volume && (
            <StatPill
              icon={<DollarSign className="h-3 w-3" aria-hidden="true" />}
              label="Volume"
              value={volume}
            />
          )}
          {participants != null && (
            <StatPill
              icon={<Users className="h-3 w-3" aria-hidden="true" />}
              label="Participants"
              value={participants.toLocaleString()}
            />
          )}
          {timeLeft && (
            <StatPill
              icon={<Clock className="h-3 w-3" aria-hidden="true" />}
              label="Closes in"
              value={timeLeft}
            />
          )}
        </div>
      )}

      {/* ── Row 5 · Actions ─────────────────────────────────────── */}
      {(onShare || aboutModalTrigger) && (
        <div className="flex flex-wrap items-center gap-3">
          {aboutModalTrigger}
          {onShare && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShare}
              className="gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Share this market"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share
            </Button>
          )}
        </div>
      )}

      {/* Live region announces state changes, volume, and participants */}
      <LiveRegion
        message={[
          `Market status is ${status.replace('_', ' ')}.`,
          volume && `Market volume: ${volume}.`,
          participants != null && `${participants.toLocaleString()} participants.`
        ].filter(Boolean).join(" ")}
      />
    </section>
  );
}

export default MarketHero;
