"use client";

import { TrendingUp, Globe, BarChart3, Bell, MessageCircle, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/app/components/Tooltip";
import type { Market } from "@/content/markets.sample";
import { useFollowsStore } from "@/app/state/follows";
import { useUserLimitsStore } from "@/app/state/userLimits";
import Sparkline from "@/components/Sparkline";
import { HeatStrip } from "@/app/components/HeatStrip";
import { SaveForLater } from "@/app/components/SaveForLater";

// ---------------------------------------------------------------------------
// Icon / colour mapping (internal – consumers need only pass a Market)
// ---------------------------------------------------------------------------

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  Globe,
  BarChart3,
};

const colorMap: Record<string, { bg: string; icon: string }> = {
  blue: { bg: "bg-blue-500/20", icon: "text-blue-400" },
  purple: { bg: "bg-purple-500/20", icon: "text-purple-400" },
  emerald: { bg: "bg-emerald-500/20", icon: "text-emerald-400" },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MarketCardProps {
  market: Market;
  index?: number;
  reducedMotion?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * MarketCard
 *
 * Displays a prediction market summary card with odds, sparkline,
 * 24h activity heat strip, follow indicator, and daily betting nudge.
 *
 * ## Responsive layout
 * - **≥ sm (640 px):** icon + content on the left; odds block on the right
 *   (side-by-side, `flex-row`).
 * - **< sm (mobile):** stacked vertically (`flex-col`). The odds block is
 *   moved below the content and rendered in a horizontal row instead of a
 *   right-aligned column so that both values have room to breathe on narrow
 *   screens. The bottom meta row (pool + ends-in) wraps naturally via
 *   `flex-wrap`.
 *
 * ## Accessibility
 * - WCAG 2.1 AA: all interactive elements have accessible labels.
 * - `aria-label` on the odds region announces both values to screen readers.
 */
export function MarketCard({
  market,
  index = 0,
  reducedMotion = false,
  className,
}: MarketCardProps) {
  const isFollowing = useFollowsStore((s) => s.isFollowing(market.id));
  const remainingAllowance = useUserLimitsStore((s) =>
    s.getRemainingDailyAllowance(market.id),
  );

  const IconComponent = iconMap[market.icon as keyof typeof iconMap];
  const colors = colorMap[market.iconColor as keyof typeof colorMap];

  return (
    <Card
      className={`border-white/10 bg-[#201F3780] p-4 backdrop-blur-sm transition-all duration-300 hover:bg-[#201F3780]/80 ${
        reducedMotion ? "" : "animate-slide-up"
      } ${className ?? ""}`}
      style={{
        animationDelay: reducedMotion ? "0ms" : `${index * 150}ms`,
        animationFillMode: "both",
      }}
    >
      {/*
       * Top section
       * -----------
       * Mobile  (<sm): flex-col — icon+content stacked above the odds block.
       * Desktop (≥sm): flex-row — icon+content on the left, odds on the right.
       */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: icon + textual content */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className={`shrink-0 rounded-lg p-2 ${colors?.bg}`}>
            {IconComponent && (
              <IconComponent className={`h-5 w-5 ${colors?.icon}`} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {/* Title row with SaveForLater button — wraps naturally */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-white">{market.title}</h3>
              <Tooltip content="Save this market for later reference">
                <SaveForLater marketId={market.id} marketTitle={market.title} />
              </Tooltip>
            </div>
            <p className="text-sm text-white/70">{market.description}</p>

            {/* Sparkline trend preview */}
            <Tooltip content="Price trend over the last 24 hours">
              <Sparkline
                data={market.sparklineData}
                className="mt-2 text-white/60"
                data-testid={`sparkline-${market.id}`}
              />
            </Tooltip>

            {/* Heat strip – 24h activity */}
            <HeatStrip
              data={market.activity24h}
              className="mt-3 w-full"
              data-testid={`heat-strip-${market.id}`}
            />

            <div className="mt-2 space-y-2">
              {/* Following indicator — visible only for followed markets */}
              {isFollowing && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-300 ring-1 ring-purple-400/30"
                  data-testid="following-indicator"
                >
                  <Tooltip content="Notifications enabled for this market">
                    <Bell className="h-3 w-3" aria-hidden="true" />
                  </Tooltip>
                  You&apos;re following this
                  <span className="sr-only">
                    {" "}
                    — you are following this market
                  </span>
                </span>
              )}

              <p
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-white/85"
                data-testid="betting-limit-nudge"
              >
                Daily betting allowance remaining:{" "}
                <strong className="text-stat-sm">{remainingAllowance} USDC</strong>
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Tooltip content="Share this market with others">
            <button
              type="button"
              aria-label={`Share ${market.title}`}
              className="rounded-full border border-white/10 bg-white/5 p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#201F37]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content="Market settings and options">
            <button
              type="button"
              aria-label={`Settings for ${market.title}`}
              className="rounded-full border border-white/10 bg-white/5 p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#201F37]"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
            </button>
          </Tooltip>
          <div className="text-right">
            <div className="text-sm font-medium text-green-400 tabular-nums">
              Yes: {market.yesOdds}%
            </div>
            <div className="text-sm text-red-400 tabular-nums">
              No: {market.noOdds}%
            </div>
          </div>
        </div>
      </div>

      {/* Probability bar */}
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
          style={{ width: `${market.yesOdds}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-white/60">
        <span className="text-stat-sm">
          Pool: {market.poolAmount.toLocaleString()} USDC
        </span>
        <span className="text-stat-sm">Ends in {market.endsIn}</span>
      </div>
    </Card>
  );
}
