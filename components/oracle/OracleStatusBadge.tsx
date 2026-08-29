"use client";

/**
 * OracleStatusBadge
 *
 * User-visible surfacing of oracle freshness and fallback status. It wraps
 * `useOracleStatus` and renders every required state (loading, error, retry,
 * stale, permission) with accessible labels and a color-blind-safe combination
 * of icon + text + color. The previous data stays on screen during reloads.
 */

import React, { useId } from "react";
import { AlertTriangle, Loader2, Lock, RefreshCw, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatOracleRelativeTime,
  ORACLE_PROVIDER_LABELS,
} from "@/lib/oracle-status";
import { useOracleStatus } from "@/hooks/useOracleStatus";
import type {
  OracleFreshnessOptions,
  OracleProviderId,
} from "@/types/oracle-status";

export interface OracleStatusBadgeProps {
  marketId?: string;
  fetcher?: (
    marketId: string,
    options: { signal?: AbortSignal },
  ) => Promise<
    import("@/types/oracle-status").OracleAttemptResult[]
  >;
  enabled?: boolean;
  freshnessOptions?: OracleFreshnessOptions;
  /** Injectable clock for deterministic previews/tests. */
  now?: () => number;
  className?: string;
}

function FreshnessBadge({
  freshness,
  provider,
}: {
  freshness: string;
  provider: OracleProviderId | null;
}) {
  if (freshness === "fresh") {
    return (
      <Badge variant="success" size="sm" className="gap-1">
        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
        Fresh
      </Badge>
    );
  }
  if (freshness === "stale") {
    return (
      <Badge variant="warning" size="sm" className="gap-1">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        Stale
      </Badge>
    );
  }
  return (
    <Badge variant="neutral" size="sm" className="gap-1">
      Unknown
    </Badge>
  );
}

export function OracleStatusBadge({
  marketId,
  fetcher,
  enabled = true,
  freshnessOptions,
  now,
  className,
}: OracleStatusBadgeProps) {
  const describedById = useId();
  const {
    phase,
    status,
    lastUpdatedAt,
    freshness,
    isFallback,
    retryable,
    retry,
    error,
  } = useOracleStatus({ marketId, fetcher, enabled, freshnessOptions, now });

  const clockNow = now ? now() : Date.now();
  const relative = formatOracleRelativeTime(lastUpdatedAt, clockNow);
  const providerLabel = status?.provider
    ? ORACLE_PROVIDER_LABELS[status.provider]
    : null;
  const fallback = status?.fallback ?? null;

  let announcement = "Checking oracle status.";
  if (phase === "success") {
    const source =
      freshness === "fresh"
        ? "fresh"
        : freshness === "stale"
          ? "stale"
          : "unknown";
    announcement = `Oracle status ${source}.${
      providerLabel ? ` Source ${providerLabel}.` : ""
    }${isFallback ? " Resolved using a fallback oracle." : ""}`;
  } else if (phase === "error") {
    announcement = `Oracle status unavailable.${
      retryable ? " Retry is available." : ""
    }`;
  } else if (phase === "permission_denied") {
    announcement = "Oracle status is restricted.";
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={phase === "loading"}
      aria-describedby={describedById}
      className={cn(
        "rounded-lg border border-border bg-muted/30 p-3 space-y-2",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Oracle Status
        </span>
        <FreshnessBadge freshness={freshness} provider={status?.provider ?? null} />
      </div>

      {phase === "loading" && (
        <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Checking oracle freshness…</span>
        </div>
      )}

      {phase === "permission_denied" && (
        <div className="flex items-start gap-2 text-body-sm text-muted-foreground">
          <Lock className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Oracle freshness and fallback details are restricted for this market.
          </span>
        </div>
      )}

      {phase === "error" && (
        <div className="space-y-2">
          <p className="text-body-sm text-muted-foreground">
            {error?.kind === "not_found"
              ? "Oracle status is not available for this market."
              : "Could not load oracle status."}
          </p>
          {retryable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={retry}
              aria-label="Retry loading oracle status"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </Button>
          )}
        </div>
      )}

      {phase === "success" && (
        <div className="space-y-1 text-body-sm text-muted-foreground">
          <p>
            {providerLabel ? (
              <span className="font-medium text-foreground">{providerLabel}</span>
            ) : (
              <span className="font-medium text-foreground">No oracle confirmation</span>
            )}{" "}
            {lastUpdatedAt ? (
              <span>· updated {relative}</span>
            ) : (
              <span>· no timestamp recorded</span>
            )}
          </p>
          {fallback?.usedFallback && (
            <p className="flex items-start gap-1.5 text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Primary oracle ({ORACLE_PROVIDER_LABELS[fallback.primaryProvider]}) failed;
                resolved via {ORACLE_PROVIDER_LABELS[fallback.resolvedProvider]} after{" "}
                {fallback.totalAttempts} attempt
                {fallback.totalAttempts === 1 ? "" : "s"}.
              </span>
            </p>
          )}
          {fallback && !fallback.usedFallback && (
            <p className="text-[11px] text-muted-foreground/80">
              Resolved on the primary oracle ({ORACLE_PROVIDER_LABELS[fallback.primaryProvider]}).
            </p>
          )}
        </div>
      )}

      <span id={describedById} className="sr-only">
        {announcement}
      </span>
    </div>
  );
}

export default OracleStatusBadge;
