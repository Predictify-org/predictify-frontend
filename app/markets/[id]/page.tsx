import type { Metadata } from "next";
import MarketHero from "./hero";
import { Tabs } from "@/app/components/Tabs";
import {
  AboutMarketModal,
  PredictionCommentsLoader,
  MarketDetailClient,
} from "./AboutMarketModalLoader";

/**
 * Market Detail Page — Server Component
 *
 * Route: /markets/[id]
 *
 * Responsibilities:
 *  1. Generate per-market Open Graph / Twitter metadata (SEO).
 *  2. Render the MarketHero component with data fetched server-side.
 *
 * In production you would replace the mock below with a real data fetch:
 *  ```ts
 *  const market = await fetchMarket(params.id);
 *  ```
 *
 * @see app/markets/[id]/hero.tsx  — the hero component
 * @see docs/MARKET_HERO.md        — component API and design decisions
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Minimal mock — replace with real data fetching
// ---------------------------------------------------------------------------
interface MarketData {
  id: string;
  title: string;
  description: string;
  status: "open" | "closing_soon" | "closed" | "resolved" | "cancelled";
  category: string;
  volume: string;
  participants: number;
  timeLeft: string;
  probability: number;
  isGrantFoxCampaign: boolean;
}

function getMockMarket(id: string): MarketData | null {
  if (id === "not-found" || id === "404" || id === "empty" || id === "invalid") {
    return null;
  }
  return {
    id,
    title: "Will Argentina win the 2026 FIFA World Cup?",
    description:
      "Predict whether Argentina, the reigning World Cup champions, will successfully defend their title at the 2026 FIFA World Cup hosted across the USA, Canada, and Mexico.",
    status: "open",
    category: "Football",
    volume: "42,000 USDC",
    participants: 3840,
    timeLeft: "18 days",
    probability: 62,
    isGrantFoxCampaign: true,
  };
}

// ---------------------------------------------------------------------------
// generateMetadata — per-market OG tags
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const market = getMockMarket(id);
  
  if (!market) {
    return {
      title: "Market Not Found | Predictify",
      description: "The requested prediction market could not be found.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://predictify.app";

  // Construct dynamic OG image URL
  const ogUrl = new URL(`${baseUrl}/api/og`);
  ogUrl.searchParams.set("title", market.title);
  ogUrl.searchParams.set("status", market.status);
  ogUrl.searchParams.set("probability", String(market.probability));
  ogUrl.searchParams.set("volume", market.volume);
  ogUrl.searchParams.set("timeLeft", market.timeLeft);

  return {
    title: `${market.title} | Predictify`,
    description: `Join the prediction market: ${market.title}. Volume: ${market.volume} · ${market.participants.toLocaleString()} participants.`,
    openGraph: {
      title: market.title,
      description: `Decentralized prediction market — ${market.category}`,
      url: `${baseUrl}/markets/${id}`,
      siteName: "Predictify",
      images: [
        {
          url: ogUrl.toString(),
          width: 1200,
          height: 630,
          alt: `Market preview: ${market.title}`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: market.title,
      description: `Predict and earn on ${market.title}`,
      images: [ogUrl.toString()],
    },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

import { EmptyState } from "@/components/EmptyState";
import { SearchX } from "lucide-react";

export default async function MarketDetailPage({ params }: PageProps) {
  const { id } = await params;
  const market = getMockMarket(id);

  if (!market) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div id="main-content" tabIndex={-1} className="outline-none" />
        <EmptyState
          title="Market Not Found"
          description="We couldn't find the prediction market you're looking for. It may have been resolved, cancelled, or never existed. Try browsing our active markets or create your own."
          ctaText="Browse Markets"
          ctaHref="/events"
          icon={SearchX}
        />
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Skip-to-content target */}
      <div id="main-content" tabIndex={-1} className="outline-none" />

      <MarketHero
        title={market.title}
        description={market.description}
        status={market.status}
        category={market.category}
        volume={market.volume}
        participants={market.participants}
        timeLeft={market.timeLeft}
        outcomes={[
          { label: "Yes", probability: market.probability },
          { label: "No", probability: 100 - market.probability },
        ]}
        isGrantFoxCampaign={market.isGrantFoxCampaign}
        aboutModalTrigger={
          <AboutMarketModal market={market} showOracleStatus />
        }
      />

      {/*
       * Market detail tabs — roving-tabindex primitive (GrantFox FWC26).
       *
       * Uses app/components/Tabs rather than the Radix-backed shadcn tabs so
       * that keyboard focus management is fully explicit and auditable.
       *
       * Tab panel content is intentionally left as descriptive placeholders
       * here; real panels (BetForm, ActivityTimeline, etc.) are wired in
       * follow-up tasks once the primitive is approved.
       */}
      <section aria-label="Market detail sections" className="mt-6 sm:mt-8">
        <Tabs
          aria-label="Market detail sections"
          defaultValue="overview"
          tabs={[
            {
              value: "overview",
              label: "Overview",
              content: (
                <div className="text-sm text-muted-foreground">
                  <p>
                    Market overview, probability breakdown, and resolution
                    criteria will be displayed here.
                  </p>
                </div>
              ),
            },
            {
              value: "activity",
              label: "Activity",
              content: (
                <div className="text-sm text-muted-foreground">
                  <p>
                    Recent bets and participant activity for this market will
                    appear here.
                  </p>
                </div>
              ),
            },
            {
              value: "resolution",
              label: "Resolution",
              content: (
                <div className="text-sm text-muted-foreground">
                  <p>
                    Resolution criteria, oracle sources, and outcome verification
                    details will be displayed here.
                  </p>
                </div>
              ),
            },
            {
              value: "timeline",
              label: "Timeline",
              content: (
                <div className="text-sm text-muted-foreground">
                  <p>
                    The full market lifecycle timeline — from creation through
                    resolution — will be shown here.
                  </p>
                </div>
              ),
            },
          ]}
        />
      </section>

      {/*
       * Keyboard shortcut hints + listeners (client component).
       * Rendered below the tabs so it doesn't interrupt the reading flow.
       * Hidden on touch devices and narrow viewports automatically.
       */}
      {/*
       * Per-prediction comment thread mini-UI (GrantFox FWC26 — issue #342).
       * Collapsible section below the tabs; keeps the core market hero/tabs
       * uncluttered while still surfacing community discussion.
       */}
      <div className="mt-6">
        <PredictionCommentsLoader predictionId={market.id} />
      </div>

      <MarketDetailClient
        marketTitle={market.title}
        marketId={market.id}
      />
    </main>
  );
}
