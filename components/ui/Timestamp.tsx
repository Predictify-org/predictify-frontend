"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TimestampProps {
  date: Date | string;
  className?: string;
}

/**
 * Deterministic date parser.
 * Handles ISO strings (YYYY-MM-DD...), DD/MM/YYYY, and Date objects.
 * Avoids relying on `new Date(string)` which parses DD/MM/YYYY ambiguously.
 */
function parseDate(value: Date | string): Date {
  if (value instanceof Date) return value;

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(value);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/");
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
}

/**
 * Format relative time ("2 hours ago", "Just now", etc.)
 */
function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Format absolute date+time with locale and timezone.
 * Uses Intl.DateTimeFormat for proper locale awareness.
 */
function formatAbsolute(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

/**
 * Timestamp Component
 *
 * Wraps a relative time display with a tooltip showing absolute locale-formatted time.
 * - Renders a semantic <time> element with ISO dateTime attribute
 * - Shows relative text ("2 hours ago") by default
 * - Tooltip shows absolute time with timezone on hover/focus
 * - aria-label includes both relative and absolute time for screen readers
 * - Live updates every 60 seconds for "ago" strings
 */
export function Timestamp({ date, className }: TimestampProps) {
  const parsed = parseDate(date);
  const [relative, setRelative] = useState(() => formatRelative(parsed));

  const update = useCallback(() => {
    setRelative(formatRelative(parsed));
  }, [parsed]);

  useEffect(() => {
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [update]);

  const absolute = formatAbsolute(parsed);
  const iso = parsed.toISOString();
  const ariaLabel = `${relative}, ${absolute}`;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <time dateTime={iso} aria-label={ariaLabel} className={className}>
            {relative}
          </time>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{absolute}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
