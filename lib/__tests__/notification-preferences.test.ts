/**
 * Tests for deterministic notification preferences library logic.
 */

import {
  DEFAULT_ACCOUNT,
  DEFAULT_CATEGORY_PREFERENCES,
  DEFAULT_CHANNEL_PREFERENCES,
  EXPLICIT_DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeAccount,
  getDefaultNotificationPreferences,
  normalizeNotificationPreferences,
  clonePreferences,
  arePreferencesEqual,
  mergePreferences,
  enqueueOfflineMutation,
  applyOfflineMutations,
  reconcilePreferences,
  shouldDeliverNotification,
} from "../notification-preferences";
import {
  NotificationPreferences,
  OfflinePreferenceMutation,
} from "@/types/notification-preferences";

describe("Deterministic Notification Preferences Library", () => {
  describe("normalizeAccount", () => {
    it("returns default account for null, undefined, or empty strings", () => {
      expect(normalizeAccount(null)).toBe(DEFAULT_ACCOUNT);
      expect(normalizeAccount(undefined)).toBe(DEFAULT_ACCOUNT);
      expect(normalizeAccount("")).toBe(DEFAULT_ACCOUNT);
      expect(normalizeAccount("   ")).toBe(DEFAULT_ACCOUNT);
    });

    it("normalizes case and trims whitespace", () => {
      expect(normalizeAccount("  0xABCDEF123456  ")).toBe("0xabcdef123456");
      expect(normalizeAccount("GA1234567890BCDEF")).toBe("ga1234567890bcdef");
    });
  });

  describe("getDefaultNotificationPreferences", () => {
    it("returns complete, explicit defaults for any account", () => {
      const prefs = getDefaultNotificationPreferences("0xuser1");
      expect(prefs.account).toBe("0xuser1");
      expect(prefs.version).toBe(1);
      expect(prefs.intensity).toBe("important");
      expect(prefs.categories).toEqual(DEFAULT_CATEGORY_PREFERENCES);
      expect(prefs.channels).toEqual(DEFAULT_CHANNEL_PREFERENCES);
      expect(prefs.disputeAlerts).toBe(true);
      expect(prefs.oracleDelayAlerts).toBe(true);
      expect(prefs.priceMovementAlerts).toBe(false);
      expect(prefs.weeklyDigest).toBe(true);
      expect(prefs.showNetPayouts).toBe(true);
    });

    it("returns fresh object instances that do not mutate defaults", () => {
      const prefs1 = getDefaultNotificationPreferences("acc1");
      const prefs2 = getDefaultNotificationPreferences("acc2");
      prefs1.categories.market = false;
      expect(prefs2.categories.market).toBe(true);
      expect(EXPLICIT_DEFAULT_NOTIFICATION_PREFERENCES.categories.market).toBe(true);
    });
  });

  describe("normalizeNotificationPreferences", () => {
    it("safely fills missing or corrupt properties with explicit defaults", () => {
      const partial = {
        account: "0xTest",
        categories: { market: false },
        intensity: "balanced",
      };
      const normalized = normalizeNotificationPreferences(partial);
      expect(normalized.account).toBe("0xtest");
      expect(normalized.intensity).toBe("balanced");
      expect(normalized.categories.market).toBe(false);
      expect(normalized.categories.settlement).toBe(true); // default filled
      expect(normalized.channels.inApp).toBe(true); // default filled
      expect(normalized.disputeAlerts).toBe(true); // default filled
    });

    it("handles non-object inputs gracefully", () => {
      expect(normalizeNotificationPreferences(null)).toEqual(
        expect.objectContaining({ account: DEFAULT_ACCOUNT, version: 1 })
      );
      expect(normalizeNotificationPreferences("invalid")).toEqual(
        expect.objectContaining({ account: DEFAULT_ACCOUNT, version: 1 })
      );
    });
  });

  describe("arePreferencesEqual and clonePreferences", () => {
    it("accurately detects identical and divergent preferences", () => {
      const p1 = getDefaultNotificationPreferences("user1");
      const p2 = getDefaultNotificationPreferences("user1");
      expect(arePreferencesEqual(p1, p2)).toBe(true);

      const p3 = clonePreferences(p1);
      p3.categories.wallet = false;
      expect(arePreferencesEqual(p1, p3)).toBe(false);
    });
  });

  describe("mergePreferences", () => {
    it("increments version and updates timestamp on mutation", () => {
      const base = getDefaultNotificationPreferences("user1");
      const updated = mergePreferences(base, {
        intensity: "everything",
        categories: { ...base.categories, priceMovementAlerts: false as any, market: false },
      });

      expect(updated.version).toBe(base.version + 1);
      expect(updated.intensity).toBe("everything");
      expect(updated.categories.market).toBe(false);
      expect(updated.categories.settlement).toBe(true);
    });
  });

  describe("Offline Mutation Queue & Reconciliation", () => {
    it("enqueues mutations idempotently without duplicate IDs", () => {
      let queue: OfflinePreferenceMutation[] = [];
      const mutation1: OfflinePreferenceMutation = {
        id: "mut-1",
        account: "0xAlice",
        changes: { intensity: "everything" },
        timestamp: 1000,
        version: 2,
      };
      const mutation1Updated: OfflinePreferenceMutation = {
        id: "mut-1",
        account: "0xAlice",
        changes: { intensity: "balanced" },
        timestamp: 1100,
        version: 2,
      };

      queue = enqueueOfflineMutation(queue, mutation1);
      expect(queue).toHaveLength(1);
      expect(queue[0].changes.intensity).toBe("everything");

      // Re-enqueuing same ID updates in place without duplicating
      queue = enqueueOfflineMutation(queue, mutation1Updated);
      expect(queue).toHaveLength(1);
      expect(queue[0].changes.intensity).toBe("balanced");
    });

    it("applies offline mutations sequentially in timestamp order", () => {
      const base = getDefaultNotificationPreferences("0xAlice");
      const mutations: OfflinePreferenceMutation[] = [
        {
          id: "mut-2",
          account: "0xAlice",
          changes: { categories: { ...base.categories, wallet: false } },
          timestamp: 2000,
          version: 3,
        },
        {
          id: "mut-1",
          account: "0xAlice",
          changes: { intensity: "balanced" },
          timestamp: 1000,
          version: 2,
        },
      ];

      const result = applyOfflineMutations(base, mutations);
      expect(result.intensity).toBe("balanced");
      expect(result.categories.wallet).toBe(false);
      expect(result.account).toBe("0xalice");
    });

    it("reconciles server state and client offline mutations deterministically (Conflict Resolution)", () => {
      const clientBase = {
        ...getDefaultNotificationPreferences("0xAlice"),
        version: 1,
        updatedAt: 1000,
      };

      // Server was updated remotely at timestamp 1500 to change intensity to 'balanced'
      const serverState: NotificationPreferences = {
        ...clientBase,
        version: 2,
        updatedAt: 1500,
        intensity: "balanced",
      };

      // Client has an offline mutation recorded at timestamp 2000 to disable wallet alerts
      const offlineMutations: OfflinePreferenceMutation[] = [
        {
          id: "mut-offline-1",
          account: "0xAlice",
          changes: { categories: { ...clientBase.categories, wallet: false } },
          timestamp: 2000,
          version: 3,
        },
      ];

      const reconciliation = reconcilePreferences(clientBase, serverState, offlineMutations);

      // Reconciled result combines server updates and newer client offline mutations
      expect(reconciliation.preferences.intensity).toBe("balanced"); // from server
      expect(reconciliation.preferences.categories.wallet).toBe(false); // from offline mutation
      expect(reconciliation.hasConflicts).toBe(true);
      expect(reconciliation.resolvedMutationIds).toContain("mut-offline-1");
      expect(reconciliation.preferences.version).toBeGreaterThanOrEqual(3);
    });

    it("does not overwrite newer server changes with stale offline mutations", () => {
      const clientBase = {
        ...getDefaultNotificationPreferences("0xAlice"),
        version: 1,
        updatedAt: 1000,
      };

      // Stale mutation recorded offline at timestamp 1100
      const staleMutation: OfflinePreferenceMutation = {
        id: "mut-stale",
        account: "0xAlice",
        changes: { intensity: "everything" },
        timestamp: 1100,
        version: 1,
      };

      // Server was updated at timestamp 2500 to 'important'
      const serverState: NotificationPreferences = {
        ...clientBase,
        version: 5,
        updatedAt: 2500,
        intensity: "important",
      };

      const reconciliation = reconcilePreferences(clientBase, serverState, [staleMutation]);
      expect(reconciliation.preferences.intensity).toBe("important"); // Server wins because it is newer
      expect(reconciliation.resolvedMutationIds).toContain("mut-stale");
    });
  });

  describe("shouldDeliverNotification (Deterministic Filtering)", () => {
    const defaultPrefs = getDefaultNotificationPreferences("0xUser");

    it("allows settlement/payout notifications by default", () => {
      const decision = shouldDeliverNotification(
        { category: "payout", userId: "0xUser", title: "Claim ready" },
        defaultPrefs
      );
      expect(decision.allowed).toBe(true);
    });

    it("blocks notification if category is disabled", () => {
      const customPrefs = mergePreferences(defaultPrefs, {
        categories: { ...defaultPrefs.categories, market: false },
      });

      const decision = shouldDeliverNotification(
        { category: "market", userId: "0xUser", title: "Market closing" },
        customPrefs
      );
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe("category_disabled");
    });

    it("filters low-signal market notifications under 'important' intensity preset", () => {
      const decision = shouldDeliverNotification(
        { category: "market", userId: "0xUser", title: "Market closing" },
        defaultPrefs // intensity: 'important'
      );
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe("intensity_filtered");
    });

    it("allows market notifications when intensity is 'balanced' or 'everything'", () => {
      const balancedPrefs = mergePreferences(defaultPrefs, { intensity: "balanced" });
      const decision = shouldDeliverNotification(
        { category: "market", userId: "0xUser", title: "Market closing" },
        balancedPrefs
      );
      expect(decision.allowed).toBe(true);
    });

    it("suppresses non-critical notifications during quiet hours", () => {
      const quietPrefs = mergePreferences(defaultPrefs, {
        intensity: "everything",
        quietHours: { enabled: true, start: "00:00", end: "23:59", tz: "auto" },
      });

      const nonCritical = shouldDeliverNotification(
        { category: "market", userId: "0xUser", severity: "info" },
        quietPrefs
      );
      expect(nonCritical.allowed).toBe(false);
      expect(nonCritical.reason).toBe("quiet_hours_active");

      // Critical dispute or warning alerts still pass through quiet hours
      const critical = shouldDeliverNotification(
        { category: "dispute", userId: "0xUser", severity: "critical" },
        quietPrefs
      );
      expect(critical.allowed).toBe(true);
    });

    it("rejects notifications targeted at another account", () => {
      const decision = shouldDeliverNotification(
        { category: "settlement", userId: "0xOtherUser", title: "Settled" },
        defaultPrefs
      );
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe("account_mismatch");
    });
  });
});
