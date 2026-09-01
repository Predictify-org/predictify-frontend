/**
 * Notification Preference Types
 *
 * Defines the types and data structures for deterministic, per-account
 * notification preferences, conflict resolution, and offline reconciliation.
 */

export type NotificationCategoryKey =
  | "settlement"
  | "market"
  | "wallet"
  | "dispute"
  | "payout"
  | "system"
  | "account";

export type NotificationChannelKey = "inApp" | "email" | "push";

export type NotificationIntensity = "important" | "balanced" | "everything";

export interface QuietHoursPreference {
  enabled: boolean;
  start: string; // e.g. "22:00"
  end: string;   // e.g. "08:00"
  tz: "auto" | "UTC" | string;
}

export type CategoryPreferences = Record<NotificationCategoryKey, boolean>;
export type ChannelPreferences = Record<NotificationChannelKey, boolean>;

export interface NotificationPreferences {
  /** The account/wallet address to which these preferences belong (normalized lowercase or 'anonymous') */
  account: string;
  /** Monotonically increasing schema/data version for conflict detection */
  version: number;
  /** Unix timestamp in milliseconds of the last modification */
  updatedAt: number;
  /** Preset intensity for signal-to-noise control */
  intensity: NotificationIntensity;
  /** Granular category toggles */
  categories: CategoryPreferences;
  /** Delivery channel toggles */
  channels: ChannelPreferences;
  /** Quiet hours configuration */
  quietHours: QuietHoursPreference;
  /** Specific feature alert flags */
  disputeAlerts: boolean;
  oracleDelayAlerts: boolean;
  priceMovementAlerts: boolean;
  weeklyDigest: boolean;
  showNetPayouts: boolean;
}

export interface OfflinePreferenceMutation {
  /** Unique mutation ID for idempotency and deduplication */
  id: string;
  /** Target account address */
  account: string;
  /** Partial updates to apply */
  changes: Partial<NotificationPreferences>;
  /** Timestamp when the mutation was recorded offline */
  timestamp: number;
  /** Local version at the time of mutation */
  version: number;
}

export interface ServerPreferencePayload {
  account: string;
  preferences: NotificationPreferences;
  version: number;
  updatedAt: number;
}

export interface ReconciliationResult {
  preferences: NotificationPreferences;
  resolvedMutationIds: string[];
  hasConflicts: boolean;
  appliedChangesCount: number;
}

export interface NotificationFilterDecision {
  allowed: boolean;
  reason?:
    | "allowed"
    | "account_mismatch"
    | "category_disabled"
    | "channel_disabled"
    | "intensity_filtered"
    | "quiet_hours_active"
    | "feature_alert_disabled";
}
