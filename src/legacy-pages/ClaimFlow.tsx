"use client";

import "@/styles/typography.css";
import React, { useState, useEffect, useCallback } from "react";
import "../styles/print.css";
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
import {
  Trophy,
  AlertCircle,
  CheckCircle,
  Loader2,
  Share2,
} from "lucide-react";
import KbdHint from "../components/KbdHint";

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

const MOCK_CLAIMABLE: ClaimableReward[] = [
  { id: "claim-1", marketTitle: "Arsenal vs Liverpool – Match Winner", marketId: "evt-arsenal-liverpool", amount: "450.00", tokenSymbol: "USDC", resolvedAt: "2026-07-24T10:00:00Z" },
  { id: "claim-2", marketTitle: "Bitcoin above $100k by July 2026?", marketId: "evt-btc-100k", amount: "120.00", tokenSymbol: "XLM", resolvedAt: "2026-07-23T18:30:00Z" },
  { id: "claim-3", marketTitle: "Will a major AI safety bill pass this quarter?", marketId: "evt-ai-bill", amount: "85.50", tokenSymbol: "USDC", resolvedAt: "2026-07-22T14:15:00Z" },
];

const MOCK_HISTORY: ClaimHistoryItem[] = [
  { id: "hist-1", marketTitle: "ETH closes above $4,000 this week", amount: "210.00", tokenSymbol: "USDC", claimedAt: "2026-07-21T09:00:00Z", txHash: "0xabc123...def456" },
  { id: "hist-2", marketTitle: "Finals series reaches game seven", amount: "75.00", tokenSymbol: "XLM", claimedAt: "2026-07-20T16:45:00Z", txHash: "0xdef789...ghi012" },
];

type PageStatus = "loading" | "success" | "empty" | "error";

export default function ClaimFlow() {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [claimable, setClaimable] = useState<ClaimableReward[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const reducedMotion = useReducedMotion();
  const { openShareSheet } = useClaimShare();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setClaimable(MOCK_CLAIMABLE);
      setStatus(MOCK_CLAIMABLE.length ? "success" : "empty");
    }, reducedMotion ? 0 : 1200);
    return () => window.clearTimeout(timer);
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

  useEffect(() => {
    const page = () => document.querySelector<HTMLElement>(".claimflow-page");
    const beforePrint = () => {
      page()?.querySelectorAll<HTMLDetailsElement>("details.claimflow-expandable").forEach((detail) => {
        detail.dataset.claimflowWasOpen = String(detail.open);
        detail.open = true;
      });
    };
    const afterPrint = () => {
      page()?.querySelectorAll<HTMLDetailsElement>("details.claimflow-expandable").forEach((detail) => {
        if (detail.dataset.claimflowWasOpen === "false") detail.open = false;
        delete detail.dataset.claimflowWasOpen;
      });
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  const handleClaim = useCallback(async (reward: ClaimableReward) => {
    setClaimingId(reward.id);
    setAnnouncement(`Claiming ${reward.amount} ${reward.tokenSymbol} from "${reward.marketTitle}".`);
    await new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 0 : 800));
    setClaimable((items) => items.filter((item) => item.id !== reward.id));
    setClaimingId(null);
    customToast.success("Winnings Claimed Successfully!", {
      description: `You've successfully claimed ${reward.amount} ${reward.tokenSymbol} for your prediction on "${reward.marketTitle}".`,
      onShare: () => openShareSheet({ marketTitle: reward.marketTitle, claimAmount: reward.amount, marketId: reward.marketId, tokenSymbol: reward.tokenSymbol }),
    });
    setAnnouncement(`Successfully claimed ${reward.amount} ${reward.tokenSymbol}.`);
  }, [openShareSheet, reducedMotion]);

  // Global Keyboard Shortcut to Claim the first available reward
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "c" &&
        claimable.length > 0 &&
        !claimingId &&
        // Ignore shortcut if user is typing in an input
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        handleClaim(claimable[0]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [claimable, claimingId, handleClaim]);

  const handleRetry = useCallback(() => {
    setStatus("loading");
    setClaimable([]);
    window.setTimeout(() => {
      setClaimable(MOCK_CLAIMABLE);
      setStatus("success");
    }, reducedMotion ? 0 : 1200);
  }, [reducedMotion]);

  return (
    <div className="claimflow-page mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:max-w-5xl lg:px-8">
      <LiveRegion className="claimflow-live-region" message={announcement} data-testid="claimflow-live-region" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Claim Winnings</h1>
          <p className="text-sm leading-6 text-muted-foreground">Claim your rewards from resolved prediction markets.</p>
        </div>
        {status === "error" && <Button variant="outline" size="sm" onClick={handleRetry} className="claimflow-chrome self-start rounded-full">Retry</Button>}
      </div>

      <section aria-labelledby="claimable-heading" className="claimflow-section space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm sm:space-y-4 sm:p-5">
        <div className="flex items-center gap-2"><h2 id="claimable-heading" className="text-base font-semibold text-foreground sm:text-lg">Pending Claims</h2>{status === "success" && claimable.length > 0 && <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs sm:text-sm">{claimable.length}</Badge>}</div>
        {status === "loading" && <div className="space-y-3 sm:space-y-4" data-testid="claimflow-skeletons">{[0, 1, 2].map((index) => <Card key={index} className="overflow-hidden border-border/60 bg-card/80 shadow-sm"><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="flex-1 space-y-3"><Skeleton className="h-5 w-full max-w-[75%] rounded-md" /><Skeleton className="h-8 w-24 rounded-full" /></div><div className="claimflow-chrome flex items-center gap-2"><Skeleton className="h-10 w-24 rounded-full" /></div></CardContent></Card>)}</div>}
        {status === "error" && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Failed to load rewards</AlertTitle><AlertDescription>We couldn&apos;t fetch your claimable rewards. Check your connection and try again.</AlertDescription><Button variant="outline" size="sm" onClick={handleRetry} className="claimflow-chrome mt-3 rounded-full">Retry</Button></Alert>}
        {(status === "success" || status === "empty") && (claimable.length === 0 ? <EmptyState icon={Trophy} title="No claimable rewards" description="When your predictions are resolved and you've won, your rewards will appear here." ctaText="Explore Markets" ctaHref="/events" /> : <ul className="space-y-3 sm:space-y-4" aria-label="Claimable rewards">{claimable.map((reward) => { const isClaiming = claimingId === reward.id; return <li key={reward.id}><Card className="overflow-hidden border-border/60 bg-card/80 shadow-sm"><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="min-w-0 flex-1 space-y-3"><h3 className="text-sm font-semibold leading-6 text-foreground sm:text-base">{reward.marketTitle}</h3><div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm"><Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs font-semibold">{reward.amount} {reward.tokenSymbol}</Badge><span>Resolved {new Date(reward.resolvedAt).toLocaleDateString()}</span></div></div><div className="claimflow-action flex items-center gap-2 self-end sm:self-center"><Button onClick={() => handleClaim(reward)} disabled={isClaiming} size="sm" className="rounded-full">{isClaiming ? <><Loader2 className="mr-2 h-4 w-4" />Claiming…</> : <><Trophy className="mr-2 h-4 w-4" />Claim</>}</Button><Button variant="outline" size="icon" aria-label={`Share claim for ${reward.marketTitle}`} onClick={() => openShareSheet({ marketTitle: reward.marketTitle, claimAmount: reward.amount, marketId: reward.marketId, tokenSymbol: reward.tokenSymbol })}><Share2 className="h-4 w-4" /></Button></div></CardContent></Card></li>; })}</ul>)}
      </section>

      <section aria-labelledby="history-heading" className="claimflow-section space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm sm:space-y-4 sm:p-5"><h2 id="history-heading" className="text-base font-semibold text-foreground sm:text-lg">Claim History</h2>{MOCK_HISTORY.length === 0 ? <EmptyState icon={CheckCircle} title="No claim history" description="Your completed claims will appear here." ctaText="Explore Markets" ctaHref="/events" /> : <div className="overflow-x-auto rounded-xl border border-border/60 bg-background/60"><table className="w-full min-w-[560px] text-sm"><thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left font-medium text-muted-foreground">Market</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Transaction</th></tr></thead><tbody className="divide-y">{MOCK_HISTORY.map((item) => <tr key={item.id}><td className="px-4 py-3 font-medium">{item.marketTitle}</td><td className="px-4 py-3">{item.amount} {item.tokenSymbol}</td><td className="px-4 py-3">{new Date(item.claimedAt).toLocaleDateString()}</td><td className="px-4 py-3 font-mono text-xs">{item.txHash}</td></tr>)}</tbody></table></div>}</section>
    </div>
  );
}
