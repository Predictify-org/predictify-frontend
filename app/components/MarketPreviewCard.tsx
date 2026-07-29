"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, Globe, BarChart3, Bell, ExternalLink, Clock, Coins } from "lucide-react";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "../../components/ui/hover-card";
import type { Market } from "../../content/markets.sample";
import { useFollowsStore } from "../state/follows";
import { useUserLimitsStore } from "../state/userLimits";
import Sparkline from "../../components/Sparkline";
import { HeatStrip } from "./HeatStrip";
import { SaveForLater } from "./SaveForLater";

// ---------------------------------------------------------------------------
// Icon & Color Mappings
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

const statusBadgeMap: Record<string, { label: string; style: string }> = {
  active: { label: "Active", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  ended: { label: "Ended", style: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" },
  upcoming: { label: "Upcoming", style: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
};

// ---------------------------------------------------------------------------
// Props Interface
// ---------------------------------------------------------------------------

export interface MarketPreviewCardProps {
  /** The target market data object */
  market: Market;
  /** Trigger element that triggers the hover/focus preview */
  children: React.ReactNode;
  /** Positioning side relative to trigger (default: 'top') */
  side?: "top" | "bottom" | "left" | "right";
  /** Alignment relative to trigger (default: 'center') */
  align?: "start" | "center" | "end";
  /** Delay in ms before opening hover card on mouse enter (default: 300ms) */
  openDelay?: number;
  /** Delay in ms before closing hover card on mouse leave (default: 150ms) */
  closeDelay?: number;
  /** Whether to show quick action buttons in card footer (default: true) */
  showActions?: boolean;
  /** Whether to render 24h heat strip inside preview (default: true) */
  showHeatStrip?: boolean;
  /** Whether to render trend sparkline inside preview (default: true) */
  showSparkline?: boolean;
  /** Optional custom class name for the popover content */
  className?: string;
  /** Controlled open state (optional) */
  open?: boolean;
  /** Callback on open state change (optional) */
  onOpenChange?: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarketPreviewCard({
  market,
  children,
  side = "top",
  align = "center",
  openDelay = 300,
  closeDelay = 150,
  showActions = true,
  showHeatStrip = true,
  showSparkline = true,
  className,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: MarketPreviewCardProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    setControlledOpen?.(nextOpen);
  };

  const isFollowing = useFollowsStore((s) => s.isFollowing(market.id));
  const remainingAllowance = useUserLimitsStore((s) =>
    s.getRemainingDailyAllowance(market.id),
  );

  const IconComponent = iconMap[market.icon as keyof typeof iconMap] || TrendingUp;
  const colors = colorMap[market.iconColor as keyof typeof colorMap] || colorMap.blue;
  const statusInfo = statusBadgeMap[market.status] || statusBadgeMap.active;

  // Keyboard accessibility: handle Escape key to close open preview card
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Keyboard focus & blur handler wrappers for trigger
  const handleFocus = () => {
    handleOpenChange(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // If focus moves into content inside the hovercard, don't close
    if (contentRef.current && contentRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    handleOpenChange(false);
  };

  return (
    <HoverCard
      open={isOpen}
      onOpenChange={handleOpenChange}
      openDelay={openDelay}
      closeDelay={closeDelay}
    >
      <HoverCardTrigger
        asChild
        onFocus={handleFocus}
        onBlur={handleBlur}
        data-testid={`market-preview-trigger-${market.id}`}
      >
        <span className="inline-block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171629] rounded-md">
          {children}
        </span>
      </HoverCardTrigger>

      <HoverCardContent
        ref={contentRef}
        side={side}
        align={align}
        sideOffset={8}
        aria-label={`Market preview for ${market.title}`}
        data-testid={`market-preview-content-${market.id}`}
        className={`z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-white/15 bg-[#1B1A2E]/95 p-4 text-white shadow-2xl backdrop-blur-md transition-all duration-200 ${className ?? ""}`}
      >
        {/* Header: Icon, Title & Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`rounded-lg p-2 ${colors.bg}`}>
              <IconComponent className={`h-4 w-4 ${colors.icon}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm text-white line-clamp-1">
                  {market.title}
                </h4>
              </div>
              <p className="text-xs text-white/60 line-clamp-1">{market.description}</p>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusInfo.style}`}
            data-testid="market-status-badge"
          >
            {statusInfo.label}
          </span>
        </div>

        {/* Odds & Probability bar */}
        <div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-2.5">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-green-400 tabular-nums">Yes: {market.yesOdds}%</span>
            <span className="text-red-400 tabular-nums">No: {market.noOdds}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={market.yesOdds} aria-valuemin={0} aria-valuemax={100} aria-label="Yes probability">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
              style={{ width: `${market.yesOdds}%` }}
            />
          </div>
        </div>

        {/* Stats Grid: Pool Amount & Time Remaining */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1.5 text-white/80">
            <Coins className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
            <span className="truncate">
              Pool: <strong className="text-white tabular-nums">{market.poolAmount.toLocaleString()} USDC</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1.5 text-white/80">
            <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" aria-hidden="true" />
            <span className="truncate">
              Ends: <strong className="text-white">{market.endsIn}</strong>
            </span>
          </div>
        </div>

        {/* Optional Sparkline Graph */}
        {showSparkline && market.sparklineData && market.sparklineData.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] text-white/60 mb-1">
              <span>7-Day Trend</span>
              <span className="text-emerald-400 font-medium">+Trend</span>
            </div>
            <Sparkline
              data={market.sparklineData}
              className="h-8 text-white/60"
              data-testid={`preview-sparkline-${market.id}`}
            />
          </div>
        )}

        {/* Optional Heat Strip */}
        {showHeatStrip && market.activity24h && market.activity24h.length > 0 && (
          <div className="mb-3">
            <div className="text-[11px] text-white/60 mb-1">24h Activity Heatmap</div>
            <HeatStrip
              data={market.activity24h}
              className="w-full"
              data-testid={`preview-heat-strip-${market.id}`}
            />
          </div>
        )}

        {/* Following & Allowance info */}
        <div className="space-y-1.5 text-[11px]">
          {isFollowing && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 font-medium text-purple-300 ring-1 ring-purple-400/30"
              data-testid="preview-following-indicator"
            >
              <Bell className="h-3 w-3" aria-hidden="true" />
              You&apos;re following this market
            </span>
          )}

          <p
            className="text-white/70"
            data-testid="preview-allowance-nudge"
          >
            Daily allowance remaining: <strong className="text-white">{remainingAllowance} USDC</strong>
          </p>
        </div>

        {/* Card Footer Quick Actions */}
        {showActions && (
          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            <SaveForLater marketId={market.id} marketTitle={market.title} />

            <Link
              href={`/markets/${market.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              data-testid={`preview-view-market-${market.id}`}
            >
              <span>View Market</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

export default MarketPreviewCard;
