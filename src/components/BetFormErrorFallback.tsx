"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface BetFormErrorFallbackProps {
  error: Error;
  incidentId: string | null;
  resetErrorBoundary: () => void;
}

/**
 * BetForm error-boundary fallback UI.
 *
 * Renders an attractive, card-styled fallback with a retry action when BetForm
 * throws during render. Respects design tokens and dark mode, and exposes the
 * incident id + error message for transparency without leaking stack traces.
 */
export function BetFormErrorFallback({
  error,
  incidentId,
  resetErrorBoundary,
}: BetFormErrorFallbackProps) {
  return (
    <div className="mx-auto max-w-md p-4 sm:p-6 lg:p-8">
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm">
        <div className="flex flex-col items-center p-8 text-center">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 dark:bg-destructive/20"
            role="img"
            aria-label="Error"
          >
            <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
          </div>

          <h2 className="mb-2 text-lg font-semibold text-foreground">
            We couldn't load the bet form
          </h2>
          <p className="mb-5 max-w-sm text-sm text-muted-foreground">
            An unexpected error occurred while rendering the bet form. Please try again.
          </p>

          {incidentId && (
            <p className="mb-4 rounded-md bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
              Incident ID: {incidentId}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={resetErrorBoundary} size="lg" className="gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          </div>

          {error?.message && (
            <p className="mt-5 hidden text-xs text-muted-foreground" data-testid="bet-form-error-msg">
              {error.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}