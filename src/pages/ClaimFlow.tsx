"use client";

import "@/styles/typography.css";
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { LiveRegion } from "@/components/ui/live-region";
import { useClaimShare } from "@/context/ClaimShareContext";
import { customToast } from "@/components/ui/custom-toast";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Trophy, AlertCircle, CheckCircle, Loader2, Share2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClaimableReward {
  id: string;
  marketTitle: string;
  marketId: string;
  amount: string;
  tokenSymbol: string;
  resolvedAt: string;
}

interface ClaimHistoryItem {
  id: string;
  marketTitle: string;
  amount: string;
  tokenSymbol: string;
  claimedAt: string;
  txHash: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_CLAIMABLE: ClaimableReward[] = [
  {
    id: "claim-1",
    marketTitle: "Arsenal vs Liverpool – Match Winner",
    marketId: "evt-arsenal-liverpool",
    amount: "450.00",
    tokenSymbol: "USDC",
    resolvedAt: "2026-07-24T10:00:00Z",
  },
  {
    id: "claim-2",
    marketTitle: "Bitcoin above $100k by July 2026?",
    marketId: "evt-btc-100k",
    amount: "120.00",
    tokenSymbol: "XLM",
    resolvedAt: "2026-07-23T18:30:00Z",
  },
  {
    id: "claim-3",
    marketTitle: "Will a major AI safety bill pass this quarter?",
    marketId: "evt-ai-bill",
    amount: "85.50",
    tokenSymbol: "USDC",
    resolvedAt: "2026-07-22T14:15:00Z",
  },
];

const MOCK_HISTORY: ClaimHistoryItem[] = [
  {
    id: "hist-1",
    marketTitle: "ETH closes above $4,000 this week",
    amount: "210.00",
    tokenSymbol: "USDC",
    claimedAt: "2026-07-21T09:00:00Z",
    txHash: "0xabc123...def456",
  },
  {
    id: "hist-2",
    marketTitle: "Finals series reaches game seven",
    amount: "75.00",
    tokenSymbol: "XLM",
    claimedAt: "2026-07-20T16:45:00Z",
    txHash: "0xdef789...ghi012",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type PageStatus = "loading" | "success" | "empty" | "error";

/**
 * ClaimFlow
 *
 * Page where users can claim winnings from resolved prediction markets.
 *
 * Responsive breakpoint audit (#581):
 *   - Mobile-first layout: single-column cards on narrow viewports,
 *     two-column card content on sm+ (≥640px).
 *   - Table columns progressively disclosed: date hidden below sm,
 *     tx hash hidden below lg (≥1024px).
 *   - Page container constrained to max-w-4xl with fluid padding that
 *     scales across breakpoints: px-4 → sm:px-6 → lg:px-8.
 *   - Claim actions stack vertically on mobile, side-by-side on sm+.
 *   - History card stacks vertically on mobile, full table on md+.
 *   - Skeleton cards maintain shape-parity with content cards across
 *     all breakpoints.
 *   - Reduced-motion: skips skeleton delay, disables Loader2 spin
 *     animation (WCAG 2.3.3).
 *   - WCAG 2.1 AA: heading hierarchy, labelled controls, colour is
 *     never the sole differentiator.
 *
 * Token polish (v7): section spacing and typography follow the shared
 * card, border, and surface tokens to keep the experience consistent with
 * the rest of the design system across light and dark modes.
 */
export default function ClaimFlow() {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [claimable, setClaimable] = useState<ClaimableReward[]>([]);
  const [history] = useState<ClaimHistoryItem[]>(MOCK_HISTORY);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const reducedMotion = useReducedMotion();
  const { openShareSheet } = useClaimShare();

  // Simulate async data fetch — skips delay under reduced motion
  useEffect(() => {
    if (reducedMotion) {
      setClaimable(MOCK_CLAIMABLE);
      setStatus(MOCK_CLAIMABLE.length > 0 ? "success" : "empty");
      return;
    }

    const timer = setTimeout(() => {
      if (MOCK_CLAIMABLE.length === 0) {
        setStatus("empty");
      } else {
        setClaimable(MOCK_CLAIMABLE);
        setStatus("success");
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [reducedMotion]);

  useEffect(() => {
    const messages: Record<PageStatus, string> = {
      loading: "Loading claimable rewards.",
      success: `Claimable rewards loaded. ${claimable.length} reward${claimable.length !== 1 ? "s" : ""} available.`,
      empty: "No claimable rewards at this time.",
      error: "Failed to load claimable rewards. Please try again.",
    };
    setAnnouncement(messages[status]);
  }, [status, claimable.length]);

  const handleClaim = useCallback(
    async (reward: ClaimableReward) => {
      setClaimingId(reward.id);
      setAnnouncement(`Claiming ${reward.amount} ${reward.tokenSymbol} from "${reward.marketTitle}".`);

      await new Promise((r) => setTimeout(r, reducedMotion ? 0 : 800));

      setClaimable((prev) => prev.filter((r) => r.id !== reward.id));
      setClaimingId(null);

      customToast.success("Winnings Claimed Successfully!", {
        description: `You've successfully claimed ${reward.amount} ${reward.tokenSymbol} for your prediction on "${reward.marketTitle}".`,
        onShare: () => {
          openShareSheet({
            marketTitle: reward.marketTitle,
            claimAmount: reward.amount,
            marketId: reward.marketId,
            tokenSymbol: reward.tokenSymbol,
          });
        },
      });

      setAnnouncement(
        `Successfully claimed ${reward.amount} ${reward.tokenSymbol}.`
      );
    },
    [reducedMotion, openShareSheet]
  );

  const handleRetry = useCallback(() => {
    setStatus("loading");
    setClaimable([]);
    setAnnouncement("Retrying. Loading claimable rewards.");
    setTimeout(() => {
      setClaimable(MOCK_CLAIMABLE);
      setStatus("success");
    }, reducedMotion ? 0 : 1200);
  }, [reducedMotion]);

  // ------------------------------------------------------------------
  // Render helpers
  // ------------------------------------------------------------------

  /** Skeleton cards — shape-parity with claimable reward cards. */
  const renderSkeletons = () => (
    <div className="space-y-3 sm:space-y-4" data-testid="claimflow-skeletons">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5">
            {/* Title + metadata */}
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-full max-w-[75%] rounded-md" />
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <Skeleton className="h-10 w-24 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderClaimableList = () => {
    if (claimable.length === 0) {
      return (
        <EmptyState
          icon={<Trophy className="h-12 w-12 text-muted-foreground" />}
          title="No claimable rewards"
          description="When your predictions are resolved and you've won, your rewards will appear here."
        />
      );
    }

    return (
      <ul className="space-y-3 sm:space-y-4" aria-label="Claimable rewards">
        {claimable.map((reward) => {
          const isClaiming = claimingId === reward.id;
          return (
            <li key={reward.id}>
              <Card className="overflow-hidden border-border/60 bg-card/80 shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5">
                  {/* Title + metadata */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <h3 className="text-sm font-semibold leading-6 text-foreground sm:text-base">
                      {reward.marketTitle}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                      <Badge
                        variant="secondary"
                        className="rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums sm:text-sm"
                      >
                        {reward.amount} {reward.tokenSymbol}
                      </Badge>
                      <span>
                        Resolved{" "}
                        {new Date(reward.resolvedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions — stack on mobile, row on sm+ */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      onClick={() => handleClaim(reward)}
                      disabled={isClaiming}
                      size="sm"
                      className="min-w-[92px] rounded-full sm:min-w-[104px] sm:px-5 sm:py-2.5"
                    >
                      {isClaiming ? (
                        <>
                          <Loader2
                            className={[
                              "mr-2 h-4 w-4",
                              !reducedMotion && "animate-spin",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          />
                          Claiming…
                        </>
                      ) : (
                        <>
                          <Trophy className="mr-2 h-4 w-4" />
                          Claim
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full border-border/70 sm:h-10 sm:w-10"
                      aria-label={`Share claim for ${reward.marketTitle}`}
                      onClick={() =>
                        openShareSheet({
                          marketTitle: reward.marketTitle,
                          claimAmount: reward.amount,
                          marketId: reward.marketId,
                          tokenSymbol: reward.tokenSymbol,
                        })
                      }
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    );
  };

  // ------------------------------------------------------------------
  // Main render
  // ------------------------------------------------------------------

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:max-w-5xl lg:px-8">
      <LiveRegion message={announcement} data-testid="claimflow-live-region" />

      {/* Page header — stacks on mobile, side-by-side on sm+ */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Claim Winnings
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Claim your rewards from resolved prediction markets.
          </p>
        </div>
        {status === "error" && (
          <Button variant="outline" size="sm" onClick={handleRetry} className="self-start rounded-full">
            Retry
          </Button>
        )}
      </div>

      {/* Claimable Rewards Section */}
      <section aria-labelledby="claimable-heading" className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm sm:space-y-4 sm:p-5">
        <div className="flex items-center gap-2">
          <h2
            id="claimable-heading"
            className="text-base font-semibold text-foreground sm:text-lg"
          >
            Pending Claims
          </h2>
          {status === "success" && claimable.length > 0 && (
            <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs sm:text-sm">
              {claimable.length}
            </Badge>
          )}
        </div>

        {status === "loading" && renderSkeletons()}

        {status === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load rewards</AlertTitle>
            <AlertDescription>
              We couldn&apos;t fetch your claimable rewards. Check your
              connection and try again.
            </AlertDescription>
            <Button variant="outline" size="sm" onClick={handleRetry} className="mt-3 rounded-full">
              Retry
            </Button>
          </Alert>
        )}

        {(status === "success" || status === "empty") && renderClaimableList()}
      </section>

      {/* Claim History Section */}
      <section aria-labelledby="history-heading" className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm sm:space-y-4 sm:p-5">
        <h2
          id="history-heading"
          className="text-base font-semibold text-foreground sm:text-lg"
        >
          Claim History
        </h2>

        {history.length === 0 ? (
          <EmptyState
            icon={<CheckCircle className="h-10 w-10 text-muted-foreground" />}
            title="No claim history"
            description="Your completed claims will appear here."
          />
        ) : (
          <>
            {/* Desktop/tablet: full table */}
            <div className="hidden sm:block overflow-x-auto rounded-xl border border-border/60 bg-background/60">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Market
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                      Date
                    </th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                      Transaction
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{item.marketTitle}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {item.amount} {item.tokenSymbol}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {new Date(item.claimedAt).toLocaleDateString()}
                      </td>
                      <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground lg:table-cell">
                        {item.txHash}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards instead of table */}
            <div className="flex flex-col gap-3 sm:hidden">
              {history.map((item) => (
                <Card key={item.id} className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
                  <CardContent className="flex flex-col gap-2 p-4">
                    <h3 className="text-sm font-semibold text-foreground">{item.marketTitle}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs tabular-nums">
                        {item.amount} {item.tokenSymbol}
                      </Badge>
                      <span>
                        {new Date(item.claimedAt).toLocaleDateString()}
                      </span>
                      <span className="font-mono">{item.txHash}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
