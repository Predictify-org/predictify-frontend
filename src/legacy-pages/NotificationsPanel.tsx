"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Bell, CheckCheck, Filter, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { LiveRegion } from "@/components/ui/live-region"
import { Timestamp } from "@/components/ui/Timestamp"
import { useNotificationsStore } from "@/app/state/notifications"
import { NOTIFICATION_CATEGORY_CONFIG, sortNotifications } from "@/lib/notifications"
import type { NotificationCategory, NotificationItem } from "@/types/notifications"
import { cn } from "@/lib/utils"
import "../styles/patterns.css"

/**
 * Maps each badge variant to a subtle background pattern class (see
 * `src/styles/patterns.css`) so notification statuses remain distinguishable
 * for color-blind users, not just by hue.
 */
const BADGE_VARIANT_PATTERN_CLASS: Record<string, string> = {
  info: "status-pattern-info",
  warning: "status-pattern-warning",
  success: "status-pattern-success",
  neutral: "status-pattern-neutral",
}

const CATEGORIES: Array<{ value: NotificationCategory | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "market", label: "Market" },
  { value: "dispute", label: "Dispute" },
  { value: "payout", label: "Payout" },
  { value: "system", label: "System" },
  { value: "account", label: "Account" },
]

interface NotificationsPanelProps {
  /** Max items rendered before the list is truncated. Defaults to all. */
  maxItems?: number
}

/**
 * Full-page notifications panel with a sticky bottom action bar that
 * appears on scroll.
 *
 * Responsive behaviour:
 * - Mobile (<640px): compact action labels in the sticky bar.
 * - Tablet+ (640px+): full action labels visible.
 * - Desktop (1024px+): content constrained to max-w-5xl.
 *
 * Accessibility (WCAG 2.1 AA):
 * - aria-live region announces unread count changes.
 * - DropdownMenu (Radix) provides keyboard-navigable filter selection.
 * - Sticky toolbar is labelled as a toolbar with `role="toolbar"`.
 * - Focus-visible rings on all interactive elements.
 * - Reduced motion: respects `prefers-reduced-motion` via Tailwind
 *   `motion-reduce:*` classes.
 *
 * Design tokens:
 * - Uses shadcn CSS custom properties (background, card, border, popover, etc.)
 * - Consistent with NotifDigest, ClaimFlow, and other page-level components.
 * - Dark mode ready: all colours derive from design tokens.
 */
export default function NotificationsPanel({ maxItems }: NotificationsPanelProps) {
  const { notifications, markAsRead, markAllAsRead } = useNotificationsStore()
  const [filter, setFilter] = useState<NotificationCategory | "all">("all")
  const [scrolled, setScrolled] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => {
      const el = headerRef.current
      if (el) {
        setScrolled(el.getBoundingClientRect().bottom < 0)
      }
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const filtered = useMemo(() => {
    const sorted = sortNotifications(notifications)
    if (filter === "all") return sorted
    return sorted.filter((n) => n.category === filter)
  }, [notifications, filter])

  const visible = maxItems ? filtered.slice(0, maxItems) : filtered

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const allRead = unreadCount === 0

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead()
  }, [markAllAsRead])

  const handleMarkAsRead = useCallback(
    (id: string) => {
      markAsRead(id)
    },
    [markAsRead],
  )

  return (
    <>
      <LiveRegion
        message={
          allRead
            ? "No unread notifications"
            : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
        }
      />

      <div
        className={cn(
          "mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:max-w-5xl lg:px-8",
          "pb-[calc(4rem+var(--safe-pb,0px))] motion-reduce:pb-16",
        )}
      >
        <div
          ref={headerRef}
          data-testid="notifications-header"
          className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Notifications
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {allRead
                ? "You're all caught up."
                : `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`}
            </p>
          </div>
          {!allRead && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto gap-1 self-start px-2 py-1 text-xs sm:self-center"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Mark all read
            </Button>
          )}
        </div>

        {visible.length === 0 ? (
          <Card className="border-border/60 bg-card/70">
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <Bell className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {filter !== "all"
                  ? "No notifications in this category."
                  : "You're all caught up."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <section aria-labelledby="notifications-heading">
            <h2 id="notifications-heading" className="sr-only">
              {filter !== "all" ? `${filter} notifications` : "All notifications"}
            </h2>
            <ul className="divide-y rounded-xl border border-border/60 bg-card/70 shadow-sm">
              {visible.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </ul>
          </section>
        )}
      </div>

      <div
        className={cn(
          "fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          "pb-safe transition-transform duration-200 motion-reduce:transition-none",
          scrolled ? "translate-y-0" : "translate-y-full",
        )}
        role="toolbar"
        aria-label="Notification actions"
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:max-w-5xl lg:px-8">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              <span className="font-semibold text-foreground">{unreadCount}</span>
              {" "}unread
            </span>
            <Badge
              variant="secondary"
              size="sm"
              className="hidden shrink-0 sm:inline-flex"
            >
              {notifications.length} total
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 px-2 text-xs sm:px-3"
                  aria-label={`Filter by category. Current: ${filter === "all" ? "All" : NOTIFICATION_CATEGORY_CONFIG[filter].label}`}
                >
                  <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {filter === "all" ? "All" : NOTIFICATION_CATEGORY_CONFIG[filter].label}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuRadioGroup
                  value={filter}
                  onValueChange={(v) => setFilter(v as NotificationCategory | "all")}
                >
                  {CATEGORIES.map((cat) => (
                    <DropdownMenuRadioItem
                      key={cat.value}
                      value={cat.value}
                      className="text-xs"
                    >
                      {cat.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-8 gap-1 px-2 text-xs sm:px-3"
              onClick={handleMarkAllAsRead}
              disabled={allRead}
            >
              <CheckCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Mark read</span>
              <span className="sm:hidden">Read</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

function NotificationRow({
  item,
  onMarkAsRead,
}: {
  item: NotificationItem
  onMarkAsRead: (id: string) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onMarkAsRead(item.id)}
        className={cn(
          "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors sm:px-5 sm:py-4",
          "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
          !item.read && "bg-accent/30",
        )}
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
            className={cn(
              "shrink-0",
              BADGE_VARIANT_PATTERN_CLASS[NOTIFICATION_CATEGORY_CONFIG[item.category].badgeVariant],
            )}
          >
            {NOTIFICATION_CATEGORY_CONFIG[item.category].label}
          </Badge>
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground">{item.description}</p>
        )}
        <Timestamp
          date={item.timestamp}
          className="text-xs text-muted-foreground"
        />
      </button>
    </li>
  )
}
