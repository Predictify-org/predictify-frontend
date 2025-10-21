"use client";

import { ArrowRight, TrendingUp, Globe, BarChart3, CheckCircle2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { sampleMarkets, winNotifications, type Market } from "@/content/markets.sample";
import { useState, useEffect } from "react";

interface MarketsWidgetProps {
  className?: string;
}

const iconMap = {
  TrendingUp,
  Globe,
  BarChart3,
};

const colorMap = {
  blue: {
    bg: "bg-blue-500/20",
    icon: "text-blue-400",
  },
  purple: {
    bg: "bg-purple-500/20",
    icon: "text-purple-400",
  },
  emerald: {
    bg: "bg-emerald-500/20",
    icon: "text-emerald-400",
  },
};

export function MarketsWidget({ className }: MarketsWidgetProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Win Notification Badge */}
      <div 
        className={`absolute right-0 -top-4 z-20 rounded-2xl bg-gradient-to-r from-[#4F46E533] to-[#9333EA] p-4 shadow-2xl ${
          reducedMotion ? '' : 'animate-fade-in'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white/20 p-2">
            <Coins className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">
            +{winNotifications[0].amount} {winNotifications[0].currency} Won!
          </span>
        </div>
      </div>

      {/* Markets Card */}
      <Card className="w-full max-w-md border-white/10 bg-gradient-to-b from-[#48097B] to-[#111827] p-6 backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Popular Prediction Markets</h2>
          <button className="text-sm text-purple-300 hover:text-purple-200 transition-colors">
            View All
          </button>
        </div>

        <div className="space-y-4">
          {sampleMarkets.map((market, index) => {
            const IconComponent = iconMap[market.icon as keyof typeof iconMap];
            const colors = colorMap[market.iconColor as keyof typeof colorMap];
            
            return (
              <MarketCard 
                key={market.id} 
                market={market} 
                IconComponent={IconComponent}
                colors={colors}
                index={index}
                reducedMotion={reducedMotion}
              />
            );
          })}

          {/* Place Prediction Button */}
          <Button className="w-full bg-[#4F46E5] py-6 text-white hover:bg-[#4F46E5]/90 transition-colors">
            Place Your Prediction
          </Button>
        </div>
      </Card>

      {/* Success Notification Badge */}
      <div 
        className={`absolute bottom-4 left-0 z-20 rounded-2xl bg-green-500 p-4 shadow-2xl ${
          reducedMotion ? '' : 'animate-fade-in'
        }`}
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-white" />
          <span className="font-semibold text-white">{winNotifications[1].message}</span>
        </div>
      </div>
    </div>
  );
}

interface MarketCardProps {
  market: Market;
  IconComponent: any;
  colors: { bg: string; icon: string };
  index: number;
  reducedMotion: boolean;
}

function MarketCard({ market, IconComponent, colors, index, reducedMotion }: MarketCardProps) {
  return (
    <Card 
      className={`border-white/10 bg-[#201F3780] p-4 backdrop-blur-sm transition-all duration-300 hover:bg-[#201F3780]/80 ${
        reducedMotion ? '' : 'animate-slide-up'
      }`}
      style={{ 
        animationDelay: reducedMotion ? '0ms' : `${index * 150}ms`,
        animationFillMode: 'both'
      }}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2 ${colors.bg}`}>
            <IconComponent className={`h-5 w-5 ${colors.icon}`} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{market.title}</h3>
            <p className="text-sm text-white/70">{market.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-green-400">Yes: {market.yesOdds}%</div>
          <div className="text-sm text-red-400">No: {market.noOdds}%</div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div 
          className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
          style={{ width: `${market.yesOdds}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-white/60">
        <span>Pool: {market.poolAmount.toLocaleString()} USDC</span>
        <span>Ends in {market.endsIn}</span>
      </div>
    </Card>
  );
}