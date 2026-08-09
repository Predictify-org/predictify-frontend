"use client"

import React from "react"
import { motion } from "framer-motion"
import { AlertCircle, Bell, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { ErrorBoundary } from "@/components/error-boundary"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationBellProps {
  /** Number of unread notifications. 0 or undefined hides the badge. */
  unreadCount?: number
  /** Maximum number shown on the badge. Anything above shows `{max}+`. Default 99. */
  maxDisplay?: number
  /** Optional click handler for the bell button. */
  onClick?: () => void
  /** Optional className applied to the outer button. */
  className?: string
  /**
   * Override the system `prefers-reduced-motion` value. When `true`
   * (either explicitly or via the media query), the bell swing and
   * badge pulse animations are bypassed and the component renders as
   * a static subtree of the same DOM structure.
   */
  reducedMotion?: boolean
  /** Optional test ID prefix. Defaults to `"notification-bell"`. */
  testId?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TEST_ID = "notification-bell"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBadgeCount(count: number, max: number): string {
  if (count <= 0) return ""
  return count > max ? `${max}+` : String(count)
}

// ---------------------------------------------------------------------------
// Error fallback (compact, keeps the header/bell slot intact)
// ---------------------------------------------------------------------------

/**
 * Compact error fallback shown by the ErrorBoundary when the NotificationBell
 * throws during render. Keeps the button slot so the header layout doesn't
 * shift, and offers a Retry action (WCAG 2.1 AA) to reset the boundary.
 */
function NotificationBellErrorFallback({
  onRetry,
  testId = DEFAULT_TEST_ID,
}: {
  onRetry: () => void
  testId?: string
}) {
  return (
    <span
      data-testid={`${testId}-error-fallback`}
      role="alert"
      className="relative inline-flex items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-destructive border border-destructive/30 bg-destructive/5"
    >
      <span className="sr-only">Notification bell error</span>
      <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
      <button
        type="button"
        data-testid={`${testId}-retry`}
        onClick={onRetry}
        aria-label="Retry loading notification bell"
        className="absolute -bottom-1 -right-1 inline-flex items-center justify-center rounded-full bg-background border border-border p-1 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <RefreshCw className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * NotificationBell
 *
 * A notification bell button with an unread-count badge, designed for the
 * GrantFox FWC26 (Stellar Wave) campaign.
 *
 * ## Features
 * - Animated bell swing on mount / when unread count changes
 * - Pulsing unread-count badge with design-token colors
 * - Respects `prefers-reduced-motion: reduce`: fully static rendering
 * - Runtime-reactive to motion-preference changes
 * - SSR-safe (no window reads during initial server render)
 * - WCAG 2.1 AA: accessible button, announced count, focus-visible rings
 * - Light + dark mode via semantic Tailwind tokens
 * - Responsive hit area (min 44×44px at all breakpoints)
 * - Error-boundary fallback with Retry action if the bell ever throws
 *
 * ## Accessibility
 * - Semantic `<button>` with `aria-label` containing the unread count
 * - Badge has `role="status"` and `aria-live="polite"` for assistive tech
 * - Bell icon is `aria-hidden`; only the count is announced
 * - Focus-visible ring uses `ring-ring` design token
 * - Hit area is at least 44×44 CSS px (WCAG Target Size AA)
 *
 * ## Motion modes
 * - **Full motion** (`prefers-reduced-motion: no-preference`):
 *   - Bell uses `framer-motion` with a damped swing (bell-ring) animation
 *   - Badge has a soft `animate-pulse` class when unread > 0
 * - **Reduced motion** (`prefers-reduced-motion: reduce`):
 *   - Bell rendered as a plain `<div>`; no `motion.*` wrappers
 *   - Badge rendered without `animate-pulse`, `transition-*`, `duration-*`
 *   - DOM structure and content **identical** to the full-motion branch
 *
 * ## Design Tokens
 * - Icon: `text-foreground / text-muted-foreground`
 * - Badge bg: `bg-primary`
 * - Badge fg: `text-primary-foreground`
 * - Focus ring: `ring-2 ring-ring ring-offset-2 ring-offset-background`
 * - All tokens resolve automatically in light + dark mode
 *
 * @example
 * ```tsx
 * <NotificationBell
 *   unreadCount={5}
 *   onClick={() => setNotificationsOpen(true)}
 * />
 * ```
 */

// Internal renderer — the actual bell. Exported under a wrapper below so the
// ErrorBoundary can catch render errors and show the compact fallback.
function NotificationBellInner({
  unreadCount = 0,
  maxDisplay = 99,
  onClick,
  className,
  reducedMotion: reducedMotionProp,
  testId = DEFAULT_TEST_ID,
}: NotificationBellProps) {
  const prefersReducedMotion = useReducedMotion()
  const reducedMotion = reducedMotionProp ?? prefersReducedMotion

  const count = Math.max(0, Math.floor(unreadCount || 0))
  const hasUnread = count > 0
  const badgeText = formatBadgeCount(count, maxDisplay)

  // Accessible label — describes state for screen readers.
  const ariaLabel = hasUnread
    ? `Notifications — ${count} unread`
    : "Notifications"

  // -----------------------------------------------------------------------
  // Shared inner content (same DOM for motion + static branches)
  // -----------------------------------------------------------------------

  const bellIcon = (
    <Bell
      className={cn(
        "h-5 w-5 shrink-0",
        hasUnread ? "text-foreground" : "text-muted-foreground",
      )}
      aria-hidden="true"
      strokeWidth={1.75}
    />
  )

  const badge = hasUnread ? (
    <span
      data-testid={`${testId}-badge`}
      role="status"
      aria-live="polite"
      className={cn(
        // Layout
        "pointer-events-none absolute -top-1 -right-1",
        "min-w-[18px] h-[18px] px-1",
        "flex items-center justify-center",
        "rounded-full",
        // Typography
        "text-[10px] font-bold leading-none",
        // Design tokens (light + dark safe)
        "bg-primary text-primary-foreground",
        "shadow-sm shadow-black/10 dark:shadow-black/30",
        // Border to pop against any bg
        "ring-2 ring-background",
      )}
    >
      {badgeText}
    </span>
  ) : null

  // -----------------------------------------------------------------------
  // Reduced-motion branch: fully static, zero animation properties
  // -----------------------------------------------------------------------

  if (reducedMotion) {
    return (
      <button
        type="button"
        data-testid={`${testId}-static`}
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          // Hit area: ≥ 44×44 px (WCAG 2.5.5 Target Size AA)
          "relative inline-flex items-center justify-center",
          "h-11 w-11 min-h-[44px] min-w-[44px]",
          "rounded-xl",
          // Semantic tokens, no hardcoded colors
          "text-foreground",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "active:scale-[0.98]",
          className,
        )}
      >
        {bellIcon}
        {badge}
      </button>
    )
  }

  // -----------------------------------------------------------------------
  // Full-motion branch: animated bell + pulsing badge
  // -----------------------------------------------------------------------

  // Bell "ring" swing variants — subtle, damped, 6-step keyframes.
  // Note: framer-motion v12 infers easing across the array keyframes, so
  // we avoid specifying a per-variant `ease` literal (which has strict
  // typing mismatches against `Easing` unions) and instead rely on the
  // outer spring transition for whileHover/whileTap + the keyframe order.
  const bellVariants = {
    idle: { rotate: 0 },
    ring: {
      rotate: [0, -12, 10, -6, 4, 0] as [number, number, number, number, number, number],
      transition: { duration: 1.1 },
    },
  }

  return (
    <motion.button
      type="button"
      data-testid={testId}
      onClick={onClick}
      aria-label={ariaLabel}
      initial="idle"
      animate={hasUnread ? "ring" : "idle"}
      variants={bellVariants}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={cn(
        // Same layout / hit-area / tokens as the static branch
        "relative inline-flex items-center justify-center",
        "h-11 w-11 min-h-[44px] min-w-[44px]",
        "rounded-xl",
        "text-foreground",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <motion.span
        // Nested span so the swing only applies to the icon geometry,
        // not the badge. Keeps the badge anchored top-right.
        animate={hasUnread ? "ring" : "idle"}
        variants={bellVariants}
        className="inline-flex items-center justify-center"
      >
        {bellIcon}
      </motion.span>

      {hasUnread ? (
        <span
          data-testid={`${testId}-badge`}
          role="status"
          aria-live="polite"
          className={cn(
            // Same layout as static badge
            "pointer-events-none absolute -top-1 -right-1",
            "min-w-[18px] h-[18px] px-1",
            "flex items-center justify-center",
            "rounded-full",
            "text-[10px] font-bold leading-none",
            "bg-primary text-primary-foreground",
            "shadow-sm shadow-black/10 dark:shadow-black/30",
            "ring-2 ring-background",
            // Motion-only: soft pulse (not distracting, draws eye subtly)
            "animate-pulse",
          )}
        >
          {badgeText}
        </span>
      ) : null}
    </motion.button>
  )
}

/**
 * Public `NotificationBell` — wraps the inner bell in an `ErrorBoundary`.
 * If the bell throws during render, a compact fallback with a Retry action
 * is shown instead of crashing the surrounding header.
 */
export function NotificationBell(props: NotificationBellProps) {
  const [retryKey, setRetryKey] = React.useState(0)

  const handleRetry = () => setRetryKey((k) => k + 1)

  return (
    <ErrorBoundary
      key={retryKey}
      fallback={<NotificationBellErrorFallback onRetry={handleRetry} testId={props.testId} />}
    >
      <NotificationBellInner {...props} />
    </ErrorBoundary>
  )
}

export default NotificationBell
