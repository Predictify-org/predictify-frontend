"use client";

import React, { useId } from "react";

/**
 * MiniBurnDown
 *
 * Compact inline SVG sparkline that visualises a stream's remaining balance
 * "burning down" over time. It draws a single descending line from the start
 * (100% remaining) to the current point (remaining %), plus a faint baseline.
 *
 * The chart is intentionally tiny and decorative; the meaningful value is
 * exposed to assistive technology via an accessible label and `role="img"`
 * (the SVG is not announced node-by-node).
 *
 * ## Theming
 * Uses `currentColor` for the line so callers can colour it via CSS to match
 * the stream's status; the baseline uses the muted token.
 */

export interface MiniBurnDownProps {
  /** Total amount originally locked in the stream (display units). */
  totalAmount: number;
  /** Amount already released/accrued (display units). */
  accruedAmount: number;
  /** Chart width in px. Defaults to 64. */
  width?: number;
  /** Chart height in px. Defaults to 20. */
  height?: number;
  /** Optional class forwarded to the wrapper. */
  className?: string;
}

/** Clamp a ratio into the inclusive `[0, 1]` range. */
function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function MiniBurnDown({
  totalAmount,
  accruedAmount,
  width = 64,
  height = 20,
  className = "",
}: MiniBurnDownProps) {
  // Fraction of the stream already burned down (released).
  const burnedRatio =
    totalAmount > 0 ? clamp01(accruedAmount / totalAmount) : 0;
  const remainingRatio = 1 - burnedRatio;
  const remainingPercent = Math.round(remainingRatio * 100);

  const gradientId = useId();

  // Padding keeps the stroke from being clipped at the edges.
  const pad = 1.5;
  const x0 = pad;
  const x1 = width - pad;
  const yTop = pad;
  const yBottom = height - pad;

  // The line starts full (yTop = 100% remaining) and descends to the current
  // remaining level. We interpolate the end-Y from the remaining ratio.
  const endX = x0 + (x1 - x0) * burnedRatio;
  const endY = yBottom - (yBottom - yTop) * remainingRatio;

  const linePath = `M ${x0} ${yTop} L ${endX} ${endY}`;
  // Area under the line, used for a subtle fill.
  const areaPath = `${linePath} L ${endX} ${yBottom} L ${x0} ${yBottom} Z`;

  const label = `${remainingPercent}% of stream remaining`;

  return (
    <span
      className={`mini-burn-down ${className}`.trim()}
      role="img"
      aria-label={label}
      title={label}
      style={{ display: "inline-flex", lineHeight: 0 }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        focusable="false"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Baseline */}
        <line
          x1={x0}
          y1={yBottom}
          x2={x1}
          y2={yBottom}
          stroke="var(--muted)"
          strokeWidth={1}
          strokeOpacity={0.4}
        />

        {/* Area under the burn-down line */}
        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />

        {/* Burn-down line */}
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />

        {/* Current position marker */}
        <circle cx={endX} cy={endY} r={1.75} fill="currentColor" />
      </svg>
    </span>
  );
}

export default MiniBurnDown;
