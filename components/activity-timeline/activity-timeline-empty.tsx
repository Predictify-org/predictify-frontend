"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export type EmptyStateVariant = "predictions" | "disputes" | "payouts" | "system";

interface VariantConfig {
  illustration: string;
  headline: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

const EMPTY_STATE_VARIANTS = {
  predictions: {
    illustration: "/assets/empty-states/timeline/predictions.svg",
    headline: "No predictions yet",
    description: "Start predicting on events to see your activity here.",
    ctaLabel: "Start predicting",
    ctaHref: "/events",
  },
  disputes: {
    illustration: "/assets/empty-states/timeline/disputes.svg",
    headline: "No disputes filed",
    description: "File a dispute on resolved events to see your activity here.",
    ctaLabel: "View events",
    ctaHref: "/disputes",
  },
  payouts: {
    illustration: "/assets/empty-states/timeline/payouts.svg",
    headline: "No payouts recorded",
    description: "Claim your winnings to see payout activity here.",
    ctaLabel: "View finances",
    ctaHref: "/finances",
  },
  system: {
    illustration: "/assets/empty-states/timeline/system.svg",
    headline: "No activities yet",
    description: "Start making predictions and trading to see your activities here.",
    ctaLabel: "Get started",
    ctaHref: "/dashboard",
  },
} satisfies Record<EmptyStateVariant, VariantConfig>;

interface ActivityTimelineEmptyProps {
  className?: string;
  title?: string;
  description?: string;
  variant?: EmptyStateVariant;
}

/**
 * ActivityTimelineEmpty Component
 * Displayed when no activities are found
 */
export function ActivityTimelineEmpty({
  className,
  title,
  description,
  variant = "system",
}: ActivityTimelineEmptyProps) {
  const config = EMPTY_STATE_VARIANTS[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {/* Empty State Illustration */}
      <div className="w-24 h-24 sm:w-32 sm:h-32 mb-4 text-gray-400">
        <Image
          src={config.illustration}
          alt={config.headline}
          width={128}
          height={128}
          className="w-full h-full"
        />
      </div>

      {/* Empty State Text */}
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
        {title || config.headline}
      </h3>
      <p className="text-sm sm:text-base text-gray-600 max-w-sm">
        {description || config.description}
      </p>

      {/* Call to Action */}
      <Button asChild className="mt-6">
        <Link href={config.ctaHref}>{config.ctaLabel}</Link>
      </Button>
    </div>
  );
}

interface ActivityTimelineErrorProps {
  className?: string;
  error?: string;
  onRetry?: () => void;
}

/**
 * ActivityTimelineError Component
 * Displayed when activity fetching fails
 */
export function ActivityTimelineError({
  className,
  error,
  onRetry,
}: ActivityTimelineErrorProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center border border-red-200 rounded-lg bg-red-50",
        className
      )}
    >
      {/* Error Icon */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" />
      </div>

      {/* Error Text */}
      <h3 className="text-lg sm:text-xl font-semibold text-red-900 mb-2">
        Failed to Load Activities
      </h3>
      {error && (
        <p className="text-sm sm:text-base text-red-700 max-w-sm font-mono bg-red-100 px-3 py-2 rounded mb-4 text-left w-full overflow-auto">
          {error}
        </p>
      )}
      <p className="text-sm text-red-600 max-w-sm mb-6">
        There was a problem loading your activity timeline. Please try again.
      </p>

      {/* Retry Button */}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

interface ActivityTimelineLoadingProps {
  className?: string;
  message?: string;
}

/**
 * ActivityTimelineLoading Component
 * Displayed while activities are being fetched
 */
export function ActivityTimelineLoading({
  className,
  message = "Loading your activity timeline...",
}: ActivityTimelineLoadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4",
        className
      )}
    >
      {/* Loading Animation */}
      <div className="relative w-12 h-12 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 border-r-purple-600 animate-spin"></div>
      </div>

      {/* Loading Message */}
      <p className="text-gray-600 text-sm sm:text-base">{message}</p>
    </div>
  );
}
