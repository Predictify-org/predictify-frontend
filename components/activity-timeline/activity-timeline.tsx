"use client";

import React, { useState, useEffect } from "react";
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
import { ActivityTimelineEmpty } from "./activity-timeline-empty";
import { ActivityTimelineError } from "./activity-timeline-error";

interface ActivityTimelineProps {
  className?: string;
  /** Optional custom activities list. If not provided, mock data is used */
  activities?: ActivityEvent[];
  /** Whether to show the component in loading state */
  isLoading?: boolean;
  /** Error message if activity fetch failed */
  error?: string | null;
  /** Page size for "load more" pagination */
  pageSize?: number;
  /** Callback when user clicks "load more" */
  onLoadMore?: () => void;
}

/**
 * ActivityTimeline Component
 *
 * Displays a chronological list of user activities with intelligent grouping.
 * Features:
 * - Grouped events by type (Predictions, Events, Disputes, etc.)
 * - Collapsible groups for noisy events
 * - Relative timestamps ("2 hours ago", "Yesterday")
 * - Load more functionality
 * - Empty, loading, and error states
 * - Responsive design
 *
 * Grouping Rules:
 * - Events are automatically grouped by type
 * - Groups with >3 similar events are collapsed by default
 * - User-relevant events (settled, resolved, claimed) are always expanded
 * - Within-group events sorted by most recent first
 */
export function ActivityTimeline({
  className,
  activities,
  isLoading = false,
  error = null,
  pageSize = 6,
  onLoadMore,
}: ActivityTimelineProps) {
  const [groupedActivities, setGroupedActivities] = useState<GroupedActivity[]>(
    []
  );
  const [displayedGroups, setDisplayedGroups] = useState<GroupedActivity[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(false);

  // Initialize with mock data or provided activities
  const activityData = activities || generateMockActivities(24);

  // Group activities when data changes
  useEffect(() => {
    const grouped = groupActivities(activityData);
    setGroupedActivities(grouped);
    setCurrentPage(0);
    setExpandedGroups(new Set());

    // Initialize expanded state for groups that aren't collapsed
    const initialExpanded = new Set<string>();
    grouped.forEach((group) => {
      if (group.isExpanded) {
        initialExpanded.add(group.groupType);
      }
    });
    setExpandedGroups(initialExpanded);

    // Paginate and display
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

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <ActivityTimelineLoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <ActivityTimelineError
        error={error}
        className={className}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Empty state
  if (activityData.length === 0) {
    return <ActivityTimelineEmpty className={className} />;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Timeline container */}
      <div className="space-y-4">
        {displayedGroups.map((group) => (
          <ActivityTimelineGroup
            key={group.groupType}
            group={group}
            isExpanded={expandedGroups.has(group.groupType)}
            onToggle={() => handleToggleGroup(group.groupType)}
          />
        ))}
      </div>

      {/* Load More Button */}
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

/**
 * ActivityTimelineGroup Component
 * Renders a collapsible group of activities by type
 */
function ActivityTimelineGroup({
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
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow">
      {/* Group Header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-3",
          "bg-gradient-to-r hover:opacity-90 transition-opacity",
          "border-b border-gray-100"
        )}
        style={{
          backgroundColor: config.bgColor,
        }}
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          {/* Group Icon */}
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

          {/* Group Label and Count */}
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

        {/* Collapse Toggle */}
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

      {/* Group Content */}
      {isExpanded && (
        <div className="divide-y divide-gray-100">
          {group.events.map((event, index) => (
            <ActivityTimelineItem
              key={event.id}
              event={event}
              isFirst={index === 0}
              groupColor={config.color}
            />
          ))}
        </div>
      )}

      {/* Collapsed summary */}
      {!isExpanded && group.eventCount > 1 && (
        <div className="px-4 py-3 md:px-6 md:py-4 text-sm text-gray-600 flex items-center gap-2">
          <span>{group.eventCount} activities</span>
          <span className="text-gray-400">•</span>
          <span>Click to expand</span>
        </div>
      )}
    </div>
  );
}

/**
 * Loading skeleton for activity timeline
 */
function ActivityTimelineLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Header skeleton */}
          <div className="px-4 py-4 md:px-6 md:py-4 bg-gray-100 flex items-center gap-3">
            <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>

          {/* Items skeleton */}
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

/**
 * Icon component wrapper for dynamic icon rendering
 */
function IconComponent({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  // Import common icons from lucide-react
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
