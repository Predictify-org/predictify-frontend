/**
 * StatCard Component — Issue #646: Focus Visible Accessibility
 *
 * Updated for Issue #770: Add copy-to-clipboard affordance on Dashboard.
 * Each stat value in the success state gets a hover-reveal copy button that
 * copies the value to the clipboard with a success toast.
 *
 * All interactive elements in this component use focus-visible to show
 * keyboard focus outlines that meet WCAG 2.1 AA (3:1 contrast ratio).
 *
 * Interactive elements and their focus treatment:
 * - Copy button: Uses Button component with full focus-visible ring
 * - Empty state CTA Button: Uses Button component with full focus-visible ring
 * - Error state Retry Button: Uses Button component with full focus-visible ring
 * - All buttons use Tailwind's focus-visible utilities: outline-none, ring-2, ring-offset-2
 *
 * Uses Tailwind's focus-visible: variant which targets :focus-visible pseudo-class
 * — visible to keyboard users, hidden for mouse users.
 */

import type { Stat } from "@/types/index";
import { Copy, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback, useEffect, useRef } from "react";

export type StatEmptyVariant = 'volume' | 'predictions' | 'win-rate' | 'leaderboard';

interface StatCardProps {
  stat?: Stat;
  index: number;
  /**
   * Determines which UI variant to display.
   * - "loading": shows a skeleton placeholder.
   * - "empty": shows an empty state with an illustration and CTA.
   * - "error": shows an error alert with a retry button.
   */
  status?: "loading" | "empty" | "error";
  /** The variant of empty state to show, which determines illustration and copy */
  emptyVariant?: StatEmptyVariant;
  /** Callback invoked when the retry button is clicked in error state */
  onRetry?: () => void;
}

const EMPTY_CONFIGS: Record<StatEmptyVariant, { illustration: string; title: string; description: string; cta: string; href: string }> = {
  volume: {
    illustration: "/assets/empty-states/dashboard/volume.svg",
    title: "No Volume",
    description: "Start trading to see activity.",
    cta: "Explore Markets",
    href: "/events"
  },
  predictions: {
    illustration: "/assets/empty-states/dashboard/predictions.svg",
    title: "No Predictions",
    description: "Make your first prediction.",
    cta: "View Markets",
    href: "/events"
  },
  "win-rate": {
    illustration: "/assets/empty-states/dashboard/win-rate.svg",
    title: "0% Win Rate",
    description: "Win bets to see your rate.",
    cta: "Place a Bet",
    href: "/events"
  },
  leaderboard: {
    illustration: "/assets/empty-states/dashboard/leaderboard.svg",
    title: "Unranked",
    description: "Compete to climb the ranks.",
    cta: "Leaderboard",
    href: "/leaderboard"
  }
};

export function StatCard({ stat, index, status, emptyVariant = 'volume', onRetry }: StatCardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async (value: string, idx: number) => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      toast({
        title: "Copy not supported",
        description: "Your browser does not support copying to clipboard.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedIndex(idx);
      toast({
        title: "Copied!",
        description: `"${value}" copied to clipboard.`,
      });

      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Could not copy the value. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);
  if (status === "loading") {
    return <Skeleton className="h-44 w-full rounded-xl" />;
  }

  if (status === "empty") {
    const config = EMPTY_CONFIGS[emptyVariant];
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-2xl group transition-all duration-300 hover:border-cyan-500/30">
        <div className="relative w-16 h-16 mb-3">
          <img
            src={config.illustration}
            alt={config.title}
            className="w-full h-full object-contain filter group-hover:scale-110 transition-transform duration-300"
          />
        </div>
        <p className="text-base font-semibold text-slate-100 mb-1">{config.title}</p>
        <p className="text-xs text-slate-400 mb-4">{config.description}</p>
        <Button asChild size="sm" variant="outline" className="h-8 text-xs border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-400">
          <Link href={config.href}>{config.cta}</Link>
        </Button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <Alert variant="destructive" role="alert">
        <AlertTitle>Failed to load KPI</AlertTitle>
        <AlertDescription>
          An error occurred while fetching the data.
        </AlertDescription>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="mt-2">
            Retry
          </Button>
        )}
      </Alert>
    );
  }

  // Normal success state – render the stat card UI
    const isCopied = copiedIndex === index;
    return (
      <div className="relative group">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2">
          <div className="flex items-start justify-between gap-2">
            <div
              data-numeric="true"
              className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-2 tabular-nums"
            >
              {stat?.value}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-m-1 h-8 w-8 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => stat?.value && handleCopy(stat.value, index)}
              aria-label={`Copy ${stat?.label ?? "stat"} value ${stat?.value ?? ""}`}
              aria-pressed={isCopied}
              title="Copy value"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="sr-only" aria-live="polite">
                {isCopied ? `${stat?.value} copied to clipboard` : ""}
              </span>
            </Button>
          </div>
          <div className="text-slate-400 font-medium text-sm sm:text-base">
            {stat?.label}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
      </div>
    );
  }
