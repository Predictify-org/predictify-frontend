/**
 * Notification Digest Utilities
 * Sorting, filtering, and mock-data helpers for the per-user notification
 * digest shown on the Dashboard.
 */

import { NotificationCategory, NotificationItem } from "@/types/notifications"

/** Display config for each notification category (icon name + accessible label). */
export const NOTIFICATION_CATEGORY_CONFIG: Record<
  NotificationCategory,
  { label: string; badgeVariant: "info" | "warning" | "success" | "neutral" }
> = {
  market: { label: "Market", badgeVariant: "info" },
  dispute: { label: "Dispute", badgeVariant: "warning" },
  payout: { label: "Payout", badgeVariant: "success" },
  system: { label: "System", badgeVariant: "neutral" },
  account: { label: "Account", badgeVariant: "neutral" },
}

/** Sorts notifications newest-first, unread items ahead of read ones at equal time. */
export function sortNotifications(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort((a, b) => {
    const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    if (diff !== 0) return diff
    return Number(a.read) - Number(b.read)
  })
}

/** Returns only the unread notifications for a given user, newest first. */
export function getUnreadForUser(
  items: NotificationItem[],
  userId: string
): NotificationItem[] {
  return sortNotifications(
    items.filter((item) => item.userId === userId && !item.read)
  )
}

/**
 * Generates deterministic mock notifications for local development and
 * Storybook-style previews. Replace with a real API/hook once the backend
 * endpoint is available (see docs/notification-digest.md).
 */
export function generateMockNotifications(userId: string): NotificationItem[] {
  const now = Date.now()
  const minutesAgo = (mins: number) => new Date(now - mins * 60_000)

  return [
    {
      id: "notif-1",
      userId,
      category: "payout",
      title: "Winnings claimed",
      description: "Your payout of $128.50 for 'ETH weekly close' has settled.",
      timestamp: minutesAgo(6),
      read: false,
      href: "/mypredictions",
    },
    {
      id: "notif-2",
      userId,
      category: "dispute",
      title: "Dispute update",
      description: "A dispute on 'Finals game seven' moved to review.",
      timestamp: minutesAgo(42),
      read: false,
      href: "/disputes",
    },
    {
      id: "notif-3",
      userId,
      category: "market",
      title: "Market closing soon",
      description: "'AI safety bill' closes for new predictions in 1 hour.",
      timestamp: minutesAgo(90),
      read: false,
      href: "/events",
    },
    {
      id: "notif-4",
      userId,
      category: "system",
      title: "Scheduled maintenance",
      description: "Brief downtime is planned for this weekend.",
      timestamp: minutesAgo(300),
      read: true,
    },
    {
      id: "notif-5",
      userId,
      category: "account",
      title: "Verification approved",
      description: "Your identity verification was approved.",
      timestamp: minutesAgo(1440),
      read: true,
    },
  ]
}
