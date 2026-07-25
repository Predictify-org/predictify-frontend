"use client";

import {
  CheckCircle2,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  sampleMarkets,
  winNotifications,
} from "@/content/markets.sample";
import { useState, useEffect } from "react";
import { MarketCard } from "@/app/components/MarketCard";

interface MarketsWidgetProps {
  className?: string;
}

export function MarketsWidget({ className }: MarketsWidgetProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Win Notification Badge */}
      <div
        className={`absolute right-0 -top-4 z-20 rounded-2xl bg-gradient-to-r from-[#4F46E533] to-[#9333EA] p-4 shadow-2xl ${
          reducedMotion ? "" : "animate-fade-in"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white/20 p-2">
            <Coins className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white tabular-nums">
            +{winNotifications[0].amount} {winNotifications[0].currency} Won!
          </span>
        </div>
      </div>

      {/* Markets Card */}
      <Card className="w-full max-w-md border-white/10 bg-gradient-to-b from-[#48097B] to-[#111827] p-6 backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Popular Prediction Markets
          </h2>
          <button className="text-sm text-purple-300 hover:text-purple-200 transition-colors">
            View All
          </button>
        </div>

        <div className="space-y-4">
          {sampleMarkets.map((market, index) => (
            <MarketCard
              key={market.id}
              market={market}
              index={index}
              reducedMotion={reducedMotion}
            />
          ))}

          {/* Place Prediction Button */}
          <Button className="w-full bg-[#4F46E5] py-6 text-white hover:bg-[#4F46E5]/90 transition-colors">
            Place Your Prediction
          </Button>
        </div>
      </Card>

      {/* Success Notification Badge */}
      <div
        className={`absolute bottom-4 left-0 z-20 rounded-2xl bg-green-500 p-4 shadow-2xl ${
          reducedMotion ? "" : "animate-fade-in"
        }`}
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-white" />
          <span className="font-semibold text-white">
            {winNotifications[1].message}
          </span>
        </div>
      </div>
    </div>
  );
}


