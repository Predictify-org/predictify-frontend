"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEmptyStateProps {
  className?: string;
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function LeaderboardEmptyState({
  className,
  title = "No Rankings Yet",
  description = "The leaderboard is empty. Be the first predictor to start earning and claim the top spot.",
  onRetry,
}: LeaderboardEmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className
      )}
    >
      <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-6 text-slate-500">
        <Image
          src="/assets/empty-states/dashboard/leaderboard.svg"
          alt={title}
          width={128}
          height={128}
          className="w-full h-full object-contain"
        />
      </div>

      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-slate-400 max-w-md mb-6">
        {description}
      </p>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="gap-2 border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-400"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      )}
    </div>
  );
}

interface LeaderboardErrorStateProps {
  className?: string;
  error?: string;
  onRetry?: () => void;
}

export function LeaderboardErrorState({
  className,
  error,
  onRetry,
}: LeaderboardErrorStateProps) {
  const displayError =
    error && !error.toLowerCase().includes("token") &&
    !error.toLowerCase().includes("secret") &&
    !error.toLowerCase().includes("password") &&
    !error.toLowerCase().includes("key")
      ? error
      : "Unable to load leaderboard data. Please try again later.";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center border border-red-500/30 rounded-2xl bg-red-950/20",
        className
      )}
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-400" />
      </div>

      <h3 className="text-lg sm:text-xl font-semibold text-red-100 mb-2">
        Failed to Load Leaderboard
      </h3>
      <p className="text-sm sm:text-base text-red-300 max-w-sm mb-6">
        {displayError}
      </p>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="gap-2 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

interface LeaderboardLoadingStateProps {
  className?: string;
  message?: string;
}

export function LeaderboardLoadingState({
  className,
  message = "Loading leaderboard...",
}: LeaderboardLoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4",
        className
      )}
    >
      <div className="relative w-12 h-12 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-cyan-400 animate-spin" />
      </div>

      <p className="text-slate-400 text-sm sm:text-base">{message}</p>
    </div>
  );
}

interface LeaderboardSkeletonProps {
  className?: string;
  rows?: number;
}

export function LeaderboardSkeleton({ className, rows = 8 }: LeaderboardSkeletonProps) {
  return (
    <div className={cn("w-full space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40"
        >
          <div className="w-8 h-4 rounded bg-slate-800 animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-slate-800 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-slate-800 animate-pulse" />
            <div className="h-3 w-20 rounded bg-slate-800 animate-pulse" />
          </div>
          <div className="w-16 h-4 rounded bg-slate-800 animate-pulse hidden sm:block" />
          <div className="w-16 h-4 rounded bg-slate-800 animate-pulse hidden sm:block" />
          <div className="w-16 h-4 rounded bg-slate-800 animate-pulse hidden sm:block" />
        </div>
      ))}
    </div>
  );
}
