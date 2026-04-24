'use client';

import { ModerationBanner } from '@/components/moderation/ModerationBanner';
import { MarketStatusBadge } from '@/components/moderation/MarketStatusBadge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ModerationState } from '@/types/moderation';

const STATES: ModerationState[] = ['under_review', 'paused', 'restricted', 'flagged', 'removed'];

// Simulated market list card
function MockMarketCard({ title, category, state }: { title: string; category: string; state?: ModerationState }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm leading-tight truncate">{title}</span>
            {state && <MarketStatusBadge state={state} />}
          </div>
          <Badge className="bg-[#EBE7F6] text-[#4400FF] border-0 text-xs">{category}</Badge>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted-foreground">Odds</div>
          <div className="font-bold text-sm">1.85</div>
        </div>
      </div>
      <div className="w-full bg-muted/50 rounded-full h-1.5">
        <div className="h-full rounded-full bg-primary/60 w-[62%]" />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>1,240 participants</span>
        <span>3d 14h remaining</span>
      </div>
    </div>
  );
}

export default function ModerationDemoPage() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-12">
      <div>
        <h1 className="text-h3 font-bold mb-1">Moderation Banners</h1>
        <p className="text-muted-foreground text-sm">
          Design system reference for market moderation states — banners (detail page) and badges (list cards).
        </p>
      </div>

      {/* ── Detail page banners ── */}
      <section className="space-y-4">
        <h2 className="text-h5 font-semibold">Detail Page Banners</h2>
        <p className="text-sm text-muted-foreground">
          Placed at the top of a market detail page, above the trading interface.
        </p>
        <div className="space-y-3">
          {STATES.map((state) => (
            <ModerationBanner key={state} state={state} />
          ))}
        </div>
      </section>

      {/* ── List card badges ── */}
      <section className="space-y-4">
        <h2 className="text-h5 font-semibold">Market List Card Badges</h2>
        <p className="text-sm text-muted-foreground">
          Compact inline badges shown on market list cards. Hover for tooltip.
        </p>
        <div className="flex flex-wrap gap-3">
          {STATES.map((state) => (
            <MarketStatusBadge key={state} state={state} />
          ))}
        </div>
      </section>

      {/* ── Market cards with badges ── */}
      <section className="space-y-4">
        <h2 className="text-h5 font-semibold">Market Cards — In Context</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <MockMarketCard title="Will BTC reach $100k by Q3?" category="Crypto" />
          <MockMarketCard title="Champions League Final Winner" category="Football" state="under_review" />
          <MockMarketCard title="US Election 2026 Senate Majority" category="Politics" state="paused" />
          <MockMarketCard title="AAPL Q2 Earnings Beat?" category="Stocks" state="restricted" />
        </div>
      </section>
    </div>
  );
}
