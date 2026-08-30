/**
 * notification-preferences.ts
 *
 * Deterministic notification preference management, account isolation,
 * offline mutation queueing, and conflict resolution.
 */

import {
  NotificationPreferences,
  NotificationCategoryKey,
  NotificationChannelKey,
  NotificationIntensity,
  QuietHoursPreference,
  OfflinePreferenceMutation,
  ReconciliationResult,
  NotificationFilterDecision,
  CategoryPreferences,
  ChannelPreferences,
} from "@/types/notification-preferences";
import { isQuietHoursActive } from "@/lib/quiet-hours";

export const DEFAULT_ACCOUNT = "anonymous";
export const NOTIFICATION_PREFERENCES_STORAGE_KEY = "predictify_notification_preferences_v1";
export const NOTIFICATION_PREFERENCES_EVENT = "predictify:notification-preferences-changed";

export const DEFAULT_CATEGORY_PREFERENCES: Readonly<CategoryPreferences> = Object.freeze({
  settlement: true,
  market: true,
  wallet: true,
  dispute: true,
  payout: true,
  system: true,
  account: true,
});

export const DEFAULT_CHANNEL_PREFERENCES: Readonly<ChannelPreferences> = Object.freeze({
  inApp: true,
  email: false,
  push: false,
});

export const DEFAULT_QUIET_HOURS_PREFERENCE: Readonly<QuietHoursPreference> = Object.freeze({
  enabled: false,
  start: "22:00",
  end: "08:00",
  tz: "auto",
});

export const EXPLICIT_DEFAULT_NOTIFICATION_PREFERENCES: Readonly<NotificationPreferences> = Object.freeze({
  account: DEFAULT_ACCOUNT,
  version: 1,
  updatedAt: 0,
  intensity: "important" as NotificationIntensity,
  categories: { ...DEFAULT_CATEGORY_PREFERENCES },
  channels: { ...DEFAULT_CHANNEL_PREFERENCES },
  quietHours: { ...DEFAULT_QUIET_HOURS_PREFERENCE },
  disputeAlerts: true,
  oracleDelayAlerts: true,
  priceMovementAlerts: false,
  weeklyDigest: true,
  showNetPayouts: true,
});

/**
 * Normalizes account identifier: lowercase, trimmed, with 'anonymous' as fallback.
 */
export function normalizeAccount(account?: string | null): string {
  if (!account || typeof account !== "string") {
    return DEFAULT_ACCOUNT;
  }
  const trimmed = account.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : DEFAULT_ACCOUNT;
}

/**
 * Produces an explicit default NotificationPreferences record for an account.
 */
export function getDefaultNotificationPreferences(account?: string | null): NotificationPreferences {
  const normAccount = normalizeAccount(account);
  return {
    account: normAccount,
    version: 1,
    updatedAt: Date.now(),
    intensity: "important",
    categories: { ...DEFAULT_CATEGORY_PREFERENCES },
    channels: { ...DEFAULT_CHANNEL_PREFERENCES },
    quietHours: { ...DEFAULT_QUIET_HOURS_PREFERENCE },
    disputeAlerts: true,
    oracleDelayAlerts: true,
    priceMovementAlerts: false,
    weeklyDigest: true,
    showNetPayouts: true,
  };
}

/**
 * Deep clones a preferences object.
 */
export function clonePreferences(prefs: NotificationPreferences): NotificationPreferences {
  return {
    ...prefs,
    categories: { ...prefs.categories },
    channels: { ...prefs.channels },
    quietHours: { ...prefs.quietHours },
  };
}

/**
 * Defensively validates and normalizes an untrusted or partially populated preferences object.
 */
export function normalizeNotificationPreferences(
  raw: unknown,
  fallbackAccount?: string | null
): NotificationPreferences {
  const targetAccount = normalizeAccount(
    raw && typeof raw === "object" && "account" in raw
      ? (raw as { account?: unknown }).account as string
      : fallbackAccount
  );

  const defaults = getDefaultNotificationPreferences(targetAccount);
  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const obj = raw as Record<string, unknown>;

  // Normalize intensity
  let intensity: NotificationIntensity = defaults.intensity;
  if (
    obj.intensity === "important" ||
    obj.intensity === "balanced" ||
    obj.intensity === "everything"
  ) {
    intensity = obj.intensity;
  }

  // Normalize categories
  const categories: CategoryPreferences = { ...DEFAULT_CATEGORY_PREFERENCES };
  if (obj.categories && typeof obj.categories === "object") {
    const rawCat = obj.categories as Record<string, unknown>;
    for (const key of Object.keys(DEFAULT_CATEGORY_PREFERENCES) as NotificationCategoryKey[]) {
      if (typeof rawCat[key] === "boolean") {
        categories[key] = rawCat[key] as boolean;
      }
    }
  }

  // Normalize channels
  const channels: ChannelPreferences = { ...DEFAULT_CHANNEL_PREFERENCES };
  if (obj.channels && typeof obj.channels === "object") {
    const rawChan = obj.channels as Record<string, unknown>;
    for (const key of Object.keys(DEFAULT_CHANNEL_PREFERENCES) as NotificationChannelKey[]) {
      if (typeof rawChan[key] === "boolean") {
        channels[key] = rawChan[key] as boolean;
      }
    }
  }

  // Normalize quiet hours
  const quietHours: QuietHoursPreference = { ...DEFAULT_QUIET_HOURS_PREFERENCE };
  if (obj.quietHours && typeof obj.quietHours === "object") {
    const rawQ = obj.quietHours as Record<string, unknown>;
    if (typeof rawQ.enabled === "boolean") quietHours.enabled = rawQ.enabled;
    if (typeof rawQ.start === "string" && rawQ.start.length > 0) quietHours.start = rawQ.start;
    if (typeof rawQ.end === "string" && rawQ.end.length > 0) quietHours.end = rawQ.end;
    if (typeof rawQ.tz === "string" && rawQ.tz.length > 0) quietHours.tz = rawQ.tz;
  }

  const version = typeof obj.version === "number" && Number.isFinite(obj.version) && obj.version > 0
    ? obj.version
    : 1;

  const updatedAt = typeof obj.updatedAt === "number" && Number.isFinite(obj.updatedAt)
    ? obj.updatedAt
    : Date.now();

  return {
    account: targetAccount,
    version,
    updatedAt,
    intensity,
    categories,
    channels,
    quietHours,
    disputeAlerts: typeof obj.disputeAlerts === "boolean" ? obj.disputeAlerts : defaults.disputeAlerts,
    oracleDelayAlerts: typeof obj.oracleDelayAlerts === "boolean" ? obj.oracleDelayAlerts : defaults.oracleDelayAlerts,
    priceMovementAlerts: typeof obj.priceMovementAlerts === "boolean" ? obj.priceMovementAlerts : defaults.priceMovementAlerts,
    weeklyDigest: typeof obj.weeklyDigest === "boolean" ? obj.weeklyDigest : defaults.weeklyDigest,
    showNetPayouts: typeof obj.showNetPayouts === "boolean" ? obj.showNetPayouts : defaults.showNetPayouts,
  };
}

/**
 * Checks equality between two NotificationPreferences objects.
 */
export function arePreferencesEqual(
  a: NotificationPreferences,
  b: NotificationPreferences
): boolean {
  if (a.account !== b.account) return false;
  if (a.intensity !== b.intensity) return false;
  if (a.disputeAlerts !== b.disputeAlerts) return false;
  if (a.oracleDelayAlerts !== b.oracleDelayAlerts) return false;
  if (a.priceMovementAlerts !== b.priceMovementAlerts) return false;
  if (a.weeklyDigest !== b.weeklyDigest) return false;
  if (a.showNetPayouts !== b.showNetPayouts) return false;

  for (const k of Object.keys(DEFAULT_CATEGORY_PREFERENCES) as NotificationCategoryKey[]) {
    if (a.categories[k] !== b.categories[k]) return false;
  }

  for (const k of Object.keys(DEFAULT_CHANNEL_PREFERENCES) as NotificationChannelKey[]) {
    if (a.channels[k] !== b.channels[k]) return false;
  }

  if (
    a.quietHours.enabled !== b.quietHours.enabled ||
    a.quietHours.start !== b.quietHours.start ||
    a.quietHours.end !== b.quietHours.end ||
    a.quietHours.tz !== b.quietHours.tz
  ) {
    return false;
  }

  return true;
}

/**
 * Applies partial changes to a base preferences object and bumps the updatedAt & version.
 */
export function mergePreferences(
  base: NotificationPreferences,
  changes: Partial<Omit<NotificationPreferences, "account">>
): NotificationPreferences {
  const cloned = clonePreferences(base);

  if (changes.intensity) cloned.intensity = changes.intensity;
  if (changes.categories) {
    cloned.categories = { ...cloned.categories, ...changes.categories };
  }
  if (changes.channels) {
    cloned.channels = { ...cloned.channels, ...changes.channels };
  }
  if (changes.quietHours) {
    cloned.quietHours = { ...cloned.quietHours, ...changes.quietHours };
  }
  if (typeof changes.disputeAlerts === "boolean") cloned.disputeAlerts = changes.disputeAlerts;
  if (typeof changes.oracleDelayAlerts === "boolean") cloned.oracleDelayAlerts = changes.oracleDelayAlerts;
  if (typeof changes.priceMovementAlerts === "boolean") cloned.priceMovementAlerts = changes.priceMovementAlerts;
  if (typeof changes.weeklyDigest === "boolean") cloned.weeklyDigest = changes.weeklyDigest;
  if (typeof changes.showNetPayouts === "boolean") cloned.showNetPayouts = changes.showNetPayouts;

  cloned.version = (base.version || 1) + 1;
  cloned.updatedAt = typeof changes.updatedAt === "number" ? changes.updatedAt : Date.now();

  return cloned;
}

/**
 * Enqueues an offline mutation idempotently without duplicate IDs.
 */
export function enqueueOfflineMutation(
  queue: OfflinePreferenceMutation[],
  mutation: OfflinePreferenceMutation
): OfflinePreferenceMutation[] {
  const normAccount = normalizeAccount(mutation.account);
  const sanitizedMutation: OfflinePreferenceMutation = {
    ...mutation,
    account: normAccount,
  };

  const existingIndex = queue.findIndex((m) => m.id === sanitizedMutation.id);
  if (existingIndex >= 0) {
    const nextQueue = [...queue];
    nextQueue[existingIndex] = sanitizedMutation;
    return nextQueue;
  }

  return [...queue, sanitizedMutation];
}

/**
 * Deterministically applies a series of offline mutations to a base preferences object.
 */
export function applyOfflineMutations(
  base: NotificationPreferences,
  mutations: OfflinePreferenceMutation[]
): NotificationPreferences {
  const targetAccount = normalizeAccount(base.account);
  const relevantMutations = mutations
    .filter((m) => normalizeAccount(m.account) === targetAccount)
    .sort((a, b) => a.timestamp - b.timestamp);

  let current = clonePreferences(base);
  for (const mutation of relevantMutations) {
    current = mergePreferences(current, {
      ...mutation.changes,
      updatedAt: mutation.timestamp,
    });
  }

  return current;
}

/**
 * Reconciles local client preferences, server preferences, and pending offline mutations.
 * Guarantees deterministic conflict resolution with Last-Write-Wins (LWW).
 */
export function reconcilePreferences(
  clientPrefs: NotificationPreferences,
  serverPrefs: NotificationPreferences,
  offlineMutations: OfflinePreferenceMutation[] = []
): ReconciliationResult {
  const normClient = normalizeNotificationPreferences(clientPrefs);
  const normServer = normalizeNotificationPreferences(serverPrefs, normClient.account);
  const account = normClient.account;

  const relevantMutations = offlineMutations
    .filter((m) => normalizeAccount(m.account) === account)
    .sort((a, b) => a.timestamp - b.timestamp);

  const resolvedMutationIds: string[] = [];
  let hasConflicts = false;
  let appliedChangesCount = 0;

  // Base preference resolution: pick the newer base or server if versions differ
  let reconciled: NotificationPreferences;

  if (normServer.version > normClient.version || normServer.updatedAt > normClient.updatedAt) {
    hasConflicts = true;
    reconciled = clonePreferences(normServer);
  } else if (normClient.version > normServer.version || normClient.updatedAt > normServer.updatedAt) {
    reconciled = clonePreferences(normClient);
  } else {
    // Versions match; prefer server values for deterministic convergence
    reconciled = clonePreferences(normServer);
  }

  // Now apply pending offline mutations if they are newer than the resolved base timestamp
  for (const mutation of relevantMutations) {
    if (mutation.timestamp >= reconciled.updatedAt || mutation.version >= reconciled.version) {
      reconciled = mergePreferences(reconciled, {
        ...mutation.changes,
        updatedAt: Math.max(mutation.timestamp, Date.now()),
      });
      appliedChangesCount++;
    }
    resolvedMutationIds.push(mutation.id);
  }

  // Ensure account, monotonic version, and updatedAt are consistent
  reconciled.account = account;
  reconciled.version = Math.max(normClient.version, normServer.version) + (appliedChangesCount > 0 ? 1 : 0);

  return {
    preferences: reconciled,
    resolvedMutationIds,
    hasConflicts,
    appliedChangesCount,
  };
}

/**
 * Evaluates whether an incoming notification should be delivered based on account preferences.
 */
export function shouldDeliverNotification(
  notification: {
    category: string;
    userId?: string;
    account?: string;
    title?: string;
    severity?: string;
    variant?: string | null;
  },
  preferences: NotificationPreferences,
  options?: {
    now?: Date;
    channel?: NotificationChannelKey;
  }
): NotificationFilterDecision {
  const normTarget = normalizeAccount(preferences.account);
  const notifAccount = notification.account || notification.userId;

  // 1. Account scoping check (if specific account is provided)
  if (notifAccount && notifAccount !== "current-user" && normalizeAccount(notifAccount) !== normTarget) {
    return { allowed: false, reason: "account_mismatch" };
  }

  // 2. Channel check (if specified)
  const channel = options?.channel ?? "inApp";
  if (preferences.channels[channel] === false) {
    return { allowed: false, reason: "channel_disabled" };
  }

  // 3. Category mapping & toggle check
  const cat = notification.category.toLowerCase();
  let mappedCategory: NotificationCategoryKey = "system";

  if (cat === "settlement" || cat === "payout") {
    mappedCategory = preferences.categories.settlement ? "settlement" : "payout";
    if (!preferences.categories.settlement && !preferences.categories.payout) {
      return { allowed: false, reason: "category_disabled" };
    }
  } else if (cat === "market") {
    mappedCategory = "market";
    if (!preferences.categories.market) {
      return { allowed: false, reason: "category_disabled" };
    }
  } else if (cat === "wallet") {
    mappedCategory = "wallet";
    if (!preferences.categories.wallet) {
      return { allowed: false, reason: "category_disabled" };
    }
  } else if (cat === "dispute") {
    mappedCategory = "dispute";
    if (!preferences.categories.dispute || !preferences.disputeAlerts) {
      return { allowed: false, reason: "category_disabled" };
    }
  } else if (cat === "account") {
    mappedCategory = "account";
    if (!preferences.categories.account) {
      return { allowed: false, reason: "category_disabled" };
    }
  } else if (cat === "system") {
    mappedCategory = "system";
    if (!preferences.categories.system) {
      return { allowed: false, reason: "category_disabled" };
    }
  }

  // 4. Intensity level filter
  if (preferences.intensity === "important") {
    // Important intensity only allows high-signal events: settlement/payout, dispute, wallet errors/warnings, critical system
    const isHighSignal =
      mappedCategory === "settlement" ||
      mappedCategory === "payout" ||
      mappedCategory === "dispute" ||
      mappedCategory === "wallet" ||
      notification.severity === "critical" ||
      notification.severity === "warning" ||
      notification.variant === "destructive";

    if (!isHighSignal && mappedCategory === "market") {
      return { allowed: false, reason: "intensity_filtered" };
    }
  }

  // 5. Quiet Hours check
  if (preferences.quietHours.enabled) {
    const isQuiet = isQuietHoursActive(
      {
        start: preferences.quietHours.start,
        end: preferences.quietHours.end,
        tz: preferences.quietHours.tz,
      },
      options?.now ?? new Date()
    );

    if (isQuiet) {
      const isCritical =
        notification.severity === "critical" ||
        notification.severity === "warning" ||
        notification.variant === "destructive" ||
        mappedCategory === "dispute";

      if (!isCritical) {
        return { allowed: false, reason: "quiet_hours_active" };
      }
    }
  }

  return { allowed: true, reason: "allowed" };
}
