"use client";

import React, { useState } from "react";
import {
  Info,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Scale,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContentWithFocusReturn,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OracleStatusBadge } from "@/components/oracle/OracleStatusBadge";

export interface AboutMarketModalProps {
  market: {
    id: string;
    title: string;
    description: string;
    status: string;
    category: string;
    isGrantFoxCampaign?: boolean;
    timeLeft?: string;
  };
  /**
   * When true, surfaces the live oracle freshness + fallback status panel.
   * Off by default so existing callers keep their current behavior.
   */
  showOracleStatus?: boolean;
}

export function AboutMarketModal({
  market,
  showOracleStatus = false,
}: AboutMarketModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // We customize the resolution criteria specifically for the FWC26 campaign
  const isFWC26 =
    market.isGrantFoxCampaign ||
    market.title.toLowerCase().includes("argentina") ||
    market.title.toLowerCase().includes("world cup");

  const oracleName = isFWC26 ? "FIFA Official Reports" : "Official Public Sources";
  const oracleUrl = isFWC26
    ? "https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canadamexicousa2026"
    : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all hover:bg-muted duration-200"
          aria-label="About this market"
        >
          <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span>About Market</span>
        </Button>
      </DialogTrigger>

      <DialogContentWithFocusReturn
        className="max-w-md w-[95vw] rounded-xl border border-border bg-card p-6 shadow-xl"
        aria-describedby="about-market-description"
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-h3-responsive font-bold tracking-tight text-foreground flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" aria-hidden="true" />
            About this market
          </DialogTitle>
          <DialogDescription id="about-market-description" className="text-body-sm text-muted-foreground">
            Learn about this market&apos;s resolution parameters, official sources, and dispute terms.
          </DialogDescription>
        </DialogHeader>

        <Separator className="bg-border" />

        {/* Scrollable details container */}
        <div className="space-y-5 py-2 text-left max-h-[60vh] overflow-y-auto pr-1">
          {/* Market title / question */}
          <div>
            <h3 className="text-caption font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Market Question
            </h3>
            <p className="text-body-md font-semibold text-foreground leading-snug">
              {market.title}
            </p>
          </div>

          {/* Quick specs strip */}
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-3 border border-border/50">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Oracle Source
              </span>
              {oracleUrl ? (
                <a
                  href={oracleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-body-sm font-medium text-primary hover:underline"
                  aria-label={`Official source: ${oracleName} (opens in a new tab)`}
                >
                  {oracleName}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : (
                <span className="text-body-sm font-medium text-foreground">
                  {oracleName}
                </span>
              )}
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Resolution Timeline
              </span>
              <span className="inline-flex items-center gap-1 text-body-sm font-medium text-foreground">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {isFWC26 ? "Dec 31, 2026" : market.timeLeft || "End of Event"}
              </span>
            </div>
          </div>

          {/* Live oracle freshness + fallback status (opt-in) */}
          {showOracleStatus && (
            <OracleStatusBadge marketId={market.id} />
          )}

          {/* Resolution rules card */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h4 className="text-body-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              Resolution Criteria
            </h4>

            {isFWC26 ? (
              <ul className="space-y-2.5 text-body-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <strong className="text-foreground">Yes:</strong> Argentina wins the final match and is officially crowned World Cup Champion.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <strong className="text-foreground">No:</strong> Argentina is eliminated at any stage, fails to qualify, or the tournament is cancelled.
                  </div>
                </li>
              </ul>
            ) : (
              <ul className="space-y-2.5 text-body-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <strong className="text-foreground">Yes:</strong> The specified event occurs as described before the resolution deadline.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <strong className="text-foreground">No:</strong> The specified event does not occur before the resolution deadline.
                  </div>
                </li>
              </ul>
            )}
          </div>

          {/* Dispute arbitration information */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
            <h4 className="text-body-sm font-bold text-foreground flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
              Disputes & Arbitration
            </h4>
            <p className="text-body-sm text-muted-foreground leading-relaxed">
              Upon reporting, a <span className="font-semibold text-foreground">24-hour dispute window</span> opens. If contested, decentralized platform validators will review blockchain oracle records to settle the outcome.
            </p>
          </div>
        </div>

        {/* Screen-reader specific markup for clean reading of resolution parameters */}
        <div className="sr-only" aria-live="polite">
          This market question is: {market.title}.
          The official source of resolution is {oracleName}.
          The resolution criteria are:
          Yes resolves if {isFWC26 ? "Argentina wins the final match and is crowned World Cup Champion" : "the specified event occurs as described"}.
          No resolves if {isFWC26 ? "Argentina is eliminated, fails to qualify, or the tournament is cancelled" : "the specified event does not occur"}.
          Disputes can be submitted during the 24-hour window after reporting.
        </div>
      </DialogContentWithFocusReturn>
    </Dialog>
  );
}

export default AboutMarketModal;
