/**
 * Notification Digest Types
 * Defines the data shape for the per-user unread-notification digest
 * shown on the Dashboard (see components/dashboard/NotifDigest or
 * app/dashboard/NotifDigest.tsx).
 */

export type NotificationCategory =
  | "market"
  | "dispute"
  | "payout"
  | "system"
  | "account"

export interface NotificationItem {
  id: string
  /** Which user this notification belongs to. Used to scope per-user digests. */
  userId: string
  category: NotificationCategory
  title: string
  description?: string
  timestamp: Date
  read: boolean
  /** Optional deep link the user is taken to when the notification is opened. */
  href?: string
}

/** Shape returned by a notifications data source (hook, API, or mock). */
export interface NotificationDigestData {
  notifications: NotificationItem[]
  isLoading: boolean
  error?: string | null
}

export * from "./notification-preferences"

