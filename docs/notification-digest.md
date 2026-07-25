# Notification Digest

`app/dashboard/NotifDigest.tsx` renders a per-user digest of unread
notifications from the Dashboard header, next to `RefreshIndicator`.

## Data shape

Notifications follow `NotificationItem` in `types/notifications.ts`:

```ts
interface NotificationItem {
  id: string
  userId: string
  category: "market" | "dispute" | "payout" | "system" | "account"
  title: string
  description?: string
  timestamp: Date
  read: boolean
  href?: string
}
```

`lib/notifications.ts` exports:

- `sortNotifications(items)` — newest first, unread ahead of read at equal timestamps.
- `getUnreadForUser(items, userId)` — filters + sorts unread items for one user.
- `generateMockNotifications(userId)` — deterministic mock data for local dev.
- `NOTIFICATION_CATEGORY_CONFIG` — label + badge variant per category.

There is currently no backend endpoint for notifications. The Dashboard page
(`app/(dashboard)/dashboard/page.tsx`) seeds local component state from
`generateMockNotifications` and passes `onMarkAsRead` / `onMarkAllAsRead`
callbacks into `NotifDigest`. Swap that state for a real API/hook by
replacing the `useState` initializer and the two handlers — the component's
props contract does not need to change.

## Component behavior

- The bell trigger's accessible name reports the live unread count (e.g.
  "Notifications, 3 unread"), and a badge shows the count, capped at `9+`.
- Opening the trigger reveals a `Popover` (Radix) listing notifications,
  newest first, each with a category badge and a relative `Timestamp`.
- Clicking a notification calls `onMarkAsRead(id)`; "Mark all read" calls
  `onMarkAllAsRead()` and is disabled once nothing is unread.
- An empty digest shows "You're all caught up." instead of an empty list.

## Accessibility (WCAG 2.1 AA)

- An `aria-live="polite"` region (`components/ui/live-region.tsx`) announces
  unread-count changes so screen-reader users don't need to open the panel.
- The popover is a Radix `Popover`, which provides focus trapping, Escape-to-close,
  and a returns-focus-to-trigger behavior out of the box.
- Unread items get a visual dot indicator in addition to the text/badge
  content, so status isn't conveyed by color alone.
- All interactive elements are real `<button>`s with visible focus states
  driven by the existing `focus-visible` design tokens.

## Styling

Uses existing design tokens only (`bg-popover`, `text-popover-foreground`,
`text-muted-foreground`, `bg-accent`, badge `variant` taxonomy), so dark mode
is handled automatically — no new colors were introduced.
