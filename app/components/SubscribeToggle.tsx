"use client"

import * as React from "react"
import { Bell, BellOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { toast as sonnerToast } from "sonner"
import { useReducedMotion } from "@/hooks/useReducedMotion"

/**
 * Props for the SubscribeToggle component.
 * Provides a toggle for users to subscribe/unsubscribe from market notifications.
 */
export interface SubscribeToggleProps {
  /**
   * Unique identifier for the market to subscribe to.
   * Used to track which market's notifications are being toggled.
   */
  marketId: string

  /**
   * Whether the user is currently subscribed to notifications for this market.
   * @default false
   */
  subscribed?: boolean

  /**
   * Callback fired when the subscription state changes.
   * Receives the marketId and the new subscription state.
   */
  onSubscribeChange?: (marketId: string, subscribed: boolean) => void

  /**
   * Optional additional CSS classes for the outer wrapper element.
   */
  className?: string

  /**
   * When true, the toggle is disabled (e.g., wallet not connected, loading).
   * @default false
   */
  disabled?: boolean

  /**
   * Accessible label text for the toggle.
   * When omitted, defaults to "Subscribe to market notifications" or
   * "Unsubscribe from market notifications" based on state.
   */
  label?: string

  /**
   * Optional market title used in toast messages.
   * When provided, shows "Subscribed to {marketTitle} notifications".
   */
  marketTitle?: string
}

/**
 * SubscribeToggle - An accessible toggle for subscribing to market notifications.
 *
 * Features:
 * - WCAG 2.1 AA compliant with keyboard navigation and ARIA labels
 * - Uses the project's Radix UI Switch primitive for consistent look & feel
 * - Provides sonner toast feedback on state changes
 * - Respects reduced-motion preferences via useReducedMotion
 * - Dark-mode consistent through CSS design tokens
 * - Responsive across all breakpoints
 * - Respects quiet-hours via sonner's built-in filtering
 *
 * @example
 * ```tsx
 * <SubscribeToggle
 *   marketId="market-123"
 *   marketTitle="NBA Finals 2026"
 *   subscribed={isSubscribed}
 *   onSubscribeChange={handleSubscribe}
 * />
 * ```
 */
export const SubscribeToggle: React.FC<SubscribeToggleProps> = ({
  marketId,
  subscribed = false,
  onSubscribeChange,
  className,
  disabled = false,
  label,
  marketTitle,
}) => {
  const prefersReducedMotion = useReducedMotion()

  const handleToggle = React.useCallback(
    (checked: boolean) => {
      onSubscribeChange?.(marketId, checked)

      // Provide toast feedback on toggle
      if (checked) {
        sonnerToast.success(
          marketTitle
            ? `Subscribed to ${marketTitle} notifications`
            : "Subscribed to market notifications",
          {
            description: "We'll notify you when the outcome is resolved.",
            duration: prefersReducedMotion ? 6000 : 4000,
            icon: <Bell className="h-4 w-4" aria-hidden="true" />,
          }
        )
      } else {
        // Use toast.message() explicitly to ensure quiet-hours filtering (sonner.tsx patches the .message method)
        sonnerToast.message("Unsubscribed from market notifications", {
          description: "You will no longer receive updates for this market.",
          duration: prefersReducedMotion ? 6000 : 4000,
          icon: <BellOff className="h-4 w-4" aria-hidden="true" />,
        })
      }
    },
    [marketId, marketTitle, onSubscribeChange, prefersReducedMotion]
  )

  const accessibleLabel =
    label ??
    (subscribed
      ? "Unsubscribe from market notifications"
      : "Subscribe to market notifications")

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5",
        "transition-colors duration-200",
        disabled && "pointer-events-none opacity-50",
        // Responsive: full-width on small screens, inline on larger
        "w-full sm:w-auto",
        className
      )}
    >
      {/* Icon: changes based on subscription state */}
      <span
        className={cn(
          "flex-shrink-0 transition-colors duration-200",
          subscribed
            ? "text-primary"
            : "text-muted-foreground"
        )}
        aria-hidden="true"
      >
        {subscribed ? (
          <Bell className="h-5 w-5" />
        ) : (
          <BellOff className="h-5 w-5" />
        )}
      </span>

      {/* Label text */}
      <span
        className={cn(
          "flex-1 text-sm font-medium leading-tight select-none",
          "text-card-foreground",
          // Truncate long labels
          "truncate"
        )}
      >
        {label ?? (subscribed ? "Subscribed" : "Subscribe")}
      </span>

      {/* Accessible Switch toggle */}
      <Switch
        checked={subscribed}
        onCheckedChange={handleToggle}
        disabled={disabled}
        aria-label={accessibleLabel}
        className="flex-shrink-0"
      />

      {/* Live region for screen readers to announce state changes */}
      <span className="sr-only" role="status" aria-live="polite">
        {subscribed
          ? `Subscribed to ${marketTitle ?? "market"} notifications`
          : `Not subscribed to ${marketTitle ?? "market"} notifications`}
      </span>
    </div>
  )
}

SubscribeToggle.displayName = "SubscribeToggle"
