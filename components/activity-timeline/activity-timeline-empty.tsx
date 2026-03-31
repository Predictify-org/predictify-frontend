"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertCircle, Archive, RefreshCw } from "lucide-react";

interface ActivityTimelineEmptyProps {
  className?: string;
  title?: string;
  description?: string;
}

/**
 * ActivityTimelineEmpty Component
 * Displayed when no activities are found
 */
export function ActivityTimelineEmpty({
  className,
  title = "No Activities Yet",
  description,
}: ActivityTimelineEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {/* Empty State Icon */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Archive className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
      </div>

      {/* Empty State Text */}
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-gray-600 max-w-sm">
        {description ||
          "Your activity timeline is empty. Start making predictions and trading to see your activities here."}
      </p>

      {/* Call to Action */}
      <Button className="mt-6" variant="default">
        Get Started
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
