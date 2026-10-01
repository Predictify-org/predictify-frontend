"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { useGlobalLiveRegion } from "@/hooks/use-global-live-region";

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

const CATEGORIES = ["Football", "Crypto", "Politics", "Other"] as const;
const ALL_CATEGORIES = "all";

/** One URL write per pause in typing, not one per keystroke. */
const SEARCH_DEBOUNCE_MS = 300;

function isKnownCategory(value: string): value is MarketCategory {
  return (CATEGORIES as readonly string[]).includes(value);
}

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

function MarketsPageFallback() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[#540D8D]">Markets</h1>
        <p className="text-sm text-muted-foreground">
          Browse and predict on live markets — FWC26 campaign and more.
        </p>
      </div>
    </div>
  );
}

/**
 * `useSearchParams()` opts this route into client-side rendering, so the
 * filters live behind a Suspense boundary and the shell can still prerender.
 */
export default function MarketsPage() {
  return (
    <React.Suspense fallback={<MarketsPageFallback />}>
      <MarketsPageContent />
    </React.Suspense>
  );
}

function MarketsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { announce } = useGlobalLiveRegion();

  // Hydrate both controls from the URL so /markets?q=argentina&category=Football
  // is shareable, bookmarkable and restores the filtered view on reload. An
  // unknown category value falls back to "all" instead of filtering to nothing.
  const urlSearch = searchParams.get("q") ?? "";
  const urlCategoryParam = searchParams.get("category") ?? ALL_CATEGORIES;
  const urlCategory = isKnownCategory(urlCategoryParam) ? urlCategoryParam : ALL_CATEGORIES;

  const [search, setSearch] = React.useState(urlSearch);
  const [category, setCategory] = React.useState(urlCategory);
  const [debouncedSearch, setDebouncedSearch] = React.useState(urlSearch);

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [search]);

  const buildUrl = React.useCallback(
    (nextSearch: string, nextCategory: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = nextSearch.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      if (nextCategory !== ALL_CATEGORIES) params.set("category", nextCategory);
      else params.delete("category");
      const query = params.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams],
  );

  const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  // `router.replace` (not `push`) keeps the whole filter session on a single
  // history entry: Back returns to whatever preceded the markets page instead
  // of replaying each keystroke.
  React.useEffect(() => {
    const next = buildUrl(debouncedSearch, category);
    if (next !== currentUrl) router.replace(next, { scroll: false });
  }, [buildUrl, category, currentUrl, debouncedSearch, router]);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return MARKETS.filter((m) => {
      const matchesSearch = m.title.toLowerCase().includes(needle);
      const matchesCategory = category === ALL_CATEGORIES || m.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  const lastAnnouncedCount = React.useRef<number | null>(null);

  // WCAG 4.1.3: tell screen-reader users how many markets match after each
  // change. Deduplicated on the count itself, so typing that does not change
  // the result set stays silent and never spams the live region.
  React.useEffect(() => {
    const count = filtered.length;
    if (lastAnnouncedCount.current === null) {
      // The initial render is not a change; leave the live region quiet.
      lastAnnouncedCount.current = count;
      return;
    }
    if (lastAnnouncedCount.current === count) return;
    lastAnnouncedCount.current = count;
    announce({
      message: `${count} ${count === 1 ? "market" : "markets"} found`,
      priority: "polite",
    });
  }, [filtered.length, announce]);

  const hasSearch = search.trim().length > 0;
  const hasCategory = category !== ALL_CATEGORIES;

  const resetFilters = () => {
    setSearch("");
    setCategory(ALL_CATEGORIES);
    setDebouncedSearch("");
    // Clear the query string immediately rather than waiting out the debounce.
    if (searchParams.toString()) router.replace(pathname, { scroll: false });
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
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
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
