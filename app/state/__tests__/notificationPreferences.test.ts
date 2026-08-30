/**
 * Tests for useNotificationPreferencesStore (Zustand store).
 * Covers account isolation, account switching, explicit defaults,
 * reset functionality, offline queue, conflict reconciliation, and persistence.
 */

import { act } from "@testing-library/react";
import { useNotificationPreferencesStore } from "../notificationPreferences";
import {
  DEFAULT_ACCOUNT,
  NOTIFICATION_PREFERENCES_STORAGE_KEY,
  getDefaultNotificationPreferences,
} from "@/lib/notification-preferences";

describe("useNotificationPreferencesStore", () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => {
      useNotificationPreferencesStore.getState().resetAllAccounts();
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("Account Isolation & Switching", () => {
    it("isolates preferences between different accounts without cross-contamination", () => {
      const accountA = "0xAccountA";
      const accountB = "0xAccountB";

      // Select Account A and modify its preferences
      act(() => {
        useNotificationPreferencesStore.getState().setActiveAccount(accountA);
        useNotificationPreferencesStore.getState().setCategoryEnabled("market", false, accountA);
        useNotificationPreferencesStore.getState().setIntensity("everything", accountA);
      });

      expect(useNotificationPreferencesStore.getState().getPreferences(accountA).categories.market).toBe(false);
      expect(useNotificationPreferencesStore.getState().getPreferences(accountA).intensity).toBe("everything");

      // Switch to Account B (should receive fresh explicit defaults)
      act(() => {
        useNotificationPreferencesStore.getState().setActiveAccount(accountB);
      });

      const prefsB = useNotificationPreferencesStore.getState().getPreferences(accountB);
      expect(prefsB.account).toBe("0xaccountb");
      expect(prefsB.categories.market).toBe(true); // Account B defaults intact
      expect(prefsB.intensity).toBe("important"); // Account B defaults intact

      // Modify Account B
      act(() => {
        useNotificationPreferencesStore.getState().setCategoryEnabled("wallet", false, accountB);
      });

      // Switch back to Account A and verify A's preferences are preserved untouched
      act(() => {
        useNotificationPreferencesStore.getState().setActiveAccount(accountA);
      });

      const prefsA = useNotificationPreferencesStore.getState().getPreferences(accountA);
      expect(prefsA.categories.market).toBe(false);
      expect(prefsA.categories.wallet).toBe(true); // Account A's wallet setting was not changed by Account B
      expect(prefsA.intensity).toBe("everything");
    });
  });

  describe("Explicit Defaults & Reset", () => {
    it("provides explicit defaults for unconfigured accounts", () => {
      const prefs = useNotificationPreferencesStore.getState().getPreferences("0xNewUser");
      const defaults = getDefaultNotificationPreferences("0xNewUser");

      expect(prefs.account).toBe("0xnewuser");
      expect(prefs.intensity).toBe(defaults.intensity);
      expect(prefs.categories).toEqual(defaults.categories);
      expect(prefs.channels).toEqual(defaults.channels);
    });

    it("resets an account's preferences back to explicit defaults", () => {
      const account = "0xUserToReset";

      act(() => {
        useNotificationPreferencesStore.getState().setActiveAccount(account);
        useNotificationPreferencesStore.getState().setIntensity("everything", account);
        useNotificationPreferencesStore.getState().setCategoryEnabled("settlement", false, account);
        useNotificationPreferencesStore.getState().setChannelEnabled("email", true, account);
      });

      expect(useNotificationPreferencesStore.getState().getPreferences(account).intensity).toBe("everything");
      expect(useNotificationPreferencesStore.getState().getPreferences(account).categories.settlement).toBe(false);

      // Perform reset
      act(() => {
        useNotificationPreferencesStore.getState().resetPreferences(account);
      });

      const resetPrefs = useNotificationPreferencesStore.getState().getPreferences(account);
      const defaults = getDefaultNotificationPreferences(account);

      expect(resetPrefs.intensity).toBe("important");
      expect(resetPrefs.categories.settlement).toBe(true);
      expect(resetPrefs.channels.email).toBe(false);
      expect(resetPrefs.categories).toEqual(defaults.categories);
    });
  });

  describe("Offline Queue & Server Reconciliation", () => {
    it("records offline changes in offline queue when offline", () => {
      const account = "0xOfflineUser";

      act(() => {
        useNotificationPreferencesStore.getState().setActiveAccount(account);
        useNotificationPreferencesStore.getState().setOnline(false);
        useNotificationPreferencesStore.getState().setCategoryEnabled("market", false, account);
      });

      const state = useNotificationPreferencesStore.getState();
      expect(state.isOnline).toBe(false);
      expect(state.offlineQueue.length).toBeGreaterThan(0);
      expect(state.offlineQueue[0].account).toBe("0xofflineuser");
      expect(state.offlineQueue[0].changes).toEqual(
        expect.objectContaining({
          categories: expect.objectContaining({ market: false }),
        })
      );
    });

    it("reconciles server state and flushes resolved offline mutations", () => {
      const account = "0xSyncUser";

      // Setup offline queue mutation
      act(() => {
        useNotificationPreferencesStore.getState().setActiveAccount(account);
        useNotificationPreferencesStore.getState().setOnline(false);
        useNotificationPreferencesStore.getState().setCategoryEnabled("dispute", false, account);
      });

      expect(useNotificationPreferencesStore.getState().offlineQueue).toHaveLength(1);

      // Server returns remote state
      const serverPrefs = {
        ...getDefaultNotificationPreferences(account),
        version: 10,
        updatedAt: Date.now() + 5000,
        intensity: "balanced" as const,
      };

      act(() => {
        useNotificationPreferencesStore.getState().reconcileWithServer({
          account,
          preferences: serverPrefs,
          version: 10,
          updatedAt: Date.now() + 5000,
        });
      });

      const updatedPrefs = useNotificationPreferencesStore.getState().getPreferences(account);
      expect(updatedPrefs.intensity).toBe("balanced");
      // Offline queue should now be empty after reconciliation
      expect(useNotificationPreferencesStore.getState().offlineQueue).toHaveLength(0);
    });
  });

  describe("Persistence and Storage", () => {
    it("persists preferences across storage reloads", () => {
      const account = "0xPersistUser";

      act(() => {
        useNotificationPreferencesStore.getState().setActiveAccount(account);
        useNotificationPreferencesStore.getState().setIntensity("everything", account);
      });

      const storedRaw = localStorage.getItem(NOTIFICATION_PREFERENCES_STORAGE_KEY);
      expect(storedRaw).toBeTruthy();
      const parsed = JSON.parse(storedRaw ?? "{}");
      expect(parsed.state.preferencesByAccount["0xpersistuser"].intensity).toBe("everything");
    });
  });
});
