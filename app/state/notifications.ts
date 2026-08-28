/**
 * notifications.ts
 *
 * Client-side store for tracking and managing notifications state.
 * Consumed by both top navigation (NotifDigest on desktop) and bottom navigation (MobileBottomTabs on mobile).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NotificationItem } from "@/types/notifications";
import { generateMockNotifications } from "@/lib/notifications";

export interface NotificationsState {
  notifications: NotificationItem[];
  setNotifications: (notifications: NotificationItem[]) => void;
  upsertNotification: (notification: NotificationItem) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const CURRENT_USER_ID = "current-user";

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      notifications: generateMockNotifications(CURRENT_USER_ID),

      setNotifications: (notifications) => set({ notifications }),

      upsertNotification: (notification) =>
        set((state) => {
          const index = state.notifications.findIndex(
            (item) => item.id === notification.id
          );

          if (index === -1) {
            return { notifications: [notification, ...state.notifications] };
          }

          const notifications = [...state.notifications];
          const existing = notifications[index];

          // A replay must never turn a notification the user has read back into
          // an unread one. Other server-owned fields may still be refreshed.
          notifications[index] = {
            ...existing,
            ...notification,
            read: existing.read || notification.read,
          };

          return { notifications };
        }),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === id ? { ...item, read: true } : item
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.userId === CURRENT_USER_ID ? { ...item, read: true } : item
          ),
        })),
    }),
    {
      name: "predictify-notifications",
      storage: {
        getItem: (key) => {
          const raw = localStorage.getItem(key);
          if (!raw) return null;
          try {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.state && Array.isArray(parsed.state.notifications)) {
              parsed.state.notifications = parsed.state.notifications.map((n: any) => ({
                ...n,
                timestamp: new Date(n.timestamp),
              }));
            }
            return parsed;
          } catch {
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, JSON.stringify(value));
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
    }
  )
);
