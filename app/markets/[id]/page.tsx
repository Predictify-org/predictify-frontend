import type { Metadata } from "next";
import MarketHero from "./hero";

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

function getMockMarket(id: string): MarketData {
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

export default async function MarketDetailPage({ params }: PageProps) {
  const { id } = await params;
  const market = getMockMarket(id);

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
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
      />

      {/*
       * Additional page content (bet form, tabs, timeline, etc.)
       * would follow here — outside the scope of this hero component.
       */}
    </main>
  );
}
