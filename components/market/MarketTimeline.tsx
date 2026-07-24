"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  MarketEvent,
  MarketEventType,
  getMarketEventIcon,
  getMarketEventColor,
  getMarketEventLabel,
} from "@/types/market-timeline";
import { generateMockMarketEvents, formatMarketTimestamp, formatMarketTime, groupMarketEventsByDate } from "@/lib/market-timeline";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ChevronDown } from "lucide-react";

const EVENT_ICONS: Record<string, React.ReactNode> = {
  "plus-circle": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
  ),
  unlock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
  ),
  "trending-up": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
  ),
  droplet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
  ),
  "alert-circle": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
  ),
  "check-square": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
  ),
  "check-circle": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
  ),
  gift: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
  ),
  circle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10" /></svg>
  ),
};

interface MarketTimelineProps {
  className?: string;
  events?: MarketEvent[];
  isLoading?: boolean;
  error?: string | null;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function MarketTimeline({
  className,
  events,
  isLoading = false,
  error = null,
  onLoadMore,
  hasMore = false,
}: MarketTimelineProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const eventData = events ?? generateMockMarketEvents();

  const groups = useMemo(() => groupMarketEventsByDate(eventData), [eventData]);

  const toggleGroup = (date: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  if (isLoading) {
    return <MarketTimelineSkeleton className={className} />;
  }

  if (error) {
    return <MarketTimelineError error={error} className={className} />;
  }

  if (eventData.length === 0) {
    return <MarketTimelineEmpty className={className} />;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.date);
        const showCollapse = group.events.length > 3;

        return (
          <div key={group.date}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </h3>
              <span className="text-xs text-muted-foreground/60">
                ({group.events.length} event{group.events.length !== 1 ? "s" : ""})
              </span>
              {showCollapse && (
                <button
                  onClick={() => toggleGroup(group.date)}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  aria-label={isExpanded ? "Collapse events" : "Expand events"}
                >
                  {isExpanded ? "Show less" : `Show all ${group.events.length}`}
                  <ChevronDown
                    className={cn(
                      "w-3 h-3 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>
              )}
            </div>

            <div className="relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border" aria-hidden="true" />

              <div className={cn("space-y-0", !isExpanded && group.events.length > 3 && "overflow-hidden")}>
                {(isExpanded || !showCollapse
                  ? group.events
                  : group.events.slice(0, 3)
                ).map((event) => (
                  <MarketTimelineItem key={event.id} event={event} />
                ))}
              </div>

              {!isExpanded && showCollapse && (
                <div className="relative pl-10 py-2">
                  <button
                    onClick={() => toggleGroup(group.date)}
                    className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    +{group.events.length - 3} more event{group.events.length - 3 !== 1 ? "s" : ""}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={onLoadMore}>
            Load Older Events
          </Button>
        </div>
      )}
    </div>
  );
}

function MarketTimelineItem({ event }: { event: MarketEvent }) {
  const color = getMarketEventColor(event.eventType);
  const icon = getMarketEventIcon(event.eventType);

  return (
    <div className="relative flex gap-4 pb-5 group">
      <div className="relative flex-shrink-0 z-10">
        <div
          className="w-[30px] h-[30px] rounded-full flex items-center justify-center border-2 border-background"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {EVENT_ICONS[icon] ?? EVENT_ICONS.circle}
        </div>
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-0.5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{event.title}</p>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {event.description}
              </p>
            )}
          </div>
          <time
            dateTime={event.timestamp.toISOString()}
            className="text-xs text-muted-foreground/70 whitespace-nowrap flex-shrink-0"
            title={formatMarketTime(event.timestamp)}
          >
            {formatMarketTimestamp(event.timestamp)}
          </time>
        </div>

        {event.amount && event.currency && (
          <div className="mt-1.5">
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                event.eventType === "payouts_distributed"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : event.eventType === "liquidity_added"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {event.amount.toLocaleString()} {event.currency}
            </span>
          </div>
        )}

        {event.user && (
          <p className="text-xs text-muted-foreground/50 mt-1 font-mono">
            by {event.user}
          </p>
        )}
      </div>
    </div>
  );
}

function MarketTimelineEmpty({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-8 h-8 text-muted-foreground"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        No timeline events yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Market events will appear here as the market progresses through its
        lifecycle.
      </p>
    </div>
  );
}

function MarketTimelineError({
  error,
  className,
}: {
  error: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        Failed to load timeline
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{error}</p>
    </div>
  );
}

function MarketTimelineSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {[1, 2, 3].map((group) => (
        <div key={group}>
          <Skeleton className="h-4 w-20 mb-3" />
          <div className="space-y-0">
            {[1, 2].map((item) => (
              <div key={item} className="flex gap-4 pb-5">
                <Skeleton className="w-[30px] h-[30px] rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-3 w-12 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
