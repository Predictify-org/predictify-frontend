"use client";

import React, { useState, useEffect, useId } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalMs: number;
}

export function calculateTimeRemaining(targetDate: Date | string | number): TimeRemaining {
  const targetMs = typeof targetDate === "object" ? targetDate.getTime() : new Date(targetDate).getTime();
  const nowMs = Date.now();
  const diffMs = targetMs - nowMs;

  if (isNaN(targetMs) || diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalMs: 0 };
  }

  const seconds = Math.floor((diffMs / 1000) % 60);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, isExpired: false, totalMs: diffMs };
}

export type CountdownChipVariant = "default" | "compact" | "urgent" | "hero";

export interface CountdownChipProps {
  /** Target closing date/time as a Date, ISO string, or timestamp */
  targetDate?: Date | string | number;
  /** Static string fallback if targetDate is not provided (e.g. "3 days") */
  timeLeft?: string;
  /** Optional custom prefix label, e.g. "Closes in" */
  label?: string;
  /** Visual variant styling */
  variant?: CountdownChipVariant;
  /** Custom CSS classes */
  className?: string;
  /** Show leading status icon (Clock/AlertTriangle) */
  showIcon?: boolean;
  /** Callback triggered when live timer reaches 0 */
  onEnd?: () => void;
}

/**
 * CountdownChip — Market closing countdown indicator for GrantFox FWC26 campaign.
 * 
 * Features:
 * - Live real-time ticker option or static fallback label (`timeLeft`)
 * - High-contrast & dark-mode aligned visual badges (Normal vs Urgent < 24h)
 * - WCAG 2.1 AA compliant timer role, tabular numbers, and accessible ARIA labels
 * - Prefers-reduced-motion / html.motion-reduced safe pulse indicator
 */
export function CountdownChip({
  targetDate,
  timeLeft,
  label = "Closes in",
  variant = "default",
  className,
  showIcon = true,
  onEnd,
}: CountdownChipProps) {
  const chipId = useId();
  const [time, setTime] = useState<TimeRemaining | null>(() =>
    targetDate ? calculateTimeRemaining(targetDate) : null
  );

  useEffect(() => {
    if (!targetDate) return;

    const updateTimer = () => {
      const remaining = calculateTimeRemaining(targetDate);
      setTime(remaining);
      if (remaining.isExpired && onEnd) {
        onEnd();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onEnd]);

  // Determine status & urgency
  const isExpired = time ? time.isExpired : false;
  // Urgent if less than 24 hours remaining
  const isUrgent = time
    ? !time.isExpired && time.totalMs < 24 * 60 * 60 * 1000
    : variant === "urgent";

  // Format display text
  let formattedValue = "";
  let fullAriaLabel = "";

  if (time) {
    if (time.isExpired) {
      formattedValue = "Closed";
      fullAriaLabel = "Market closed";
    } else {
      const parts: string[] = [];
      const ariaParts: string[] = [];

      if (time.days > 0) {
        parts.push(`${time.days}d`);
        ariaParts.push(`${time.days} ${time.days === 1 ? "day" : "days"}`);
      }
      if (time.hours > 0 || time.days > 0) {
        parts.push(`${time.hours}h`);
        ariaParts.push(`${time.hours} ${time.hours === 1 ? "hour" : "hours"}`);
      }
      parts.push(`${time.minutes}m`);
      ariaParts.push(`${time.minutes} ${time.minutes === 1 ? "minute" : "minutes"}`);
      parts.push(`${time.seconds}s`);
      ariaParts.push(`${time.seconds} ${time.seconds === 1 ? "second" : "seconds"}`);

      formattedValue = parts.join(" ");
      fullAriaLabel = label ? `${label}: ${ariaParts.join(" ")}` : ariaParts.join(" ");
    }
  } else {
    formattedValue = timeLeft || "Ended";
    fullAriaLabel = timeLeft ? (label ? `${label}: ${timeLeft}` : timeLeft) : "Market closed";
  }

  // Variant styling
  const variantStyles: Record<CountdownChipVariant, string> = {
    default:
      "bg-muted/80 text-foreground border-border dark:bg-muted/30 dark:border-border/60",
    compact:
      "text-caption py-0.5 px-2 bg-muted/60 text-muted-foreground border-border/40",
    urgent:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 dark:bg-amber-950/30",
    hero: "text-body-md py-1.5 px-3.5 bg-card border-border shadow-xs",
  };

  const urgentStyles =
    isUrgent && variant !== "urgent"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 dark:bg-amber-950/30"
      : "";

  const expiredStyles = isExpired
    ? "bg-muted text-muted-foreground border-border/50 opacity-80"
    : "";

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={fullAriaLabel}
      id={chipId}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium transition-colors",
        variantStyles[variant],
        urgentStyles,
        expiredStyles,
        className
      )}
    >
      {/* Pulse dot for urgent countdown with reduced-motion fallback */}
      {isUrgent && !isExpired && (
        <span className="relative flex h-2 w-2 items-center justify-center" aria-hidden="true" data-testid="urgent-pulse-indicator">
          <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
        </span>
      )}

      {showIcon && !isUrgent && (
        <Clock
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground",
            isExpired && "text-muted-foreground/60"
          )}
          aria-hidden="true"
        />
      )}

      {showIcon && isUrgent && (
        <AlertTriangle
          className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
      )}

      {label && <span className="text-muted-foreground font-normal">{label}</span>}

      <span className="font-semibold tabular-nums tracking-tight">
        {formattedValue}
      </span>
    </div>
  );
}

export default CountdownChip;
