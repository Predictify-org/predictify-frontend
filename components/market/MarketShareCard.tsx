"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Timer } from "lucide-react";

export type MarketStatus = "active" | "resolved" | "tied" | "disputed";

interface MarketShareCardProps {
  status: MarketStatus;
  title: string;
  outcome?: string;
  probability?: number;
  volume?: string;
  timeLeft?: string;
  winner?: string;
  className?: string;
}

const MarketShareCard: React.FC<MarketShareCardProps> = ({
  status,
  title,
  outcome,
  probability,
  volume,
  timeLeft,
  winner,
  className,
}) => {
  return (
    <div
      className={cn(
        "relative flex flex-col justify-between w-[1200px] h-[630px] p-16 overflow-hidden select-none",
        "bg-[#0F0E1C] text-white font-sans",
        className
      )}
      id="market-share-card"
    >
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Header: Brand & Label */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-xl">
              P
            </div>
            <span className="text-h4 font-bold tracking-tight">Predictify</span>
          </div>
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-caption uppercase tracking-widest text-white/60">
              Prediction Market
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-[64px] leading-[1.1] font-bold text-white mb-12 max-w-[900px] text-balance">
            {title}
          </h1>

          {status === "active" && (
            <div className="flex items-center gap-16">
              <div className="flex flex-col gap-2">
                <span className="text-h5 text-white/50 uppercase tracking-wider">
                  Current Odds
                </span>
                <div className="flex items-baseline gap-4">
                  <span className="text-[96px] font-bold text-emerald-400 leading-none">
                    {probability}%
                  </span>
                  <span className="text-h2 font-semibold text-white/80">
                    {outcome}
                  </span>
                </div>
              </div>
              
              <div className="h-24 w-px bg-white/10" />

              <div className="flex flex-col gap-6">
                <div>
                  <span className="text-caption text-white/40 uppercase tracking-widest block mb-1">
                    Volume
                  </span>
                  <span className="text-stat-md text-white font-bold">{volume}</span>
                </div>
                <div className="flex items-center gap-2 text-amber-400">
                  <Timer className="w-5 h-5" />
                  <span className="text-h6 font-medium">Closes in {timeLeft}</span>
                </div>
              </div>
            </div>
          )}

          {status === "resolved" && (
            <div className="flex items-center gap-12">
              <div className="flex flex-col gap-4">
                <div className="px-6 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 w-fit">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <span className="text-h4 font-bold text-emerald-400 uppercase tracking-wide">
                    Resolved
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-h5 text-white/50 uppercase tracking-wider">
                    Winning Outcome
                  </span>
                  <span className="text-[80px] font-bold text-white leading-tight">
                    {winner}
                  </span>
                </div>
              </div>
              
              {volume && (
                <div className="mt-auto pb-4">
                  <span className="text-caption text-white/40 uppercase tracking-widest block mb-1">
                    Total Volume
                  </span>
                  <span className="text-stat-md text-white font-bold">{volume}</span>
                </div>
              )}
            </div>
          )}

          {status === "disputed" && (
            <div className="flex flex-col gap-6">
              <div className="px-6 py-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-4 w-fit">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <span className="text-h3 font-bold text-destructive uppercase tracking-widest">
                  Disputed
                </span>
              </div>
              <p className="text-h4 text-white/70 max-w-2xl">
                This market is currently under review by the moderation committee.
                Wait for the final resolution before claiming.
              </p>
            </div>
          )}

          {status === "tied" && (
            <div className="flex flex-col gap-6">
              <div className="px-6 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-4 w-fit">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500 flex items-center justify-center font-bold text-amber-500">
                  =
                </div>
                <span className="text-h3 font-bold text-amber-500 uppercase tracking-widest">
                  Tied
                </span>
              </div>
              <p className="text-h4 text-white/70 max-w-2xl">
                The outcome resulted in a tie. Stakes are being returned to
                participants according to platform rules.
              </p>
            </div>
          )}
        </div>

        {/* Footer: Safe Margins & Legal */}
        <div className="flex justify-between items-end border-t border-white/10 pt-8">
          <div className="flex flex-col gap-1">
            <span className="text-caption text-white/30 italic">
              * This is a prediction market. Probability based on user trades.
            </span>
            <span className="text-caption text-white/40">
              predictify.app
            </span>
          </div>
          <div className="text-right">
            <span className="text-caption text-white/30">
              Generated on {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      
      {/* Decorative safe margin guides (optional, hidden by default) */}
      <div className="absolute inset-8 border border-white/5 pointer-events-none opacity-20" />
    </div>
  );
};

export default MarketShareCard;
