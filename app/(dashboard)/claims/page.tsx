"use client";

import React, { useState, useMemo } from "react";
import {
  CheckCircle,
  Clock,
  Gift,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// ── Type Definitions ────────────────────────────────────────────────────────

export type ClaimStatus = "available" | "claimed" | "pending" | "disputed";

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

const STATUS_CONFIG: Record<
  ClaimStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; Icon: React.FC<{ className?: string; size?: number; "aria-hidden"?: boolean }> }
> = {
  available: { label: "Available", variant: "default", Icon: Gift },
  claimed: { label: "Claimed", variant: "secondary", Icon: CheckCircle },
  pending: { label: "Pending", variant: "outline", Icon: Clock },
  disputed: { label: "Disputed", variant: "destructive", Icon: AlertCircle },
};

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CLAIMS: Claim[] = [
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

// ── Status Badge (color-blind safe) ─────────────────────────────────────────

const StatusBadge: React.FC<{ status: ClaimStatus }> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.Icon;

  const statusClasses: Record<ClaimStatus, string> = {
    available: "bg-chart-2 text-chart-2-foreground",
    claimed: "bg-muted text-muted-foreground",
    pending: "bg-chart-3 text-chart-3-foreground",
    disputed: "bg-destructive/20 text-destructive",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusClasses[status]}`}
      role="status"
      aria-label={`Claim status: ${config.label}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};

// ── Claim Card ──────────────────────────────────────────────────────────────

const ClaimCard: React.FC<{ claim: Claim }> = ({ claim }) => {
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

  return (
    <Card className="overflow-hidden transition-all duration-150 hover:shadow-md">
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
                className="w-full"
                aria-label={`Claim ${winnings} ${winningsToken} for ${marketTitle}`}
              >
                <Gift className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Claim
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
 *  - Themed empty state with clear CTA when no claims exist (#584)
 *  - Filterable tabs by claim status
 *  - Loading skeleton for first paint
 *  - Error state with retry
 *  - Accessible status badges with live regions
 *
 * WCAG 2.1 AA:
 *  - Proper heading hierarchy (h1 → h2 → h3)
 *  - role="status" + aria-live="polite" for dynamic content
 *  - Keyboard-focusable interactive elements
 *  - Sufficient color contrast via design tokens
 */
const ClaimFlowPage: React.FC = () => {
  const TABS = ["All", "Available", "Pending", "Claimed", "Disputed"] as const;
  type TabValue = (typeof TABS)[number];

  const [activeTab, setActiveTab] = useState<TabValue>("All");
  const [status, setStatus] = useState<"loading" | "success" | "empty" | "error">(
    "loading"
  );
  const [claims, setClaims] = useState<Claim[]>([]);

  // Simulate data fetch on mount
  React.useEffect(() => {
    const timer = setTimeout(() => {
      // Toggle this to test empty state:
      const data = MOCK_CLAIMS;
      // const data: Claim[] = []; // ← uncomment to test empty state
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
              <ClaimCard key={claim.id} claim={claim} />
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
          >
            {status === "loading" && "Loading claims..."}
            {status === "success" &&
              `Showing ${filteredClaims.length} claims in ${activeTab}.`}
            {status === "empty" && "No claims to display."}
            {status === "error" && "Failed to load claims."}
          </div>

          {renderContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClaimFlowPage;
