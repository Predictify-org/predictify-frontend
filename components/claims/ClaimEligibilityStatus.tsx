"use client";

/**
 * ClaimEligibilityStatus
 *
 * Displays whether the connected user is eligible to claim winnings for a market
 * based on authoritative evidence. It models every required state explicitly:
 *
 *  - loading       -- accessible skeleton + screen-reader announcement; the
 *                    previous (last-good) result is preserved while reloading so
 *                    the user never loses data they were viewing.
 *  - success       - a colour-blind-safe badge (pattern + text) describing the
 *                    decision, plus a stale-evidence warning when applicable.
 *  - error         - an actionable alert with a Retry button when retryable.
 *  - permission    - a non-retryable alert prompting the user to connect a
 *                    wallet (the authorization / permission state).
 *  - not_found     - a neutral "unavailable" empty state.
 *
 * WCAG 2.1 AA:
 *  - role="status" + aria-live="polite" for dynamic updates.
 *  - Status conveyed by pattern AND text (SC 1.4.1).
 *  - Keyboard-focusable Retry control with a visible focus ring.
 */

import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, HelpCircle, Loader2, Lock, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useClaimEligibility } from "@/hooks/useClaimEligibility";
import { formatClaimEligibilityRelativeTime } from "@/lib/claim-eligibility";
import type {
  ClaimEligibilityClientError,
} from "@/lib/claim-eligibility-client";
import type {
  ClaimEligibilityDecision,
  ClaimEvidence,
} from "@/types/claim-eligibility";
import { cn } from "@/lib/utils";

// Imported CSSProperties for inline patterns that guarantee non-color distinction.
import type { CSSProperties } from "react";

export interface ClaimEligibilityStatusProps {
  marketId: string;
  account?: string;
  /** Injectable fetcher; defaults to the production `fetchClaimEligibility`. */
  fetcher?: (
    marketId: string,
    options: { account?: string; signal?: AbortSignal },
  ) => Promise<ClaimEvidence>;
  reducedMotion?: boolean;
  className?: string;
}

interface DecisionStyle {
  label: string;
  /** Tailwind classes for the badge (colour + pattern overlay). */
  badgeClass: string;
  tone: "positive" | "neutral" | "warning" | "destructive";
}

const DECISION_STYLES: Record<ClaimEligibilityDecision, DecisionStyle> = {
  eligible: {
    label: "Eligible to claim",
    badgeClass: "bg-chart-2 text-white pattern-diagonal",
    tone: "positive",
  },
  already_claimed: {
    label: "Already claimed",
    badgeClass: "bg-muted text-muted-foreground pattern-crosshatch",
    tone: "neutral",
  },
  pending: {
    label: "Pending settlement",
    badgeClass: "bg-chart-3 text-white pattern-horizontal",
    tone: "neutral",
  },
  disputed: {
    label: "Under dispute",
    badgeClass: "bg-destructive/20 text-destructive pattern-vertical",
    tone: "destructive",
  },
  ineligible_wrong_outcome: {
    label: "Not eligible",
    badgeClass: "bg-muted text-muted-foreground pattern-crosshatch",
    tone: "neutral",
  },
  ineligible_unresolved: {
    label: "Outcome pending",
    badgeClass: "bg-muted text-muted-foreground pattern-horizontal",
    tone: "neutral",
  },
  unknown: {
    label: "Eligibility unknown",
    badgeClass: "bg-muted text-muted-foreground pattern-crosshatch",
    tone: "warning",
  },
};

const DECISION_ICONS: Record<ClaimEligibilityDecision, LucideIcon> = {
  eligible: CheckCircle2,
  already_claimed: ShieldCheck,
  pending: Clock,
  disputed: AlertTriangle,
  ineligible_wrong_outcome: XCircle,
  ineligible_unresolved: Clock,
  unknown: HelpCircle,
};

// Inline background patterns ensure the visual distinction is not dependent on
// external CSS (SC 1.4.1). Each pattern uses a subtle, high-contrast stripe/
// geometry that is visible on the decision-specific background class.
const DECISION_PATTERNS: Record<ClaimEligibilityDecision, CSSProperties> = {
  eligible: {
    backgroundImage:
      "repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0, rgba(255,255,255,0.18) 6px, transparent 6px, transparent 12px)",
  },
  already_claimed: {
    backgroundImage:
      "repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 4px, transparent 4px, transparent 8px)",
  },
  pending: {
    backgroundImage:
      "repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 4px, transparent 4px, transparent 8px)",
  },
  disputed: {
    backgroundImage:
      "repeating-linear-gradient(90deg, rgba(0,0,0,0.12) 0, rgba(0,0,0,0.12) 6px, transparent 6px, transparent 12px)",
  },
  ineligible_wrong_outcome: {
    backgroundImage:
      "repeating-linear-gradient(45deg, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 4px, transparent 4px, transparent 8px)",
  },
  ineligible_unresolved: {
    backgroundImage:
      "repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 4px, transparent 4px, transparent 8px)",
  },
  unknown: {
    backgroundImage:
      "repeating-linear-gradient(135deg, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 4px, transparent 4px, transparent 8px)",
  },
};

function EligibilityBadge({
  decision,
}: {
  decision: ClaimEligibilityDecision;
}) {
  const style = DECISION_STYLES[decision];
  const Icon = DECISION_ICONS[decision];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        style.badgeClass,
      )}
      style={DECISION_PATTERNS[decision]}
    >
      <Icon className="relative z-10 h-3.5 w-3.5" aria-hidden={true} />
      <span className="relative z-10">{style.label}</span>
    </span>
  );
}

function ErrorAlert({
  error,
  onRetry,
}: {
  error: ClaimEligibilityClientError;
  onRetry: () => void;
}) {
  const isNotFound = error.kind === "not_found";
  const isPermission = error.kind === "permission";
  const canRetry = error.retryable || error.kind === "unknown";

  if (isPermission) {
    return (
      <Alert className="border-amber-500/40 bg-amber-500/10">
        <Lock className="h-4 w-4" aria-hidden={true} />
        <AlertTitle>Authorization required</AlertTitle>
        <AlertDescription>
          Connect your wallet to view claim eligibility for this market.
        </AlertDescription>
      </Alert>
    );
  }

  if (isNotFound) {
    return (
      <Alert className="border-border/60 bg-card/60">
        <AlertCircle className="h-4 w-4" aria-hidden={true} />
        <AlertTitle>Eligibility unavailable</AlertTitle>
        <AlertDescription>
          Authoritative claim evidence is not available for this market.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" aria-hidden={true} />
      <AlertTitle>Couldn&#39;t load eligibility</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
      {canRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-3"
          aria-label="Retry loading claim eligibility"
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden={true} />
          Retry
        </Button>
      ))}
    </Alert>
  );
}

export const ClaimEligibilityStatus: React.FC<ClaimEligibilityStatusProps> = ({
  marketId,
  account,
  fetcher,
  reducedMotion = false,
  className,
}) => {
  const hookReducedMotion = useReducedMotion();
  const isReduced = reducedMotion || hookReducedMotion;

  const {
    phase,
    eligibility,
    error,
    freshness,
    retry,
  } = useClaimEligibility({ marketId, account, fetcher });

  const staleNote =
    phase === "success" && eligibility && freshness === "stale"
      ? `Evidence may be outdated (resolved ${formatClaimEligibilityRelativeTime(
          eligibility.resolvedAt,
          Date.now(),
        )}).`
      : null;

  let content: React.ReactNode;

  if (phase === "loading" && !eligibility) {
    content = (
      <div className="flex items-center gap-2" aria-hidden={true}>
        <Skeleton className="h-5 w-32 rounded-full" />
        {!isReduced && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  } else if (phase === "error" && error) {
    content = <ErrorAlert error={error} onRetry={retry} />;
  } else if (phase === "permission_denied" && error) {
    content = <ErrorAlert error={error} onRetry={retry} />;
  } else if (eligibility) {
    // success, idle, or loading-with-last-good-data: the full result is always
    // preserved and visible so the user never loses the data they were viewing.
    content = (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <EligibilityBadge decision={eligibility.decision} />
          <span className="text-xs text-muted-foreground">
            {eligibility.reason}
          </span>
        </div>
        {staleNote && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {staleNote}
          </p>
        )}
      </div>
    );
  } else {
    content = <Skeleton className="h-5 w-32 rounded-full" aria-hidden={true} />;
  }

  return (
    <div
      className={cn("min-h-[2.25rem]", className)}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy={phase === "loading"}
      data-testid={`claim-eligibility-${marketId}`}
    >
      {content}
      {/* Screen-reader-only status hints for phases whose visible content is
          decorative/unchanged so the change is still announced. */}
      {phase === "loading" && !eligibility && (
        <span className="sr-only">Checking claim eligibility…</span>
      )}
      {phase === "loading" && eligibility && (
        <span className="sr-only">Updating eligibility…</span>
      )}
    </div>
  );
};

export default ClaimEligibilityStatus;
