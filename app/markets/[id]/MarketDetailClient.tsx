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

import React, { useCallback } from "react";
import { MarketKbdHints } from "./MarketKbdHints";
import { ReportMarketDialog } from "@/components/moderation/ReportMarketDialog";

interface MarketDetailClientProps {
  marketTitle: string;
  marketId: string;
}

export function MarketDetailClient({
  marketTitle,
  marketId,
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
    <div className="flex flex-col gap-4 mt-6">
      <div className="flex items-center justify-end">
        <ReportMarketDialog
          marketId={marketId}
          marketTitle={marketTitle}
        />
      </div>
      <MarketKbdHints onShare={handleShare} onPlaceBet={handlePlaceBet} />
    </div>
  );
}
