"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Coins, Scale, Award, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Timestamp } from "@/components/ui/Timestamp";
import { CopyAddress } from "@/app/components/CopyAddress";
import { useMarketActivity } from "@/hooks/useMarketActivity";
import type {
  MarketActivityEvent,
  MarketActivityType,
  MarketActivityFetcher,
} from "@/lib/stellar/market-activity";

export interface MarketActivityFeedProps {
  marketId: string;
  className?: string;
  fetcher?: MarketActivityFetcher;
  limit?: number;
  maxHeight?: number | string;
}

const typeConfig: Record<
  MarketActivityType,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
  }
> = {
  bet: {
    label: "Bet",
    variant: "default",
    icon: Coins,
    colorClass:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  claim: {
    label: "Claim",
    variant: "secondary",
    icon: Award,
    colorClass:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  dispute: {
    label: "Dispute",
    variant: "destructive",
    icon: Scale,
    colorClass:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
};

export function MarketActivityFeed({
  marketId,
  className,
  fetcher,
  limit = 20,
  maxHeight = "520px",
}: MarketActivityFeedProps) {
  const {
    events,
    isLoading,
    isLoadingMore,
    error,
    hasNextPage,
    loadMore,
    retry,
  } = useMarketActivity({ marketId, limit, fetcher });

  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Auto-load trigger when near the bottom of the virtualized list
  React.useEffect(() => {
    if (
      !hasNextPage ||
      isLoadingMore ||
      isLoading ||
      virtualItems.length === 0
    ) {
      return;
    }
    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem && lastItem.index >= events.length - 2) {
      loadMore();
    }
  }, [
    virtualItems,
    events.length,
    hasNextPage,
    isLoadingMore,
    isLoading,
    loadMore,
  ]);

  // Loading skeleton state
  if (isLoading && events.length === 0) {
    return (
      <div
        className={cn("space-y-3 p-4 border rounded-xl bg-card", className)}
        data-testid="market-activity-skeleton"
        aria-busy="true"
        aria-label="Loading activity feed"
      >
        <div className="flex items-center justify-between pb-2 border-b">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-16 rounded-md" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="text-right space-y-1">
              <Skeleton className="h-4 w-16 ml-auto" />
              <Skeleton className="h-3 w-24 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error && events.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-card space-y-3",
          className
        )}
        data-testid="market-activity-error"
        role="alert"
      >
        <div className="p-3 rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">
            Failed to load activity
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            {error.message ||
              "An unexpected error occurred while fetching on-chain events."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => retry()}
          className="gap-2 mt-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  // Empty state
  if (!isLoading && events.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-card space-y-2",
          className
        )}
        data-testid="market-activity-empty"
      >
        <Coins className="h-8 w-8 text-muted-foreground/40 mb-1" />
        <h4 className="text-sm font-medium text-foreground">No activity yet</h4>
        <p className="text-xs text-muted-foreground max-w-sm">
          No on-chain bets, claims, or dispute events recorded for this market yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col border rounded-xl bg-card overflow-hidden",
        className
      )}
      data-testid="market-activity-feed"
    >
      {/* Scrollable virtualized container with feed semantics */}
      <div
        ref={parentRef}
        role="feed"
        aria-busy={isLoading || isLoadingMore}
        aria-label="Market activity feed"
        className="overflow-y-auto p-3 sm:p-4 divide-y divide-border/60"
        style={{ maxHeight }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const event: MarketActivityEvent | undefined =
              events[virtualRow.index];
            if (!event) return null;
            const config = typeConfig[event.type] || typeConfig.bet;
            const Icon = config.icon;

            return (
              <article
                key={event.id}
                role="article"
                aria-posinset={virtualRow.index + 1}
                aria-setsize={events.length}
                data-testid={`activity-event-${event.id}`}
                className="absolute top-0 left-0 w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Left: Type badge & User address */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium shrink-0",
                      config.colorClass
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{config.label}</span>
                  </div>

                  <div className="min-w-0 flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <CopyAddress
                        address={event.address}
                        size="sm"
                        variant="ghost"
                        className="h-7 px-1.5 text-xs text-foreground font-mono"
                      />
                    </div>
                    {event.outcome && (
                      <span className="text-[11px] text-muted-foreground truncate">
                        Outcome:{" "}
                        <span className="font-medium text-foreground">
                          {event.outcome}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Amount & Timestamp */}
                <div className="flex flex-col items-end text-right shrink-0 pl-2">
                  {event.amount ? (
                    <span className="text-sm font-semibold tracking-tight text-foreground">
                      {event.amount} XLM
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                  <Timestamp
                    date={event.ledgerClosedAt}
                    className="text-xs text-muted-foreground hover:underline cursor-pointer"
                  />
                </div>
              </article>
            );
          })}
        </div>

        {/* Footer actions: Load more button / Spinner */}
        <div className="pt-3 pb-1 flex flex-col items-center justify-center">
          {isLoadingMore && (
            <div
              className="flex items-center gap-2 text-xs text-muted-foreground py-2"
              aria-live="polite"
              data-testid="loading-more-indicator"
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Loading more activity...</span>
            </div>
          )}

          {hasNextPage && !isLoadingMore && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadMore()}
              className="text-xs mt-2"
              data-testid="load-more-btn"
            >
              Load more
            </Button>
          )}

          {!hasNextPage && events.length > 0 && (
            <p className="text-[11px] text-muted-foreground/70 py-2">
              End of on-chain activity
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
