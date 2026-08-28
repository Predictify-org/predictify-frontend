"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import {
  ActivityEvent,
  GroupedActivity,
  ACTIVITY_GROUP_CONFIG,
  ACTIVITY_EVENT_ICONS,
} from "@/types/activity";
import {
  groupActivities,
  paginateGroupedActivities,
  generateMockActivities,
} from "@/lib/activity-timeline";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, AlertCircle } from "lucide-react";
import { ActivityTimelineItem } from "./activity-timeline-item";
import { ActivityTimelineEmpty, ActivityTimelineError, EmptyStateVariant } from "./activity-timeline-empty";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TimelineRow =
  | { type: "header"; group: GroupedActivity; key: string }
  | { type: "collapsed-summary"; group: GroupedActivity; key: string }
  | { type: "event"; event: ActivityEvent; group: GroupedActivity; key: string };

interface ActivityTimelineProps {
  className?: string;
  activities?: ActivityEvent[];
  isLoading?: boolean;
  error?: string | null;
  pageSize?: number;
  onLoadMore?: () => void;
  emptyStateVariant?: EmptyStateVariant;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActivityTimeline({
  className,
  activities,
  isLoading = false,
  error = null,
  pageSize = 6,
  onLoadMore,
  emptyStateVariant,
}: ActivityTimelineProps) {
  const [groupedActivities, setGroupedActivities] = useState<GroupedActivity[]>(
    []
  );
  const [displayedGroups, setDisplayedGroups] = useState<GroupedActivity[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);

  const activityData = activities || generateMockActivities(24);

  useEffect(() => {
    const grouped = groupActivities(activityData);
    setGroupedActivities(grouped);
    setCurrentPage(0);
    setExpandedGroups(new Set());

    const initialExpanded = new Set<string>();
    grouped.forEach((group) => {
      if (group.isExpanded) {
        initialExpanded.add(group.groupType);
      }
    });
    setExpandedGroups(initialExpanded);

    const { items, hasMore: hasMorePages } = paginateGroupedActivities(
      grouped,
      0,
      pageSize
    );
    setDisplayedGroups(items);
    setHasMore(hasMorePages);
  }, [activityData, pageSize]);

  const handleToggleGroup = (groupType: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupType)) {
        next.delete(groupType);
      } else {
        next.add(groupType);
      }
      return next;
    });
  };

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);

    const { items: nextItems, hasMore: hasMorePages } =
      paginateGroupedActivities(groupedActivities, nextPage, pageSize);

    setDisplayedGroups((prev) => [...prev, ...nextItems]);
    setHasMore(hasMorePages);

    onLoadMore?.();
  };

  const flatRows = useMemo<TimelineRow[]>(() => {
    const rows: TimelineRow[] = [];
    displayedGroups.forEach((group) => {
      rows.push({ type: "header", group, key: `header-${group.groupType}` });
      if (expandedGroups.has(group.groupType)) {
        group.events.forEach((event) => {
          rows.push({
            type: "event",
            event,
            group,
            key: `event-${event.id}`,
          });
        });
      } else if (group.eventCount > 1) {
        rows.push({
          type: "collapsed-summary",
          group,
          key: `summary-${group.groupType}`,
        });
      }
    });
    return rows;
  }, [displayedGroups, expandedGroups]);

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = flatRows[index];
      if (!row) return 80;
      switch (row.type) {
        case "header":
          return 80;
        case "collapsed-summary":
          return 56;
        case "event":
          return 100;
        default:
          return 80;
      }
    },
    overscan: 5,
  });

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <ActivityTimelineLoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <ActivityTimelineError
        error={error}
        className={className}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (activityData.length === 0) {
    return (
      <ActivityTimelineEmpty
        className={className}
        variant={emptyStateVariant}
      />
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div
        ref={parentRef}
        className="max-h-[600px] overflow-auto rounded-lg border border-gray-200"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = flatRows[virtualRow.index];
            if (!row) return null;

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.type === "header" && (
                  <GroupHeader
                    group={row.group}
                    isExpanded={expandedGroups.has(row.group.groupType)}
                    onToggle={() => handleToggleGroup(row.group.groupType)}
                  />
                )}
                {row.type === "collapsed-summary" && (
                  <div className="px-4 py-3 md:px-6 md:py-4 text-sm text-gray-600 flex items-center gap-2 bg-white">
                    <span>{row.group.eventCount} activities</span>
                    <span className="text-gray-400">•</span>
                    <span>Click to expand</span>
                  </div>
                )}
                {row.type === "event" && (
                  <ActivityTimelineItem
                    event={row.event}
                    groupColor={
                      ACTIVITY_GROUP_CONFIG[row.group.groupType].color
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            className="w-full sm:w-auto"
          >
            Load Older Activities
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GroupHeader({
  group,
  isExpanded,
  onToggle,
}: {
  group: GroupedActivity;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const config = ACTIVITY_GROUP_CONFIG[group.groupType];
  const showCollapse =
    group.eventCount > 3 ||
    (group.eventCount > 1 && !group.isExpanded);

  return (
    <div className="border-b border-gray-100">
      <button
        onClick={onToggle}
        className={cn(
          "w-full px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-3",
          "bg-gradient-to-r hover:opacity-90 transition-opacity",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        style={{
          backgroundColor: config.bgColor,
        }}
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          <div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: config.color, opacity: 0.2 }}
          >
            <IconComponent
              name={config.icon}
              className="w-4 h-4 sm:w-5 sm:h-5"
              style={{ color: config.color }}
            />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">
              {config.label}
            </h3>
            <p
              className="text-xs sm:text-sm text-gray-600"
              style={{ color: config.color, opacity: 0.8 }}
            >
              {group.eventCount} event{group.eventCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {showCollapse && (
          <ChevronDown
            className={cn(
              "w-5 h-5 transition-transform flex-shrink-0",
              isExpanded && "rotate-180"
            )}
            style={{ color: config.color }}
          />
        )}
      </button>
    </div>
  );
}

function ActivityTimelineLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-4 md:px-6 md:py-4 bg-gray-100 flex items-center gap-3">
            <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          {[...Array(2)].map((_, j) => (
            <div
              key={j}
              className="px-4 py-4 md:px-6 md:py-4 border-t border-gray-100 flex gap-3"
            >
              <Skeleton className="w-4 h-4 rounded-full flex-shrink-0 mt-1" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function IconComponent({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const iconMap: Record<string, React.ReactNode> = {
    target: "🎯",
    "check-circle": "✓",
    "plus-circle": "+",
    verified: "✓",
    unlock: "🔓",
    lock: "🔒",
    "alert-circle": "⚠",
    "check-square": "☑",
    gift: "🎁",
    "arrow-down-circle": "⬇",
    "arrow-up-circle": "⬆",
    clock: "🕐",
    edit: "✎",
    settings: "⚙",
    calendar: "📅",
    "credit-card": "💳",
    user: "👤",
  };

  return (
    <span className={className} style={style}>
      {iconMap[name] || "•"}
    </span>
  );
}
