import type { Metadata } from 'next';
import EventDetailsClient from "./EventDetailsClient";

/**
 * Market Detail Page - Server Component
 * 
 * Handles dynamic metadata generation for Open Graph and Twitter cards.
 * Renders the Client Component for interactive market logic.
 */

// In a real implementation, you would fetch this data from an API or DB
// For the current minimal workaround, we use the market data to populate OG tags
const EVENT_MOCK_DATA = {
  title: "Super Bowl Winner 2025",
  outcome: "Kansas City Chiefs",
  probability: "2.5",
  volume: "15,780 USDC",
  timeLeft: "Feb 9, 2025"
};

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://predictify.app';
  
  // Construct dynamic OG image URL
  const ogUrl = new URL(`${baseUrl}/api/og`);
  ogUrl.searchParams.set('title', EVENT_MOCK_DATA.title);
  ogUrl.searchParams.set('status', 'active');
  ogUrl.searchParams.set('outcome', EVENT_MOCK_DATA.outcome);
  ogUrl.searchParams.set('probability', EVENT_MOCK_DATA.probability);
  ogUrl.searchParams.set('volume', EVENT_MOCK_DATA.volume);
  ogUrl.searchParams.set('timeLeft', EVENT_MOCK_DATA.timeLeft);

  const ogImageUrl = ogUrl.toString();

  return {
    title: `${EVENT_MOCK_DATA.title} | Predictify`,
    description: `Join the prediction market for ${EVENT_MOCK_DATA.title}. Current odds: ${EVENT_MOCK_DATA.probability}x for ${EVENT_MOCK_DATA.outcome}.`,
    openGraph: {
      title: EVENT_MOCK_DATA.title,
      description: `Decentralized prediction market: ${EVENT_MOCK_DATA.title}`,
      url: baseUrl,
      siteName: 'Predictify',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Market preview for ${EVENT_MOCK_DATA.title}`,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: EVENT_MOCK_DATA.title,
      description: `Predict and earn on ${EVENT_MOCK_DATA.title}`,
      images: [ogImageUrl],
    },
  };
}

export default function EventDetailsPage() {
  return <EventDetailsClient />;
}
