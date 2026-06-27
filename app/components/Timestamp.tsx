"use client";

import { useEffect, useId, useRef, useState } from "react";

const LONG_PRESS_DELAY_MS = 450;

function formatUnitDiff(target: Date, now: Date) {
  const diffMs = target.getTime() - now.getTime();
  const absSeconds = Math.abs(diffMs) / 1000;

  if (absSeconds < 45) return { unit: "second" as const, value: Math.round(diffMs / 1000) };
  if (absSeconds < 45 * 60) return { unit: "minute" as const, value: Math.round(diffMs / 60000) };
  if (absSeconds < 22 * 3600) return { unit: "hour" as const, value: Math.round(diffMs / 3600000) };
  if (absSeconds < 26 * 86400) return { unit: "day" as const, value: Math.round(diffMs / 86400000) };
  if (absSeconds < 320 * 86400) return { unit: "month" as const, value: Math.round(diffMs / (30 * 86400000)) };
  return { unit: "year" as const, value: Math.round(diffMs / (365 * 86400000)) };
}

export function formatRelativeTimestamp(iso: string, now = new Date()): string {
  const target = new Date(iso);

  if (Number.isNaN(target.getTime())) {
    return iso;
  }

  const { unit, value } = formatUnitDiff(target, now);
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(value, unit);
}

export function formatAbsoluteTimestamp(iso: string): string {
  const target = new Date(iso);

  if (Number.isNaN(target.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(target) + " UTC";
}

type TimestampProps = {
  iso: string;
  className?: string;
};

export function Timestamp({ iso, className }: TimestampProps) {
  const tooltipId = useId();
  const longPressTimerRef = useRef<number | null>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const relativeLabel = formatRelativeTimestamp(iso, now);
  const absoluteLabel = formatAbsoluteTimestamp(iso);
  const tooltipText = `${relativeLabel} • ${absoluteLabel} • ${iso}`;

  const startLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = window.setTimeout(() => {
      setIsTooltipVisible(true);
    }, LONG_PRESS_DELAY_MS);
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <span className={`timestamp ${className || ""}`.trim()}>
      <button
        aria-describedby={isTooltipVisible ? tooltipId : undefined}
        aria-label={`Show exact timestamp for ${relativeLabel}`}
        className="timestamp__trigger"
        onBlur={() => setIsTooltipVisible(false)}
        onFocus={() => setIsTooltipVisible(true)}
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
        onPointerCancel={clearLongPress}
        onPointerDown={startLongPress}
        onPointerLeave={() => {
          clearLongPress();
          setIsTooltipVisible(false);
        }}
        onPointerUp={clearLongPress}
        title={tooltipText}
        type="button"
      >
        <time dateTime={iso}>{relativeLabel}</time>
      </button>

      {isTooltipVisible && (
        <span className="timestamp__tooltip" id={tooltipId} role="tooltip">
          <span className="timestamp__tooltip-line">Relative: {relativeLabel}</span>
          <span className="timestamp__tooltip-line">Absolute: {absoluteLabel}</span>
          <span className="timestamp__tooltip-line">ISO: {iso}</span>
        </span>
      )}
    </span>
  );
}
