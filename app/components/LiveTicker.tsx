"use client";

import React, { useEffect, useState } from "react";

interface TickerEvent {
  id: string;
  text: string;
  timestamp: string;
}

const mockEvents: TickerEvent[] = [
  { id: "1", text: "User 0x4F... placed 500 XLM on 'ETH > $4K'", timestamp: "1m ago" },
  { id: "2", text: "New Market created: US Elections 2028", timestamp: "3m ago" },
  { id: "3", text: "Market 'Super Bowl LIX' resolved to 'Chiefs'", timestamp: "5m ago" },
  { id: "4", text: "User 0xA1... claimed 1,200 XLM reward", timestamp: "12m ago" },
  { id: "5", text: "Dispute opened on 'SpaceX Mars Mission'", timestamp: "15m ago" },
  { id: "6", text: "User 0x9B... predicted Yes on 'Stellar Protocol 22'", timestamp: "18m ago" },
];

export function LiveTicker() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  if (prefersReducedMotion) {
    return (
      <div 
        className="w-full bg-primary/5 border-b border-primary/10 py-2 px-4 flex items-center justify-center overflow-hidden"
        role="region"
        aria-label="Recent Market Activity"
      >
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="font-semibold text-foreground">Live Activity:</span>
          <span>{mockEvents[0].text}</span>
          <span className="text-xs opacity-60 ml-1">({mockEvents[0].timestamp})</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full bg-primary/5 border-b border-primary/10 py-2 flex items-center overflow-hidden whitespace-nowrap relative"
      aria-hidden="true" 
      data-testid="live-ticker-marquee"
    >
      {/* Gradient edges for smooth fade out */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10"></div>
      
      <div className="flex animate-marquee hover:[animation-play-state:paused]">
        {mockEvents.map((event) => (
          <div key={event.id} className="flex items-center gap-2 text-sm text-muted-foreground pr-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span>{event.text}</span>
            <span className="text-xs opacity-60">{event.timestamp}</span>
          </div>
        ))}
      </div>
      <div className="flex animate-marquee hover:[animation-play-state:paused]" aria-hidden="true">
        {mockEvents.map((event) => (
          <div key={`dup-${event.id}`} className="flex items-center gap-2 text-sm text-muted-foreground pr-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span>{event.text}</span>
            <span className="text-xs opacity-60">{event.timestamp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
