/**
 * notifications.ts
 *
 * Client-side store for tracking and managing notifications state.
 * Consumed by both top navigation (NotifDigest on desktop) and bottom navigation (MobileBottomTabs on mobile).
 */

import { create } from "zustand";
import { persist, type StorageValue } from "zustand/middleware";
import { NotificationItem } from "@/types/notifications";
import { generateMockNotifications } from "@/lib/notifications";

export interface NotificationsState {
  notifications: NotificationItem[];
  setNotifications: (notifications: NotificationItem[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const CURRENT_USER_ID = "current-user";
const NOTIFICATIONS_STORAGE_KEY = "predictify-notifications";
const STORAGE_LISTENER_FLAG = "__predictifyNotificationsStorageListenerAttached";

declare global {
  interface Window {
    __predictifyNotificationsStorageListenerAttached?: boolean;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Read flags are monotonic: a stale tab can never turn a notification back
 * into unread after another tab has marked it as read.
 */
function getReadNotificationIds(value: unknown): Set<string> | null {
  if (!isRecord(value) || !isRecord(value.state)) return null;

  const notifications = value.state.notifications;
  if (!Array.isArray(notifications)) return null;

  return new Set(
    notifications.flatMap((notification) => {
      if (!isRecord(notification) || typeof notification.id !== "string") {
        return [];
      }

      return notification.read === true ? [notification.id] : [];
    })
  );
}

function mergeReadState(
  notifications: NotificationItem[],
  readNotificationIds: Set<string> | null
): NotificationItem[] {
  if (!readNotificationIds?.size) return notifications;

  let changed = false;
  const nextNotifications = notifications.map((notification) => {
    if (!notification.read && readNotificationIds.has(notification.id)) {
      changed = true;
      return { ...notification, read: true };
    }

    return notification;
  });

  return changed ? nextNotifications : notifications;
}

function reviveNotificationTimestamps(value: unknown): void {
  if (!isRecord(value) || !isRecord(value.state)) return;

  const notifications = value.state.notifications;
  if (!Array.isArray(notifications)) return;

  value.state.notifications = notifications.map((notification) => {
    if (!isRecord(notification)) return notification;

    return {
      ...notification,
      timestamp: new Date(notification.timestamp as string | number | Date),
    };
  });
}

function parsePersistedNotifications(
  raw: string | null
): StorageValue<NotificationsState> | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    reviveNotificationTimestamps(parsed);
    return getReadNotificationIds(parsed)
      ? (parsed as StorageValue<NotificationsState>)
      : null;
  } catch {
    return null;
  }
}

function getPersistedNotifications(
  key: string
): StorageValue<NotificationsState> | null {
  try {
    return parsePersistedNotifications(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function mergeStoredReadState(
  key: string,
  value: StorageValue<NotificationsState>
): StorageValue<NotificationsState> {
  return {
    ...value,
    state: {
      ...value.state,
      notifications: mergeReadState(
        value.state.notifications,
        getReadNotificationIds(getPersistedNotifications(key))
      ),
    },
  };
}

function mergeKnownReadState(
  incomingNotifications: NotificationItem[],
  currentNotifications: NotificationItem[]
): NotificationItem[] {
  return mergeReadState(
    mergeReadState(
      incomingNotifications,
      getReadNotificationIds({
        state: { notifications: currentNotifications },
      })
    ),
    getReadNotificationIds(getPersistedNotifications(NOTIFICATIONS_STORAGE_KEY))
  );
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: generateMockNotifications(CURRENT_USER_ID),

      setNotifications: (notifications) =>
        set((state) => ({
          notifications: mergeKnownReadState(notifications, state.notifications),
        })),

      markAsRead: (id) => {
        const notifications = get().notifications;
        if (!notifications.some((item) => item.id === id && !item.read)) return;

        set({
          notifications: notifications.map((item) =>
            item.id === id ? { ...item, read: true } : item
          ),
        });
      },

      markAllAsRead: () => {
        const notifications = get().notifications;
        if (
          !notifications.some(
            (item) => item.userId === CURRENT_USER_ID && !item.read
          )
        ) {
          return;
        }

        set({
          notifications: notifications.map((item) =>
            item.userId === CURRENT_USER_ID ? { ...item, read: true } : item
          ),
        });
      },
    }),
    {
      name: NOTIFICATIONS_STORAGE_KEY,
      storage: {
        getItem: (key) => {
          return getPersistedNotifications(key);
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(
              key,
              JSON.stringify(mergeStoredReadState(key, value))
            );
          } catch {
            // Fail silently if localStorage is blocked
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
      merge: (persistedState, currentState) => ({
        ...currentState,
        notifications: mergeReadState(
          currentState.notifications,
          getReadNotificationIds(persistedState)
        ),
      }),
    }
  )
);

if (typeof window !== "undefined" && !window[STORAGE_LISTENER_FLAG]) {
  window[STORAGE_LISTENER_FLAG] = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== NOTIFICATIONS_STORAGE_KEY) return;

    const readNotificationIds = getReadNotificationIds(
      parsePersistedNotifications(event.newValue)
    );
    const currentState = useNotificationsStore.getState();
    const notifications = mergeReadState(
      currentState.notifications,
      readNotificationIds
    );

    if (notifications !== currentState.notifications) {
      useNotificationsStore.setState({ notifications });
    }
  });
}
