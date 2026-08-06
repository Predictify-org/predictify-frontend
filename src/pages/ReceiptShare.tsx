"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { LiveRegion } from "@/components/LiveRegion";
import { customToast } from "@/components/ui/custom-toast";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";

/** A single receipt item representing a status update event. */
interface ReceiptItem {
  id: string;
  title: string;
  status: "pending" | "confirmed" | "failed";
  amount: string;
  tokenSymbol: string;
  timestamp: string;
  txHash?: string;
}

const MOCK_RECEIPTS: ReceiptItem[] = [
  {
    id: "rec-1",
    title: "Claim settlement – Arsenal vs Liverpool",
    status: "confirmed",
    amount: "450.00",
    tokenSymbol: "USDC",
    timestamp: "2026-07-24T10:05:00Z",
    txHash: "0xreceipt...abc001",
  },
  {
    id: "rec-2",
    title: "Claim settlement – BTC above $100k",
    status: "pending",
    amount: "120.00",
    tokenSymbol: "XLM",
    timestamp: "2026-07-23T18:35:00Z",
  },
  {
    id: "rec-3",
    title: "Claim settlement – AI safety bill",
    status: "failed",
    amount: "85.50",
    tokenSymbol: "USDC",
    timestamp: "2026-07-22T14:20:00Z",
    txHash: "0xreceipt...fail003",
  },
];

type PageStatus = "loading" | "success" | "empty" | "error";

const STATUS_LABELS: Record<ReceiptItem["status"], string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  failed: "Failed",
};

const STATUS_VARIANTS: Record<ReceiptItem["status"], "secondary" | "default" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  failed: "destructive",
};

/**
 * ReceiptShare – Displays receipt/status updates with a polite aria-live
 * region so screen-reader users are informed of status changes (#650).
 */
export default function ReceiptShare() {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const reducedMotion = useReducedMotion();

  // Simulate async data load
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReceipts(MOCK_RECEIPTS);
      setStatus(MOCK_RECEIPTS.length ? "success" : "empty");
    }, reducedMotion ? 0 : 1000);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  // Announce status changes via the polite aria-live region
  useEffect(() => {
    const messages: Record<PageStatus, string> = {
      loading: "Loading receipt status updates.",
      success: `Receipt statuses loaded. ${receipts.length} receipt${receipts.length !== 1 ? "s" : ""} available.`,
      empty: "No receipt status updates at this time.",
      error: "Failed to load receipt statuses. Please try again.",
    };
    setAnnouncement(messages[status]);
  }, [status, receipts.length]);

  const handleRefresh = useCallback(async () => {
    setStatus("loading");
    setAnnouncement("Refreshing receipt statuses.");
    await new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 0 : 800));
    setReceipts(MOCK_RECEIPTS);
    setStatus("success");
    setAnnouncement(`Receipt statuses refreshed. ${MOCK_RECEIPTS.length} receipts available.`);
  }, [reducedMotion]);

  const handleRetry = useCallback(() => {
    setStatus("loading");
    setReceipts([]);
    window.setTimeout(() => {
      setReceipts(MOCK_RECEIPTS);
      setStatus("success");
    }, reducedMotion ? 0 : 1000);
  }, [reducedMotion]);

  return (
    <div className="receiptshare-page mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:max-w-5xl lg:px-8">
      {/* ARIA live region for screen-reader status announcements (#650) */}
      <LiveRegion
        message={announcement}
        data-testid="receiptshare-live-region"
      />

      <div className="receiptshare-chrome flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Receipt Share
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Track status of your claim receipts and settlements.
          </p>
        </div>
        <div className="receiptshare-chrome flex items-center gap-2">
          {status === "error" && (
            <Button variant="outline" size="sm" onClick={handleRetry} className="rounded-full">
              Retry
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={status === "loading"}
            className="rounded-full"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <section
        aria-labelledby="receipts-heading"
        className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm sm:space-y-4 sm:p-5"
      >
        <div className="receiptshare-chrome flex items-center gap-2">
          <h2 id="receipts-heading" className="text-base font-semibold text-foreground sm:text-lg">
            Receipt Statuses
          </h2>
          {status === "success" && receipts.length > 0 && (
            <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs sm:text-sm">
              {receipts.length}
            </Badge>
          )}
        </div>

        {status === "loading" && (
          <div className="space-y-3 sm:space-y-4" data-testid="receiptshare-skeletons">
            {[0, 1, 2].map((index) => (
              <Card key={index} className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-full max-w-[75%] rounded-md" />
                    <Skeleton className="h-8 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-10 w-28 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="receiptshare-chrome flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm font-medium text-destructive">Failed to load receipt statuses</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn&apos;t fetch your receipt statuses. Check your connection and try again.
            </p>
            <Button variant="outline" size="sm" onClick={handleRetry} className="mt-3 rounded-full">
              Try Again
            </Button>
          </div>
        )}

        {(status === "success" || status === "empty") &&
          (receipts.length === 0 ? (
            <EmptyState
              icon={<CheckCircle className="h-12 w-12 text-muted-foreground" />}
              title="No receipts yet"
              description="Your claim settlement receipts will appear here."
            />
          ) : (
            <ul className="space-y-3 sm:space-y-4" aria-label="Receipt status list">
              {receipts.map((receipt) => (
                <li key={receipt.id}>
                  <Card className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                      <div className="min-w-0 flex-1 space-y-2">
                        <h3 className="text-sm font-semibold leading-6 text-foreground sm:text-base">
                          {receipt.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                          <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs font-semibold">
                            {receipt.amount} {receipt.tokenSymbol}
                          </Badge>
                          <Badge
                            variant={STATUS_VARIANTS[receipt.status]}
                            className="rounded-full px-2.5 py-1 text-xs font-semibold"
                          >
                            {STATUS_LABELS[receipt.status]}
                          </Badge>
                          <span>{new Date(receipt.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {receipt.txHash && (
                        <div className="font-mono text-xs text-muted-foreground">
                          {receipt.txHash}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          ))}
      </section>
    </div>
  );
}
