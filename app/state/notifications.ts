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
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const CURRENT_USER_ID = "current-user";

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      notifications: generateMockNotifications(CURRENT_USER_ID),

      setNotifications: (notifications) => set({ notifications }),

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
