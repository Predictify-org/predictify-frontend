/**
 * Activity Timeline Types
 * Defines lifecycle event types, grouping rules, and activity log data structures
 */

export type ActivityEventType =
  | "prediction_placed"
  | "prediction_settled"
  | "event_created"
  | "event_verified"
  | "market_opened"
  | "market_closed"
  | "dispute_filed"
  | "dispute_resolved"
  | "winnings_claimed"
  | "deposit"
  | "withdrawal"
  | "verification_requested"
  | "verification_approved"
  | "account_updated"
  | "settings_changed";

export type ActivityGroupType =
  | "predictions"
  | "events"
  | "disputes"
  | "transactions"
  | "account"
  | "verification";

export interface ActivityEvent {
  id: string;
  eventType: ActivityEventType;
  groupType: ActivityGroupType;
  timestamp: Date;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  relatedEventId?: string;
  relatedEntityId?: string;
  metadata?: Record<string, any>;
  icon?: string;
}

/**
 * Grouped activity for display with collapse/expand state
 */
export interface GroupedActivity {
  groupType: ActivityGroupType;
  groupLabel: string;
  groupIcon: string;
  eventCount: number;
  latestTimestamp: Date;
  events: ActivityEvent[];
  isExpanded: boolean;
}

/**
 * Activity timeline state for pagination and loading
 */
export interface ActivityTimelineState {
  events: ActivityEvent[];
  groupedEvents: GroupedActivity[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  pageSize: number;
  page: number;
}

/**
 * Grouping rules for different event types
 * Determines which events should be grouped together
 */
export const ACTIVITY_GROUPING_RULES: Record<ActivityEventType, ActivityGroupType> = {
  prediction_placed: "predictions",
  prediction_settled: "predictions",
  event_created: "events",
  event_verified: "events",
  market_opened: "events",
  market_closed: "events",
  dispute_filed: "disputes",
  dispute_resolved: "disputes",
  winnings_claimed: "transactions",
  deposit: "transactions",
  withdrawal: "transactions",
  verification_requested: "verification",
  verification_approved: "verification",
  account_updated: "account",
  settings_changed: "account",
};

/**
 * Display configuration for activity groups
 * Determines how groups are presented in the UI
 */
export const ACTIVITY_GROUP_CONFIG: Record<ActivityGroupType, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  predictions: {
    label: "Predictions",
    icon: "target",
    color: "#8B5CF6",
    bgColor: "#F3E8FF",
  },
  events: {
    label: "Events",
    icon: "calendar",
    color: "#06B6D4",
    bgColor: "#ECFDF5",
  },
  disputes: {
    label: "Disputes",
    icon: "alert-circle",
    color: "#EF4444",
    bgColor: "#FEE2E2",
  },
  transactions: {
    label: "Transactions",
    icon: "credit-card",
    color: "#10B981",
    bgColor: "#ECFDF5",
  },
  account: {
    label: "Account",
    icon: "user",
    color: "#3B82F6",
    bgColor: "#EFF6FF",
  },
  verification: {
    label: "Verification",
    icon: "check-circle",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
  },
};

/**
 * Icon mapping for specific event types
 */
export const ACTIVITY_EVENT_ICONS: Record<ActivityEventType, string> = {
  prediction_placed: "target",
  prediction_settled: "check-circle",
  event_created: "plus-circle",
  event_verified: "verified",
  market_opened: "unlock",
  market_closed: "lock",
  dispute_filed: "alert-circle",
  dispute_resolved: "check-square",
  winnings_claimed: "gift",
  deposit: "arrow-down-circle",
  withdrawal: "arrow-up-circle",
  verification_requested: "clock",
  verification_approved: "check-circle",
  account_updated: "edit",
  settings_changed: "settings",
};

/**
 * Grouping strategy configuration
 * Controls when events should be collapsed based on:
 * - Time range (collapse events within 1 hour)
 * - Event density (collapse groups with >3 similar events)
 * - User preference (expandable groups)
 */
export const GROUPING_STRATEGY = {
  timeRangeMinutes: 60, // Group events within 1 hour
  collapseThreshold: 3, // Collapse after 3 events in group within time range
  autoExpandGroups: false, // Don't auto-expand grouped events
  prioritizeEventTypes: [
    "prediction_settled",
    "dispute_resolved",
    "winnings_claimed",
  ], // Always show these at top
};

/**
 * Time frame for activity timeline default view (96 hours)
 */
export const DEFAULT_ACTIVITY_TIMEFRAME = {
  hours: 96,
  displayLabel: "Last 4 days",
};
