"use client";

import { useEffect, useMemo, useCallback } from "react";
import {
  NotificationPreferences,
  NotificationCategoryKey,
  NotificationChannelKey,
  NotificationIntensity,
  ServerPreferencePayload,
  ReconciliationResult,
} from "@/types/notification-preferences";
import { NotificationItem } from "@/types/notifications";
import { useNotificationPreferencesStore } from "@/app/state/notificationPreferences";
import { useWalletContext } from "@/context/WalletContext";
import {
  arePreferencesEqual,
  getDefaultNotificationPreferences,
  normalizeAccount,
} from "@/lib/notification-preferences";

export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences;
  activeAccount: string;
  isOnline: boolean;
  syncStatus: "idle" | "syncing" | "synced" | "error" | "offline";
  isDefault: boolean;

  updatePreferences: (
    changes:
      | Partial<Omit<NotificationPreferences, "account" | "version" | "updatedAt">>
      | ((prev: NotificationPreferences) => Partial<NotificationPreferences>)
  ) => void;
  setCategoryEnabled: (category: NotificationCategoryKey, enabled: boolean) => void;
  setChannelEnabled: (channel: NotificationChannelKey, enabled: boolean) => void;
  setIntensity: (intensity: NotificationIntensity) => void;
  resetPreferences: () => void;
  reconcileWithServer: (payload: ServerPreferencePayload) => ReconciliationResult;
  shouldReceiveNotification: (
    notification: Partial<NotificationItem> & { category: string; severity?: string },
    now?: Date
  ) => boolean;
}

/**
 * Hook for consuming and modifying account-isolated notification preferences.
 * Automatically synchronizes with the connected wallet address.
 */
export function useNotificationPreferences(
  explicitAccount?: string | null
): UseNotificationPreferencesReturn {
  let walletAddress: string | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const wallet = useWalletContext();
    walletAddress = wallet.address;
  } catch {
    // WalletProvider may not be present in standalone tests or preview pages
  }

  const effectiveAccount = useMemo(() => {
    if (explicitAccount !== undefined) {
      return normalizeAccount(explicitAccount);
    }
    return normalizeAccount(walletAddress);
  }, [explicitAccount, walletAddress]);

  const activeAccount = useNotificationPreferencesStore((s) => s.activeAccount);
  const setActiveAccount = useNotificationPreferencesStore((s) => s.setActiveAccount);
  const preferencesByAccount = useNotificationPreferencesStore((s) => s.preferencesByAccount);
  const isOnline = useNotificationPreferencesStore((s) => s.isOnline);
  const syncStatus = useNotificationPreferencesStore((s) => s.syncStatus);
  const storeUpdatePreferences = useNotificationPreferencesStore((s) => s.updatePreferences);
  const storeSetCategoryEnabled = useNotificationPreferencesStore((s) => s.setCategoryEnabled);
  const storeSetChannelEnabled = useNotificationPreferencesStore((s) => s.setChannelEnabled);
  const storeSetIntensity = useNotificationPreferencesStore((s) => s.setIntensity);
  const storeResetPreferences = useNotificationPreferencesStore((s) => s.resetPreferences);
  const storeReconcileWithServer = useNotificationPreferencesStore((s) => s.reconcileWithServer);
  const storeShouldReceiveNotification = useNotificationPreferencesStore(
    (s) => s.shouldReceiveNotification
  );

  // Keep store's activeAccount in sync with effectiveAccount
  useEffect(() => {
    if (effectiveAccount !== activeAccount) {
      setActiveAccount(effectiveAccount);
    }
  }, [effectiveAccount, activeAccount, setActiveAccount]);

  const preferences = useMemo(() => {
    return (
      preferencesByAccount[effectiveAccount] ??
      getDefaultNotificationPreferences(effectiveAccount)
    );
  }, [preferencesByAccount, effectiveAccount]);

  const isDefault = useMemo(() => {
    const defaultPrefs = getDefaultNotificationPreferences(effectiveAccount);
    return arePreferencesEqual(preferences, defaultPrefs);
  }, [preferences, effectiveAccount]);

  const updatePreferences = useCallback(
    (
      changes:
        | Partial<Omit<NotificationPreferences, "account" | "version" | "updatedAt">>
        | ((prev: NotificationPreferences) => Partial<NotificationPreferences>)
    ) => {
      storeUpdatePreferences(changes, effectiveAccount);
    },
    [storeUpdatePreferences, effectiveAccount]
  );

  const setCategoryEnabled = useCallback(
    (category: NotificationCategoryKey, enabled: boolean) => {
      storeSetCategoryEnabled(category, enabled, effectiveAccount);
    },
    [storeSetCategoryEnabled, effectiveAccount]
  );

  const setChannelEnabled = useCallback(
    (channel: NotificationChannelKey, enabled: boolean) => {
      storeSetChannelEnabled(channel, enabled, effectiveAccount);
    },
    [storeSetChannelEnabled, effectiveAccount]
  );

  const setIntensity = useCallback(
    (intensity: NotificationIntensity) => {
      storeSetIntensity(intensity, effectiveAccount);
    },
    [storeSetIntensity, effectiveAccount]
  );

  const resetPreferences = useCallback(() => {
    storeResetPreferences(effectiveAccount);
  }, [storeResetPreferences, effectiveAccount]);

  const reconcileWithServer = useCallback(
    (payload: ServerPreferencePayload) => {
      return storeReconcileWithServer(payload);
    },
    [storeReconcileWithServer]
  );

  const shouldReceiveNotification = useCallback(
    (
      notification: Partial<NotificationItem> & { category: string; severity?: string },
      now?: Date
    ) => {
      return storeShouldReceiveNotification(notification, effectiveAccount, now);
    },
    [storeShouldReceiveNotification, effectiveAccount]
  );

  return {
    preferences,
    activeAccount: effectiveAccount,
    isOnline,
    syncStatus,
    isDefault,
    updatePreferences,
    setCategoryEnabled,
    setChannelEnabled,
    setIntensity,
    resetPreferences,
    reconcileWithServer,
    shouldReceiveNotification,
  };
}
