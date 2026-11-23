"use client";

/**
 * MarketDetailClient
 *
 * Thin client shell that wires up interactive handlers (share, place-bet)
 * and passes them to MarketKbdHints, and renders the ReportMarketDialog trigger.
 * Kept as a separate file so the main page.tsx stays a Server Component
 * (no "use client" boundary there).
 *
 * Responsibilities:
 *  - Provide the `onShare` callback (navigator.share / fallback copy).
 *  - Provide the `onPlaceBet` callback (scrolls/focuses bet input).
 *  - Render <MarketKbdHints> with both callbacks.
 *  - Render <ReportMarketDialog> to allow reporting the market.
 */

import React, { Suspense, useCallback } from "react";
import { MarketDetailTabs } from "@/components/market/MarketDetailTabs";
import { OddsHistoryChart } from "@/components/market/OddsHistoryChart";
import { MarketActivityFeed } from "@/components/market/MarketActivityFeed";
import { ReportMarketDialog } from "@/components/moderation/ReportMarketDialog";
import { MarketKbdHints } from "./MarketKbdHints";

interface MarketDetailClientProps {
  marketTitle: string;
  marketId: string;
  overview?: React.ReactNode;
  activity?: React.ReactNode;
  resolution?: React.ReactNode;
  timeline?: React.ReactNode;
}

export function MarketDetailClient({
  marketTitle,
  marketId,
  overview,
  activity,
  resolution,
  timeline,
}: MarketDetailClientProps) {
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/markets/${marketId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: marketTitle, url });
      } catch {
        // User cancelled or share not supported — fall through to clipboard.
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // Clipboard unavailable (e.g. non-secure context); silently ignore.
      }
    }
  }, [marketTitle, marketId]);

  const handlePlaceBet = useCallback(() => {
    // Scroll the bet amount input into view and focus it.
    // The input carries id="bet-amount" (set by BetForm).
    const betInput = document.getElementById("bet-amount");
    if (betInput) {
      betInput.scrollIntoView({ behavior: "smooth", block: "center" });
      (betInput as HTMLInputElement).focus({ preventScroll: true });
    }
  }, []);

  return (
    <>
      <div className="flex items-center justify-end mt-4">
        <ReportMarketDialog
          marketId={marketId}
          marketTitle={marketTitle}
        />
      </div>
      <section aria-label="Market detail sections" className="mt-6 sm:mt-8">
        <Suspense fallback={null}>
          <MarketDetailTabs
            overview={
              overview ?? (
                <div className="text-sm text-muted-foreground">
                  <p>
                    Market overview, probability breakdown, and resolution
                    criteria will be displayed here.
                  </p>
                </div>
              )
            }
            odds={<OddsHistoryChart marketId={marketId} />}
            activity={
              activity ?? <MarketActivityFeed marketId={marketId} />
            }
            resolution={
              resolution ?? (
                <div className="text-sm text-muted-foreground">
                  <p>
                    Resolution criteria, oracle sources, and outcome
                    verification details will be displayed here.
                  </p>
                </div>
              )
            }
            timeline={
              timeline ?? (
                <div className="text-sm text-muted-foreground">
                  <p>
                    The full market lifecycle timeline — from creation through
                    resolution — will be shown here.
                  </p>
                </div>
              )
            }
          />
        </Suspense>
      </section>
      <MarketKbdHints onShare={handleShare} onPlaceBet={handlePlaceBet} />
    </>
  );
}
