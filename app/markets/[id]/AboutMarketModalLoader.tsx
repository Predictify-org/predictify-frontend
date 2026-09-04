"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";
import type { AboutMarketModalProps } from "@/app/components/AboutMarketModal";

export const AboutMarketModal = dynamic<AboutMarketModalProps>(
  () => import("@/app/components/AboutMarketModal").then((mod) => mod.AboutMarketModal),
  {
    ssr: false,
    loading: () => (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="h-10 gap-2 px-4 opacity-80"
        aria-label="Loading market details"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
        <span>About Market</span>
      </Button>
    ),
  }
);

export const PredictionCommentsLoader = dynamic<{ predictionId: string }>(
  () => import("@/app/components/PredictionCommentsLoader").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-5/6 rounded-md" />
        </div>
      </div>
    ),
  }
);

export const MarketDetailClient = dynamic<{ marketTitle: string; marketId: string }>(
  () => import("./MarketDetailClient").then((mod) => mod.MarketDetailClient),
  {
    ssr: false,
    loading: () => null,
  }
);

export default AboutMarketModal;
