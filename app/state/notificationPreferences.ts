/**
 * notificationPreferences.ts
 *
 * Scoped, deterministic notification preference store.
 * Supports per-account isolation, offline mutation queueing,
 * conflict reconciliation, and cross-tab synchronization.
 */

import { create } from "zustand";
import { persist, type StorageValue } from "zustand/middleware";
import {
  NotificationPreferences,
  NotificationCategoryKey,
  NotificationChannelKey,
  NotificationIntensity,
  OfflinePreferenceMutation,
  ServerPreferencePayload,
  ReconciliationResult,
} from "@/types/notification-preferences";
import { NotificationItem } from "@/types/notifications";
import {
  DEFAULT_ACCOUNT,
  NOTIFICATION_PREFERENCES_STORAGE_KEY,
  NOTIFICATION_PREFERENCES_EVENT,
  getDefaultNotificationPreferences,
  normalizeAccount,
  normalizeNotificationPreferences,
  mergePreferences,
  enqueueOfflineMutation as libEnqueueMutation,
  reconcilePreferences as libReconcile,
  shouldDeliverNotification,
  arePreferencesEqual,
  clonePreferences,
} from "@/lib/notification-preferences";

export interface NotificationPreferencesState {
  activeAccount: string;
  preferencesByAccount: Record<string, NotificationPreferences>;
  offlineQueue: OfflinePreferenceMutation[];
  isOnline: boolean;
  syncStatus: "idle" | "syncing" | "synced" | "error" | "offline";

  // Account management
  setActiveAccount: (account: string | null) => void;
  getPreferences: (account?: string | null) => NotificationPreferences;

  // Granular preference updates
  updatePreferences: (
    changes:
      | Partial<Omit<NotificationPreferences, "account" | "version" | "updatedAt">>
      | ((prev: NotificationPreferences) => Partial<NotificationPreferences>),
    account?: string | null
  ) => void;
  setCategoryEnabled: (
    category: NotificationCategoryKey,
    enabled: boolean,
    account?: string | null
  ) => void;
  setChannelEnabled: (
    channel: NotificationChannelKey,
    enabled: boolean,
    account?: string | null
  ) => void;
  setIntensity: (
    intensity: NotificationIntensity,
    account?: string | null
  ) => void;

  // Reset controls
  resetPreferences: (account?: string | null) => void;
  resetAllAccounts: () => void;

  // Offline queue & server reconciliation
  setOnline: (online: boolean) => void;
  enqueueOfflineMutation: (
    mutation: Omit<OfflinePreferenceMutation, "id" | "timestamp" | "version">
  ) => void;
  reconcileWithServer: (serverPayload: ServerPreferencePayload) => ReconciliationResult;
  clearOfflineQueue: (account?: string | null) => void;

  // Deterministic notification evaluation
  shouldReceiveNotification: (
    notification: Partial<NotificationItem> & { category: string; severity?: string },
    account?: string | null,
    now?: Date
  ) => boolean;
}

function parsePersistedState(
  raw: string | null
): StorageValue<NotificationPreferencesState> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.state) return null;

    const state = parsed.state;
    const rawPrefs = (state.preferencesByAccount && typeof state.preferencesByAccount === "object")
      ? state.preferencesByAccount
      : {};

    const normalizedMap: Record<string, NotificationPreferences> = {};
    for (const [accKey, rawVal] of Object.entries(rawPrefs)) {
      const normAcc = normalizeAccount(accKey);
      normalizedMap[normAcc] = normalizeNotificationPreferences(rawVal, normAcc);
    }

    const activeAccount = normalizeAccount(state.activeAccount);
    if (!normalizedMap[activeAccount]) {
      normalizedMap[activeAccount] = getDefaultNotificationPreferences(activeAccount);
    }

    const offlineQueue = Array.isArray(state.offlineQueue) ? state.offlineQueue : [];

    return {
      state: {
        activeAccount,
        preferencesByAccount: normalizedMap,
        offlineQueue,
        isOnline: typeof state.isOnline === "boolean" ? state.isOnline : true,
        syncStatus: "idle",
      } as NotificationPreferencesState,
      version: parsed.version ?? 0,
    };
  } catch {
    return null;
  }
}

export const useNotificationPreferencesStore = create<NotificationPreferencesState>()(
  persist(
    (set, get) => ({
      activeAccount: DEFAULT_ACCOUNT,
      preferencesByAccount: {
        [DEFAULT_ACCOUNT]: getDefaultNotificationPreferences(DEFAULT_ACCOUNT),
      },
      offlineQueue: [],
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      syncStatus: "idle",

      setActiveAccount: (rawAccount) => {
        const account = normalizeAccount(rawAccount);
        const current = get().preferencesByAccount[account];
        if (current) {
          set({ activeAccount: account });
        } else {
          const fresh = getDefaultNotificationPreferences(account);
          set((state) => ({
            activeAccount: account,
            preferencesByAccount: {
              ...state.preferencesByAccount,
              [account]: fresh,
            },
          }));
        }
      },

      getPreferences: (rawAccount) => {
        const account = normalizeAccount(rawAccount ?? get().activeAccount);
        const map = get().preferencesByAccount;
        if (map[account]) {
          return map[account];
        }
        return getDefaultNotificationPreferences(account);
      },

      updatePreferences: (changesOrFn, rawAccount) => {
        const account = normalizeAccount(rawAccount ?? get().activeAccount);
        const current = get().getPreferences(account);
        const diff = typeof changesOrFn === "function" ? changesOrFn(current) : changesOrFn;

        const updated = mergePreferences(current, diff);
        const isOnline = get().isOnline;

        set((state) => {
          let nextQueue = state.offlineQueue;
          if (!isOnline) {
            const mutation: OfflinePreferenceMutation = {
              id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              account,
              changes: diff,
              timestamp: updated.updatedAt,
              version: updated.version,
            };
            nextQueue = libEnqueueMutation(state.offlineQueue, mutation);
          }

          return {
            preferencesByAccount: {
              ...state.preferencesByAccount,
              [account]: updated,
            },
            offlineQueue: nextQueue,
            syncStatus: isOnline ? "synced" : "offline",
          };
        });

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(NOTIFICATION_PREFERENCES_EVENT, {
              detail: { account, preferences: updated },
            })
          );
        }
      },

      setCategoryEnabled: (category, enabled, rawAccount) => {
        const account = normalizeAccount(rawAccount ?? get().activeAccount);
        get().updatePreferences(
          (prev) => ({
            categories: {
              ...prev.categories,
              [category]: enabled,
            },
          }),
          account
        );
      },

      setChannelEnabled: (channel, enabled, rawAccount) => {
        const account = normalizeAccount(rawAccount ?? get().activeAccount);
        get().updatePreferences(
          (prev) => ({
            channels: {
              ...prev.channels,
              [channel]: enabled,
            },
          }),
          account
        );
      },

      setIntensity: (intensity, rawAccount) => {
        const account = normalizeAccount(rawAccount ?? get().activeAccount);
        get().updatePreferences({ intensity }, account);
      },

      resetPreferences: (rawAccount) => {
        const account = normalizeAccount(rawAccount ?? get().activeAccount);
        const fresh = getDefaultNotificationPreferences(account);

        set((state) => ({
          preferencesByAccount: {
            ...state.preferencesByAccount,
            [account]: fresh,
          },
          offlineQueue: state.offlineQueue.filter(
            (m) => normalizeAccount(m.account) !== account
          ),
          syncStatus: "idle",
        }));

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(NOTIFICATION_PREFERENCES_EVENT, {
              detail: { account, preferences: fresh },
            })
          );
        }
      },

      resetAllAccounts: () => {
        const fresh = getDefaultNotificationPreferences(DEFAULT_ACCOUNT);
        set({
          activeAccount: DEFAULT_ACCOUNT,
          preferencesByAccount: {
            [DEFAULT_ACCOUNT]: fresh,
          },
          offlineQueue: [],
          syncStatus: "idle",
        });
      },

      setOnline: (online) => {
        set({
          isOnline: online,
          syncStatus: online ? (get().offlineQueue.length > 0 ? "syncing" : "synced") : "offline",
        });
      },

      enqueueOfflineMutation: (mutationInput) => {
        const account = normalizeAccount(mutationInput.account);
        const mutation: OfflinePreferenceMutation = {
          id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          account,
          changes: mutationInput.changes,
          timestamp: Date.now(),
          version: get().getPreferences(account).version + 1,
        };

        set((state) => ({
          offlineQueue: libEnqueueMutation(state.offlineQueue, mutation),
          syncStatus: "offline",
        }));
      },

      reconcileWithServer: (serverPayload: ServerPreferencePayload) => {
        const account = normalizeAccount(serverPayload.account);
        const clientCurrent = get().getPreferences(account);
        const currentQueue = get().offlineQueue;

        const reconciliation = libReconcile(
          clientCurrent,
          serverPayload.preferences,
          currentQueue
        );

        const resolvedIds = new Set(reconciliation.resolvedMutationIds);
        const remainingQueue = currentQueue.filter((m) => !resolvedIds.has(m.id));

        set((state) => ({
          preferencesByAccount: {
            ...state.preferencesByAccount,
            [account]: reconciliation.preferences,
          },
          offlineQueue: remainingQueue,
          syncStatus: "synced",
        }));

        return reconciliation;
      },

      clearOfflineQueue: (rawAccount) => {
        if (!rawAccount) {
          set({ offlineQueue: [] });
          return;
        }
        const account = normalizeAccount(rawAccount);
        set((state) => ({
          offlineQueue: state.offlineQueue.filter(
            (m) => normalizeAccount(m.account) !== account
          ),
        }));
      },

      shouldReceiveNotification: (notification, rawAccount, now) => {
        const account = normalizeAccount(rawAccount ?? get().activeAccount);
        const prefs = get().getPreferences(account);
        const decision = shouldDeliverNotification(
          {
            category: notification.category,
            userId: notification.userId,
            account,
            title: notification.title,
            severity: notification.severity,
          },
          prefs,
          { now: now ?? new Date() }
        );
        return decision.allowed;
      },
    }),
    {
      name: NOTIFICATION_PREFERENCES_STORAGE_KEY,
      storage: {
        getItem: (key) => {
          try {
            return parsePersistedState(localStorage.getItem(key));
          } catch {
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch {
            // Gracefully handle storage quota or private mode issues
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key);
          } catch {
            // Fail silently
          }
        },
      },
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== "object") {
          return currentState;
        }
        const casted = persistedState as Partial<NotificationPreferencesState>;
        return {
          ...currentState,
          ...casted,
          preferencesByAccount: {
            ...currentState.preferencesByAccount,
            ...(casted.preferencesByAccount ?? {}),
          },
          offlineQueue: Array.isArray(casted.offlineQueue)
            ? casted.offlineQueue
            : currentState.offlineQueue,
        };
      },
    }
  )
);

// Cross-tab storage synchronization
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== NOTIFICATION_PREFERENCES_STORAGE_KEY) return;
    const parsed = parsePersistedState(event.newValue);
    if (!parsed) return;

    const currentStore = useNotificationPreferencesStore.getState();
    const newMap = parsed.state.preferencesByAccount;

    if (newMap && typeof newMap === "object") {
      let hasChanges = false;
      for (const [acc, prefs] of Object.entries(newMap)) {
        const currentPrefs = currentStore.preferencesByAccount[acc];
        if (!currentPrefs || !arePreferencesEqual(currentPrefs, prefs)) {
          hasChanges = true;
          break;
        }
      }

      if (hasChanges) {
        useNotificationPreferencesStore.setState({
          preferencesByAccount: {
            ...currentStore.preferencesByAccount,
            ...newMap,
          },
          offlineQueue: parsed.state.offlineQueue ?? currentStore.offlineQueue,
        });
      }
    }
  });

  // Online / offline listeners
  window.addEventListener("online", () => {
    useNotificationPreferencesStore.getState().setOnline(true);
  });
  window.addEventListener("offline", () => {
    useNotificationPreferencesStore.getState().setOnline(false);
  });
}
