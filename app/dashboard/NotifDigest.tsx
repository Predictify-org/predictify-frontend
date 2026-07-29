"use client"

import { useMemo, useState } from "react"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Timestamp } from "@/components/ui/Timestamp"
import { LiveRegion } from "@/components/ui/live-region"
import { NOTIFICATION_CATEGORY_CONFIG, sortNotifications } from "@/lib/notifications"
import { NotificationItem } from "@/types/notifications"

interface NotifDigestProps {
  /** Notifications for the current user. Defaults to an empty digest. */
  notifications?: NotificationItem[]
  /** Called when a single notification is opened/marked as read. */
  onMarkAsRead?: (id: string) => void
  /** Called when the user marks every notification as read. */
  onMarkAllAsRead?: () => void
  /** Maximum number of notifications rendered before the list scrolls. */
  maxVisible?: number
}

const MAX_BADGE_COUNT = 9

/**
 * Per-user digest of unread notifications, surfaced from the Dashboard
 * header. Shows an unread count badge on a bell trigger; opening the
 * popover lists the most recent notifications and lets the user mark
 * one or all of them as read.
 *
 * Accessibility: the trigger's accessible name includes the live unread
 * count, and an `aria-live="polite"` region (via `LiveRegion`) announces
 * count changes so screen-reader users learn about new/cleared
 * notifications without needing to open the panel (WCAG 2.1 SC 4.1.3).
 * The panel itself is a Radix Popover, which provides focus trapping,
 * Escape-to-close, and roving keyboard support out of the box.
 */
export function NotifDigest({
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  maxVisible = 8,
}: NotifDigestProps) {
  const [open, setOpen] = useState(false)

  const sorted = useMemo(() => sortNotifications(notifications), [notifications])
  const unread = useMemo(() => sorted.filter((item) => !item.read), [sorted])
  const visible = sorted.slice(0, maxVisible)

  const unreadCount = unread.length
  const badgeLabel =
    unreadCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(unreadCount)
  const triggerLabel =
    unreadCount === 0
      ? "Notifications, no unread"
      : `Notifications, ${unreadCount} unread`

  return (
    <>
      <LiveRegion
        message={
          unreadCount === 0
            ? "No unread notifications"
            : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
        }
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            aria-label={triggerLabel}
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {unreadCount > 0 && (
              <Badge
                variant="danger"
                size="sm"
                aria-hidden="true"
                className="absolute -right-1 -top-1 min-w-[1.1rem] justify-center px-1 py-0 tabular-nums"
              >
                {badgeLabel}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto gap-1 px-2 py-1 text-xs"
              onClick={onMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Mark all read
            </Button>
          </div>
          <Separator />
          {visible.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            <ScrollArea className="max-h-80">
              <ul className="divide-y">
                {visible.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onMarkAsRead?.(item.id)}
                       className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-current={item.read ? undefined : "true"}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-medium leading-tight">
                          {!item.read && (
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                              aria-hidden="true"
                            />
                          )}
                          {item.title}
                        </span>
                        <Badge
                          variant={NOTIFICATION_CATEGORY_CONFIG[item.category].badgeVariant}
                          size="sm"
                          className="shrink-0"
                        >
                          {NOTIFICATION_CATEGORY_CONFIG[item.category].label}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <Timestamp
                        date={item.timestamp}
                        className="text-xs text-muted-foreground"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </PopoverContent>
      </Popover>
    </>
  )
}
