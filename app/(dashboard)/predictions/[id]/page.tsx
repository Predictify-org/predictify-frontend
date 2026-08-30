import type { Metadata } from "next";
import { MOCK_PREDICTIONS } from "@/app/(dashboard)/mypredictions/page";
import PredictionCard from "@/components/PredictionCard";
import PredictionCommentsLoader from "@/app/components/PredictionCommentsLoader";
import { EmptyState } from "@/components/EmptyState";
import { SearchX } from "lucide-react";

/**
 * Prediction Detail Page — /dashboard/predictions/[id]
 *
 * Renders the full PredictionCard for a single prediction together with its
 * per-prediction comment thread.  Shares the mock data store with the
 * mypredictions list page; replace the mock lookup with a real data-fetch in
 * production.
 *
 * @see app/components/PredictionComments.tsx  – comment thread UI
 * @see app/(dashboard)/mypredictions/page.tsx – list page
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const prediction = MOCK_PREDICTIONS.find((p) => p.id === id);

  if (!prediction) {
    return { title: "Prediction Not Found | Predictify" };
  }

  return {
    title: `${prediction.title} | Predictify`,
    description: `View details and discussion for: ${prediction.description}.`,
  };
}

export default async function PredictionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const prediction = MOCK_PREDICTIONS.find((p) => p.id === id);

  if (!prediction) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div id="main-content" tabIndex={-1} className="outline-none" />
        <EmptyState
          title="Prediction Not Found"
          description="We couldn't find this prediction. It may have been removed or the link is incorrect."
          ctaText="My Predictions"
          ctaHref="/mypredictions"
          icon={SearchX}
        />
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Skip-to-content target */}
      <div id="main-content" tabIndex={-1} className="outline-none" />

      {/* Prediction card */}
      <section aria-label="Prediction details">
        <PredictionCard prediction={prediction} />
      </section>

      {/*
       * Per-prediction comment thread (GrantFox FWC26 — issue #342).
       * Loaded as a client component so it can read the connected wallet
       * address from WalletContext.
       */}
      <div className="mt-4">
        <PredictionCommentsLoader predictionId={prediction.id} />
      </div>
    </main>
  );
}
