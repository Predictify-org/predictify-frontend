/**
 * Activity Timeline Utilities
 * Provides grouping, filtering, and formatting functions for activity events
 */

import { ActivityEvent, GroupedActivity, ActivityGroupType, ACTIVITY_GROUPING_RULES, ACTIVITY_GROUP_CONFIG, GROUPING_STRATEGY } from "@/types/activity";

/**
 * Group activities by type and apply collapse rules
 * - Groups events by ActivityGroupType
 * - Collapses noisy events (multiple similar events within time range)
 * - Prioritizes user-relevant events
 */
export function groupActivities(events: ActivityEvent[]): GroupedActivity[] {
  // Sort events by timestamp (newest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Group by activity group type
  const groupMap = new Map<ActivityGroupType, ActivityEvent[]>();

  sortedEvents.forEach((event) => {
    const groupType = ACTIVITY_GROUPING_RULES[event.eventType];
    if (!groupMap.has(groupType)) {
      groupMap.set(groupType, []);
    }
    const group = groupMap.get(groupType);
    if (group) {
      group.push(event);
    }
  });

  // Convert to grouped activity format with collapse logic
  const grouped: GroupedActivity[] = Array.from(groupMap.entries()).map(
    ([groupType, groupEvents]) => {
      const shouldCollapse = shouldCollapseGroup(groupEvents);
      const config = ACTIVITY_GROUP_CONFIG[groupType];

      return {
        groupType,
        groupLabel: config.label,
        groupIcon: config.icon,
        eventCount: groupEvents.length,
        latestTimestamp: groupEvents[0]?.timestamp || new Date(),
        events: groupEvents,
        isExpanded: !shouldCollapse,
      };
    }
  );

  // Sort groups by latest timestamp
  return grouped.sort(
    (a, b) => b.latestTimestamp.getTime() - a.latestTimestamp.getTime()
  );
}

/**
 * Determine if a group should be collapsed
 * Collapses when:
 * - More than `collapseThreshold` events of same type within `timeRangeMinutes`
 * - And NOT a priority event type
 */
function shouldCollapseGroup(events: ActivityEvent[]): boolean {
  if (events.length <= GROUPING_STRATEGY.collapseThreshold) {
    return false;
  }

  // Check if any priority events exist
  const hasPriorityEvents = events.some((e) =>
    GROUPING_STRATEGY.prioritizeEventTypes.includes(e.eventType)
  );

  if (hasPriorityEvents) {
    return false;
  }

  // Check if events are within time range
  if (events.length > 0) {
    const timeRange = GROUPING_STRATEGY.timeRangeMinutes * 60 * 1000;
    const timeDiff =
      new Date(events[0].timestamp).getTime() -
      new Date(events[events.length - 1].timestamp).getTime();
    return timeDiff <= timeRange;
  }

  return false;
}

/**
 * Format timestamp for display in activity timeline
 * Shows relative time (e.g., "2 hours ago", "Yesterday")
 * Falls back to date format for older events
 */
export function formatActivityTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const diffInMinutes = Math.floor(diff / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return "Just now";
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  }

  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  }

  if (diffInDays === 1) {
    return "Yesterday";
  }

  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }

  // Format as date
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Format time for activity card (HH:MM AM/PM)
 */
export function formatActivityTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format date and time for tooltip or detailed view
 */
export function formatActivityDateTime(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Calculate if activities should show a date separator
 * Shows a separator when date changes between activities
 */
export function shouldShowDateSeparator(
  currentDate: Date,
  previousDate: Date | null
): boolean {
  if (!previousDate) {
    return false;
  }

  const currentDay = currentDate.toDateString();
  const previousDay = previousDate.toDateString();

  return currentDay !== previousDay;
}

/**
 * Get grouped activities paginated
 * @param grouped List of grouped activities
 * @param page Page number (0-indexed)
 * @param pageSize Number of groups per page
 * @returns Paginated grouped activities and whether more pages exist
 */
export function paginateGroupedActivities(
  grouped: GroupedActivity[],
  page: number,
  pageSize: number
): { items: GroupedActivity[]; hasMore: boolean } {
  const start = page * pageSize;
  const end = start + pageSize;
  const items = grouped.slice(start, end);
  const hasMore = end < grouped.length;

  return { items, hasMore };
}

/**
 * Mock data generator for development/testing
 * Creates realistic activity events
 */
export function generateMockActivities(count: number = 12): ActivityEvent[] {
  const eventTypes: ActivityEvent["eventType"][] = [
    "prediction_placed",
    "prediction_settled",
    "event_created",
    "event_verified",
    "winnings_claimed",
    "deposit",
    "withdrawal",
  ];

  const now = new Date();
  const activities: ActivityEvent[] = [];

  for (let i = 0; i < count; i++) {
    const eventType = eventTypes[i % eventTypes.length];
    const hoursAgo = Math.floor(i / 2) + 1;
    const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

    activities.push({
      id: `activity-${i}`,
      eventType,
      groupType: ACTIVITY_GROUPING_RULES[eventType],
      timestamp,
      title: getActivityTitle(eventType),
      description: getActivityDescription(eventType),
      amount: ["deposit", "withdrawal", "winnings_claimed"].includes(eventType)
        ? Math.floor(Math.random() * 1000) + 100
        : undefined,
      currency: ["deposit", "withdrawal", "winnings_claimed"].includes(eventType)
        ? "USDC"
        : undefined,
      relatedEventId: `event-${Math.floor(i / 3)}`,
      relatedEntityId: `entity-${i}`,
    });
  }

  return activities;
}

/**
 * Get display title for activity event type
 */
function getActivityTitle(eventType: ActivityEvent["eventType"]): string {
  const titles: Record<ActivityEvent["eventType"], string> = {
    prediction_placed: "Prediction Placed",
    prediction_settled: "Prediction Settled",
    event_created: "Event Created",
    event_verified: "Event Verified",
    market_opened: "Market Opened",
    market_closed: "Market Closed",
    dispute_filed: "Dispute Filed",
    dispute_resolved: "Dispute Resolved",
    winnings_claimed: "Winnings Claimed",
    deposit: "Deposit Received",
    withdrawal: "Withdrawal Processed",
    verification_requested: "Verification Requested",
    verification_approved: "Verification Approved",
    account_updated: "Account Updated",
    settings_changed: "Settings Changed",
  };

  return titles[eventType];
}

/**
 * Get display description for activity event type
 */
function getActivityDescription(eventType: ActivityEvent["eventType"]): string {
  const descriptions: Record<ActivityEvent["eventType"], string> = {
    prediction_placed: "You placed a new prediction on an event",
    prediction_settled: "Your prediction has been settled",
    event_created: "A new event was created",
    event_verified: "Event has been verified by the platform",
    market_opened: "Market is now open for predictions",
    market_closed: "Market is now closed for new predictions",
    dispute_filed: "A dispute has been filed",
    dispute_resolved: "Dispute has been resolved",
    winnings_claimed: "Your winnings have been claimed",
    deposit: "Funds have been deposited to your account",
    withdrawal: "Funds have been withdrawn from your account",
    verification_requested: "Verification requested for your account",
    verification_approved: "Your account has been verified",
    account_updated: "Your account information was updated",
    settings_changed: "Your settings have been changed",
  };

  return descriptions[eventType];
}
