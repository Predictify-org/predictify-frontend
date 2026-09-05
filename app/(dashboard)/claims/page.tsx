"use client";

// Handle wallet-network mismatch before signing/claiming.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle,
  Clock,
  Gift,
  Loader2,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import KbdHint from "@/components/KbdHint";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useWalletContext } from "@/context/WalletContext";
import { cn } from "@/lib/utils";
import { ClaimEligibilityClientError } from "@/lib/claim-eligibility-client";
import type { ClaimEvidence, ClaimStatus } from "@/types/claim-eligibility";

// Re-export for backward compatibility with any callers importing ClaimStatus
// from this page module. The canonical definition now lives in
// types/claim-eligibility.ts alongside the rest of the claim data model.
export type { ClaimStatus };

// ── Type Definitions ────────────────────────────────────────────────────────

// (ClaimStatus is imported from types/claim-eligibility.ts)

export interface Claim {
  id: string;
  marketTitle: string;
  prediction: string;
  stakeAmount: number;
  stakeToken: string;
  winnings: number;
  winningsToken: string;
  resolvedDate: string;
  status: ClaimStatus;
}

// ── Status Configuration ────────────────────────────────────────────────────

/**
 * Status config with color-blind safe pattern mapping.
 *
 * Each status is assigned a distinct CSS pattern class from patterns.css
 * so that status can be distinguished by texture as well as colour.
 * This meets WCAG 2.1 AA SC 1.4.1 (Use of Color).
 *
 * Pattern mapping:
 *   available → pattern-diagonal (positive / winnings ready)
 *   claimed   → pattern-crosshatch (neutral / already processed)
 *   pending   → pattern-horizontal (waiting / in progress)
 *   disputed  → pattern-vertical (alert / needs attention)
 *
 * Each status also includes an explicit text colour to maintain
 * sufficient contrast (≥4.5:1) against its background in both
 * light and dark mode.
 */
const STATUS_CONFIG: Record<
  ClaimStatus,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    Icon: React.FC<{ className?: string; size?: number; "aria-hidden"?: boolean }>;
    bgClass: string;
    textClass: string;
    patternClass: string;
  }
> = {
  available: {
    label: "Available",
    variant: "default",
    Icon: Gift,
    bgClass: "bg-chart-2",
    textClass: "text-white",
    patternClass: "pattern-diagonal",
  },
  claimed: {
    label: "Claimed",
    variant: "secondary",
    Icon: CheckCircle,
    bgClass: "bg-muted",
    textClass: "text-muted-foreground",
    patternClass: "pattern-crosshatch",
  },
  pending: {
    label: "Pending",
    variant: "outline",
    Icon: Clock,
    bgClass: "bg-chart-3",
    textClass: "text-white",
    patternClass: "pattern-horizontal",
  },
  disputed: {
    label: "Disputed",
    variant: "destructive",
    Icon: AlertCircle,
    bgClass: "bg-destructive/20",
    textClass: "text-destructive",
    patternClass: "pattern-vertical",
  },
};

/**
 * Network on which claim settlements are signed.
 * Uses an env override so the same bundle can target testnet or mainnet.
 * Exported for tests.
 */
export const REQUIRED_CLAIM_NETWORK =
  process.env.NEXT_PUBLIC_CLAIM_NETWORK ?? "testnet";

/**
 * Returns true when the connected wallet's network does not match the
 * network required for claim settlements. A missing wallet network is not
 * treated as a mismatch because the action is already disabled when the
 * wallet is not connected.
 */
export const isClaimNetworkMismatch = (
  walletNetwork?: string | null,
): boolean => {
  if (!REQUIRED_CLAIM_NETWORK) return false;
  if (!walletNetwork) return false;
  // Network IDs are normalized to lowercase because wallet providers may
  // return different casing for the same network (e.g. "mainnet" vs "Mainnet").
  return walletNetwork.toLowerCase() !== REQUIRED_CLAIM_NETWORK.toLowerCase();
};

// ── Mock Data ────────────────────────────────────────────────────────────────

export const MOCK_CLAIMS: Claim[] = [
  {
    id: "claim-1",
    marketTitle: "NBA Finals: Lakers vs Heat",
    prediction: "Lakers to win",
    stakeAmount: 10,
    stakeToken: "XLM",
    winnings: 18,
    winningsToken: "XLM",
    resolvedDate: "2026-06-15",
    status: "available",
  },
  {
    id: "claim-2",
    marketTitle: "Bitcoin Price June 2026",
    prediction: "Above $80,000",
    stakeAmount: 20,
    stakeToken: "XLM",
    winnings: 30,
    winningsToken: "XLM",
    resolvedDate: "2026-06-01",
    status: "claimed",
  },
  {
    id: "claim-3",
    marketTitle: "Presidential Election 2028",
    prediction: "Candidate A wins primary",
    stakeAmount: 5,
    stakeToken: "USDC",
    winnings: 11,
    winningsToken: "USDC",
    resolvedDate: "2026-05-15",
    status: "pending",
  },
  {
    id: "claim-4",
    marketTitle: "ETH Gas Fee Prediction",
    prediction: "Below 25 gwei avg",
    stakeAmount: 15,
    stakeToken: "USDC",
    winnings: 25.5,
    winningsToken: "USDC",
    resolvedDate: "2026-04-10",
    status: "disputed",
  },
  {
    id: "claim-5",
    marketTitle: "Formula 1: Monaco GP",
    prediction: "Verstappen to win",
    stakeAmount: 8,
    stakeToken: "XLM",
    winnings: 15.2,
    winningsToken: "XLM",
    resolvedDate: "2026-05-28",
    status: "available",
  },
];

/** Simulated claim latency (ms). Exported for tests. */
export const CLAIM_LATENCY_MS = 600;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Mock authoritative-evidence fetcher for the claims demo.
 *
 * Stands in for the production `fetchClaimEligibility` client (which talks to
 * /api/claim-eligibility). It derives a deterministic `ClaimEvidence` record
 * from the locally-defined `MOCK_CLAIMS` so the full eligibility state machine
 * is visible in the UI. When no account is connected it rejects with a
 * permission error, mirroring the 401 the real endpoint returns for
 * unauthorized callers. Swap this for `fetchClaimEligibility` once a
 * settlement source is wired up — the rest of the UI is unchanged.
 */
export const mockClaimEligibilityFetcher = (
  marketId: string,
  options: { account?: string; signal?: AbortSignal },
): Promise<ClaimEvidence> => {
  if (!options.account || !options.account.trim()) {
    return Promise.reject(
      new ClaimEligibilityClientError(
        "Connect your wallet to view claim eligibility.",
        "permission",
        false,
      ),
    );
  }

  const claim = MOCK_CLAIMS.find((c) => c.id === marketId);
  if (!claim) {
    return Promise.reject(
      new ClaimEligibilityClientError(
        "Claim eligibility is not available for this market.",
        "not_found",
        false,
      ),
    );
  }

  const now = Date.now();
  const resolvedAt =
    claim.status === "available"
      ? marketId === "claim-5"
        ? now - 2 * DAY_MS
        : now - 2 * HOUR_MS
      : now - 3 * DAY_MS;

  const evidence: ClaimEvidence = {
    marketId: claim.id,
    outcome: claim.prediction,
    userPrediction: claim.prediction,
    resolvedAt,
    source: "oracle",
    claimed: claim.status === "claimed",
    claimStatus: claim.status,
    winnings: claim.winnings,
    winningsToken: claim.winningsToken,
    marketTitle: claim.marketTitle,
  };

  return Promise.resolve(evidence);
};

// ── Color-Blind Safe Status Badge ───────────────────────────────────────────

/**
 * StatusBadge — renders the claim status with both colour AND texture (pattern).
 *
 * The badge overlays a repeating CSS pattern (diagonal lines, dots,
 * crosshatch, horizontal/vertical stripes) on top of its background
 * colour so that users with colour-vision deficiencies can tell statuses
 * apart without relying on hue alone (WCAG 2.1 AA SC 1.4.1).
 *
 * The pattern classes are defined in app/styles/patterns.css and are
 * designed to remain visible in both light and dark mode using
 * rgba(255,255,255,…) overlays.
 */
const StatusBadge: React.FC<{ status: ClaimStatus }> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.Icon;

  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1.5 overflow-hidden rounded-full px-3 py-1 text-xs font-medium",
        config.bgClass,
        config.textClass,
        // Color-blind safe pattern overlay
        config.patternClass
      )}
      role="status"
      aria-label={`Claim status: ${config.label}`}
    >
      <Icon className="relative z-10 h-3.5 w-3.5" aria-hidden={true} />
      <span className="relative z-10">{config.label}</span>
    </span>
  );
};

// ── Claim Card ──────────────────────────────────────────────────────────────

export interface ClaimCardProps {
  claim: Claim;
  onClaim?: (claim: Claim) => void;
  isClaiming?: boolean;
  reducedMotion?: boolean;
  /** Authoritative-evidence fetcher; when provided, renders live eligibility. */
  eligibilityFetcher?: (
    marketId: string,
    options: { account?: string; signal?: AbortSignal },
  ) => Promise<ClaimEvidence>;
  /** Connected account used to scope eligibility (drives the permission state). */
  account?: string;
  /** Disables the claim action when the wallet is missing or on the wrong network. */
  disabled?: boolean;
}

/**
 * ClaimCard — single claimable-winnings card with an accessible claim action.
 *
 * Buffer #4 polish:
 *  - Wired Claim button with busy/disabled states
 *  - Keyboard shortcut hint (⌘↵) on the primary action
 *  - Reduced-motion aware hover/transition treatment
 *  - focus-visible ring on the claim control (WCAG 2.1 SC 2.4.7)
 */
export const ClaimCard: React.FC<ClaimCardProps> = ({
  claim,
  onClaim,
  isClaiming = false,
  reducedMotion = false,
  disabled = false,
}) => {
  const {
    marketTitle,
    prediction,
    stakeAmount,
    stakeToken,
    winnings,
    winningsToken,
    resolvedDate,
    status,
  } = claim;

  const isActionable = status === "available";
  const { network: walletNetwork } = useWalletContext();
  const isWrongNetwork = isClaimNetworkMismatch(walletNetwork);

  return (
    <Card
      className={cn(
        "overflow-hidden",
        !reducedMotion && "transition-all duration-150 hover:shadow-md"
      )}
      data-testid={`claim-card-${claim.id}`}
    >
      <CardContent className="flex flex-col gap-4 p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="truncate text-base font-semibold text-foreground">
              {marketTitle}
            </h3>
            <p className="text-sm text-muted-foreground">{prediction}</p>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Stake</p>
            <p className="font-medium tabular-nums">
              {stakeAmount} {stakeToken}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Winnings</p>
            <p className="font-medium tabular-nums text-chart-2">
              {winnings} {winningsToken}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Resolved</p>
            <p className="font-medium">
              {new Date(resolvedDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-end">
            {isActionable && (
              <Button
                size="sm"
                className="w-full gap-1.5"
                disabled={isClaiming || disabled || isWrongNetwork}
                aria-busy={isClaiming}
                aria-label={
                  isWrongNetwork
                    ? `Switch wallet to ${REQUIRED_CLAIM_NETWORK} to claim ${winnings} ${winningsToken} for ${marketTitle}`
                    : isClaiming
                      ? `Claiming ${winnings} ${winningsToken} for ${marketTitle}`
                      : `Claim ${winnings} ${winningsToken} for ${marketTitle}`
                }
                title={isWrongNetwork ? `Switch wallet to ${REQUIRED_CLAIM_NETWORK} to claim` : undefined}
                onClick={() => {
                  if (isClaiming || disabled || isWrongNetwork) return;
                  onClaim?.(claim);
                }}
              >
                {isClaiming ? (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Gift className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{isClaiming ? "Claiming…" : "Claim"}</span>
                {!isClaiming && (
                  <span className="ml-auto flex items-center gap-0.5 opacity-80">
                    <KbdHint className="bg-primary-foreground/20 text-primary-foreground border-transparent">
                      ⌘
                    </KbdHint>
                    <KbdHint className="bg-primary-foreground/20 text-primary-foreground border-transparent">
                      ↵
                    </KbdHint>
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Filtered Claims Empty State ─────────────────────────────────────────────

const FilteredClaimsEmptyState: React.FC<{
  activeTab: string;
  onReset: () => void;
}> = ({ activeTab, onReset }) => (
  <section
    role="status"
    aria-live="polite"
    className="col-span-full rounded-2xl border border-dashed border-border/60 bg-card/30 px-6 py-12 text-center backdrop-blur-sm"
  >
    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
      <TrendingUp size={26} aria-hidden="true" />
    </div>
    <h2 className="text-xl font-semibold text-foreground">
      No claims match this filter
    </h2>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
      There are no claims with the &quot;{activeTab}&quot; status. Reset filters
      to view all claims.
    </p>
    <Button
      variant="outline"
      size="sm"
      onClick={onReset}
      className="mt-6"
    >
      Reset filters
    </Button>
  </section>
);

// ── Loading Skeleton ────────────────────────────────────────────────────────

const ClaimCardSkeleton: React.FC = () => (
  <Card className="overflow-hidden">
    <CardContent className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    </CardContent>
  </Card>
);

// ── Error State ─────────────────────────────────────────────────────────────

const ClaimFlowError: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <Alert variant="destructive" className="mx-auto max-w-lg">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Failed to load claims</AlertTitle>
    <AlertDescription>
      An error occurred while fetching your claims. Please try again.
    </AlertDescription>
    <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
      Retry
    </Button>
  </Alert>
);

// ── Main ClaimFlow Page ─────────────────────────────────────────────────────

/**
 * ClaimFlow — View and manage claimable winnings from resolved predictions.
 *
 * Features:
 *  - Color-blind safe status badges using CSS patterns (diagonal, dots,
 *    crosshatch, horizontal/vertical stripes) overlaying chart colours
 *    so status is conveyed by texture AND colour (WCAG 2.1 AA SC 1.4.1).
 *  - Patterns are defined in app/styles/patterns.css and imported globally
 *    via app/layout.tsx.
 *  - Themed empty state with clear CTA when no claims exist.
 *  - Filterable tabs by claim status.
 *  - Loading skeleton for first paint.
 *  - Error state with retry.
 *  - Claim action with busy state, success announcement, and ⌘↵ shortcut
 *    (GrantFox FWC26 buffer #4 polish).
 *
 * WCAG 2.1 AA:
 *  - Proper heading hierarchy (h1 → h2 → h3)
 *  - role="status" + aria-live="polite" for dynamic content
 *  - Pattern overlay provides information beyond colour (SC 1.4.1)
 *  - Keyboard-focusable interactive elements
 *  - Sufficient colour contrast via design tokens
 */
const ClaimFlowPage: React.FC = () => {
  const TABS = ["All", "Available", "Pending", "Claimed", "Disputed"] as const;
  type TabValue = (typeof TABS)[number];

  const reducedMotion = useReducedMotion();
  const { address, network: walletNetwork } = useWalletContext();
  const [activeTab, setActiveTab] = useState<TabValue>("All");
  const [status, setStatus] = useState<"loading" | "success" | "empty" | "error">(
    "loading"
  );
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const walletNetworkRef = useRef(walletNetwork);
  const addressRef = useRef(address);
  useEffect(() => {
    walletNetworkRef.current = walletNetwork;
    addressRef.current = address;
  }, [address, walletNetwork]);

  const walletNetworkMismatch = Boolean(
    address && isClaimNetworkMismatch(walletNetwork)
  );
  const canClaim = Boolean(
    address && walletNetwork && !walletNetworkMismatch
  );

  // Simulate data fetch on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const data = MOCK_CLAIMS;
      setClaims(data);
      setStatus(data.length === 0 ? "empty" : "success");
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const filteredClaims = useMemo(() => {
    if (activeTab === "All") return claims;
    const statusKey = activeTab.toLowerCase() as ClaimStatus;
    return claims.filter((c) => c.status === statusKey);
  }, [activeTab, claims]);

  const handleClaim = useCallback(
    async (claim: Claim) => {
      if (claim.status !== "available" || claimingId) return;

      if (!addressRef.current || !walletNetworkRef.current) {
        setAnnouncement("Connect your wallet to claim winnings.");
        return;
      }

      if (isClaimNetworkMismatch(walletNetworkRef.current)) {
        setAnnouncement(
          `Switch your wallet to ${REQUIRED_CLAIM_NETWORK} to claim winnings.`
        );
        return;
      }

      setClaimingId(claim.id);
      setAnnouncement(
        `Claiming ${claim.winnings} ${claim.winningsToken} for ${claim.marketTitle}.`
      );

      try {
        await new Promise((resolve) => setTimeout(resolve, CLAIM_LATENCY_MS));

        // Re-check the wallet network immediately before committing the claim.
        // The network may have changed while the simulated signing was in
        // flight; claiming on the wrong network would be unsafe.
        if (!addressRef.current || !walletNetworkRef.current) {
          setAnnouncement("Connect your wallet to claim winnings.");
          return;
        }
        if (isClaimNetworkMismatch(walletNetworkRef.current)) {
          setAnnouncement(
            `Switch your wallet to ${REQUIRED_CLAIM_NETWORK} to claim winnings.`
          );
          return;
        }

        setClaims((prev) =>
          prev.map((c) =>
            c.id === claim.id ? { ...c, status: "claimed" as const } : c
          )
        );
        setAnnouncement(
          `Successfully claimed ${claim.winnings} ${claim.winningsToken} for ${claim.marketTitle}.`
        );
      } catch {
        setAnnouncement(
          `Failed to claim ${claim.winnings} ${claim.winningsToken} for ${claim.marketTitle}. Please try again.`
        );
      } finally {
        setClaimingId(null);
      }
    },
    [claimingId]
  );

  // ⌘↵ / Ctrl+↵ claims the first available winnings (mirrors BetForm shortcut)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "Enter") return;
      if (claimingId) return;

      const nextAvailable = claims.find((c) => c.status === "available");
      if (!nextAvailable) return;

      e.preventDefault();
      if (isClaimNetworkMismatch(walletNetwork)) {
        setAnnouncement(
          `Switch your wallet to ${REQUIRED_CLAIM_NETWORK} to claim winnings.`
        );
        return;
      }
      void handleClaim(nextAvailable);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [claims, claimingId, handleClaim, walletNetwork]);

  const handleRetry = () => {
    setStatus("loading");
    setTimeout(() => {
      const data = MOCK_CLAIMS;
      setClaims(data);
      setStatus(data.length === 0 ? "empty" : "success");
    }, 1200);
  };

  const handleResetFilters = () => {
    setActiveTab("All");
  };

  // ── Render by status ──────────────────────────────────────────────────

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <ClaimCardSkeleton key={i} />
            ))}
          </div>
        );

      case "error":
        return <ClaimFlowError onRetry={handleRetry} />;

      case "empty":
        return (
          <EmptyState
            title="No claims yet"
            description="Your winnings from resolved predictions will appear here. Start predicting on markets to earn rewards you can claim."
            ctaText="Explore Markets"
            ctaHref="/events"
            icon={Gift}
          />
        );

      case "success":
        if (filteredClaims.length === 0) {
          return (
            <FilteredClaimsEmptyState
              activeTab={activeTab}
              onReset={handleResetFilters}
            />
          );
        }
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredClaims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                onClaim={handleClaim}
                isClaiming={claimingId === claim.id}
                reducedMotion={reducedMotion}
                eligibilityFetcher={mockClaimEligibilityFetcher}
                account={address ?? undefined}
                disabled={!canClaim || claimingId !== null}
              />
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  // ── Stats summary ──────────────────────────────────────────────────────

  const totalAvailable = claims.filter((c) => c.status === "available").length;
  const totalWinnings = claims
    .filter((c) => c.status === "available")
    .reduce((sum, c) => sum + c.winnings, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Claim Winnings
          </h1>
          <p className="text-sm text-muted-foreground">
            View and claim your winnings from resolved predictions.
          </p>
        </div>
        {status === "success" && totalAvailable > 0 && (
          <Card className="inline-flex shrink-0 gap-4 px-4 py-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="text-lg font-bold tabular-nums">{totalAvailable}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold tabular-nums text-chart-2">
                {totalWinnings} XLM
              </p>
            </div>
          </Card>
        )}
      </div>

      {status === "success" && totalAvailable > 0 && !canClaim && (
        <Alert
          variant={walletNetworkMismatch ? "destructive" : "default"}
          className="mx-auto max-w-3xl"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {walletNetworkMismatch ? "Wrong network" : "Wallet connection required"}
          </AlertTitle>
          <AlertDescription>
            {walletNetworkMismatch
              ? `Switch your wallet to ${REQUIRED_CLAIM_NETWORK} to claim winnings.`
              : "Connect your wallet to claim winnings."}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for filtering */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
      >
        <TabsList className="flex-wrap">
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {/* Live region for screen readers */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            data-testid="claim-flow-live-region"
          >
            {announcement ||
              (status === "loading" && "Loading claims...") ||
              (status === "success" &&
                `Showing ${filteredClaims.length} claims in ${activeTab}.`) ||
              (status === "empty" && "No claims to display.") ||
              (status === "error" && "Failed to load claims.") ||
              ""}
          </div>

          {renderContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClaimFlowPage;