"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Filter, Trophy, CircleDollarSign, Building2, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NoMatchEmptyState } from "@/components/events/NoMatchEmptyState";

// ── Types ──────────────────────────────────────────────────────────────────

type MarketCategory = "Football" | "Crypto" | "Politics" | "Other";
type MarketStatus = "open" | "closing_soon" | "closed";

interface Market {
  id: string;
  title: string;
  category: MarketCategory;
  probability: number;
  volume: string;
  participants: number;
  status: MarketStatus;
  timeLeft: string;
}

// ── Mock data — replace with real API call ────────────────────────────────

const MARKETS: Market[] = [
  {
    id: "fwc26-arg",
    title: "Will Argentina win the 2026 FIFA World Cup?",
    category: "Football",
    probability: 62,
    volume: "42,000 USDC",
    participants: 3840,
    status: "open",
    timeLeft: "18 days",
  },
  {
    id: "fwc26-bra",
    title: "Will Brazil reach the 2026 World Cup final?",
    category: "Football",
    probability: 48,
    volume: "28,500 USDC",
    participants: 2210,
    status: "open",
    timeLeft: "18 days",
  },
  {
    id: "btc-100k",
    title: "Will Bitcoin exceed $150k by end of 2026?",
    category: "Crypto",
    probability: 34,
    volume: "91,200 USDC",
    participants: 7640,
    status: "closing_soon",
    timeLeft: "2 days",
  },
  {
    id: "us-election",
    title: "Who wins the 2026 US midterm Senate majority?",
    category: "Politics",
    probability: 51,
    volume: "55,000 USDC",
    participants: 4420,
    status: "open",
    timeLeft: "30 days",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<MarketCategory, React.ReactNode> = {
  Football: <Trophy className="h-3 w-3" aria-hidden="true" />,
  Crypto: <CircleDollarSign className="h-3 w-3" aria-hidden="true" />,
  Politics: <Building2 className="h-3 w-3" aria-hidden="true" />,
  Other: <TrendingUp className="h-3 w-3" aria-hidden="true" />,
};

const CATEGORY_STYLES: Record<MarketCategory, string> = {
  Football: "bg-[#EBE7F6] text-[#4400FF] border-0",
  Crypto: "bg-[#FBF703] text-[#865503] border-0",
  Politics: "bg-[#E7F6EC] text-[#036B26] border-0",
  Other: "bg-gray-100 text-gray-700 border-0",
};

const STATUS_STYLES: Record<MarketStatus, string> = {
  open: "bg-emerald-100 text-emerald-700",
  closing_soon: "bg-amber-100 text-amber-700",
  closed: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<MarketStatus, string> = {
  open: "Open",
  closing_soon: "Closing soon",
  closed: "Closed",
};

// ── Market card ────────────────────────────────────────────────────────────

function MarketCard({ market }: { market: Market }) {
  return (
    <Link
      href={`/markets/${market.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-5 transition-all hover:border-[#540D8D]/60 hover:bg-card/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#540D8D]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug text-foreground group-hover:text-[#540D8D]">
          {market.title}
        </p>
        <Badge className={`shrink-0 text-xs ${STATUS_STYLES[market.status]}`}>
          {STATUS_LABELS[market.status]}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Badge className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 ${CATEGORY_STYLES[market.category]}`}>
          {CATEGORY_ICONS[market.category]}
          {market.category}
        </Badge>
        <span className="text-xs text-muted-foreground">{market.timeLeft} left</span>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <span className="font-semibold tabular-nums text-foreground">{market.probability}%</span> probability
        </span>
        <span>{market.volume} volume · {market.participants.toLocaleString()} participants</span>
      </div>

      {/* Probability bar */}
      <div
        role="progressbar"
        aria-valuenow={market.probability}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${market.probability}% probability`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-[#540D8D] transition-all"
          style={{ width: `${market.probability}%` }}
        />
      </div>
    </Link>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

const CATEGORIES = ["Football", "Crypto", "Politics", "Other"] as const;

export default function MarketsPage() {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");

  const filtered = React.useMemo(() => {
    return MARKETS.filter((m) => {
      const matchesSearch = m.title.toLowerCase().includes(search.trim().toLowerCase());
      const matchesCategory = category === "all" || m.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  const hasSearch = search.trim().length > 0;
  const hasCategory = category !== "all";

  const resetFilters = () => {
    setSearch("");
    setCategory("all");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[#540D8D]">Markets</h1>
        <p className="text-sm text-muted-foreground">
          Browse and predict on live markets — FWC26 campaign and more.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search markets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search markets"
          />
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px]" aria-label="Filter by category">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      ) : (
        <NoMatchEmptyState
          hasSearch={hasSearch}
          hasCategories={hasCategory}
          onClearFilters={resetFilters}
        />
      )}
    </div>
  );
}
