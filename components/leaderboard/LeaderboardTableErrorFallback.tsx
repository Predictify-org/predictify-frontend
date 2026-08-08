"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Trophy } from "lucide-react";

interface LeaderboardTableErrorFallbackProps {
  error: Error;
  incidentId: string;
  resetErrorBoundary: () => void;
}

/**
 * Attractive error-boundary fallback for the LeaderboardTable.
 * Uses the same dark-slate palette as the table itself so the visual
 * transition is seamless when the error boundary catches a render error.
 */
export function LeaderboardTableErrorFallback({
  error,
  incidentId,
  resetErrorBoundary,
}: LeaderboardTableErrorFallbackProps) {
  return (
    <div className="w-full bg-slate-950/50 rounded-2xl border border-slate-800 overflow-hidden">
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        {/* Icon */}
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
          <Trophy className="h-8 w-8 text-amber-400/60" aria-hidden="true" />
        </div>

        {/* Heading */}
        <h2 className="mb-2 text-xl font-semibold text-slate-100">
          Leaderboard temporarily unavailable
        </h2>

        {/* Description */}
        <p className="mb-6 max-w-md text-sm text-slate-400">
          We couldn&apos;t load the leaderboard rankings. This is usually
          temporary — try again or check back later.
        </p>

        {/* Incident ID */}
        {process.env.NODE_ENV === "development" && (
          <div className="mb-6 rounded-lg bg-slate-800/50 px-4 py-2">
            <span className="text-xs font-mono text-slate-500">
              Incident: {incidentId}
            </span>
          </div>
        )}

        {/* Retry button */}
        <Button
          onClick={resetErrorBoundary}
          size="lg"
          className="gap-2 bg-cyan-600 text-white hover:bg-cyan-500"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry
        </Button>

        {/* Error detail (dev only) */}
        {process.env.NODE_ENV === "development" && (
          <details className="mt-6 w-full max-w-lg text-left">
            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-400">
              Error details
            </summary>
            <pre className="mt-2 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-red-400">
              {error.name}: {error.message}
              {"\n"}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}