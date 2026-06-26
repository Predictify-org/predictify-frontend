/**
 * StreamProgress
 *
 * Slim burn-down progress bar for a payment stream.
 *
 * ## Visual behaviour by status
 * - active  → filled bar (accrued %) + remaining-balance label; animates on
 *             load unless the user prefers reduced motion.
 * - paused  → same as active but uses the paused color token; no animation.
 * - draft   → empty bar (0 %) with "Not started" label.
 * - ended / withdrawn / cancelled → full bar (100 %) with "Completed" label.
 *
 * ## Accessibility (WCAG 2.1 AA)
 * - role="progressbar" with aria-valuenow, aria-valuemin, aria-valuemax.
 * - aria-valuetext provides a human-readable description so screen readers
 *   do not just announce a raw percentage.
 * - State is NOT conveyed by color alone — the percentage label is always
 *   visible alongside the bar.
 *
 * ## Amounts
 * Accepts raw i128-compatible bigint or number values. No decimal conversion
 * is performed here; callers supply pre-scaled display values if needed.
 */

"use client";

import type { StreamStatus } from "@/app/types/openapi";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StreamProgressProps {
  status: StreamStatus;
  /**
   * Amount already accrued / vested (raw units or display units — must be
   * consistent with `totalAmount`).
   */
  accruedAmount?: number;
  /**
   * Total stream amount (raw units or display units).
   * When omitted the component falls back to schedule-based elapsed ratio.
   */
  totalAmount?: number;
  /**
   * Stream start ISO-8601 timestamp. Used for elapsed-time fallback when
   * `accruedAmount` / `totalAmount` are not provided.
   */
  startedAt?: string;
  /**
   * Stream end / expected-end ISO-8601 timestamp. Used for elapsed-time
   * fallback.
   */
  endsAt?: string;
  /** Optional CSS class forwarded to the wrapper element. */
  className?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Clamp a value between 0 and 100 (inclusive).
 */
function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Derive the fill percentage from props.
 *
 * Priority:
 *   1. accruedAmount / totalAmount  (on-chain data — most accurate)
 *   2. elapsed time between startedAt and endsAt  (schedule fallback)
 *   3. Status-based default (draft → 0, ended/withdrawn/cancelled → 100)
 */
function derivePercent(props: StreamProgressProps): number {
  const { status, accruedAmount, totalAmount, startedAt, endsAt } = props;

  // Terminal states
  if (status === "ended" || status === "withdrawn" || status === "cancelled") {
    return 100;
  }
  if (status === "draft") {
    return 0;
  }

  // On-chain amounts (active / paused)
  if (
    typeof accruedAmount === "number" &&
    typeof totalAmount === "number" &&
    totalAmount > 0
  ) {
    return clamp((accruedAmount / totalAmount) * 100);
  }

  // Schedule-based elapsed time fallback
  if (startedAt && endsAt) {
    const start = new Date(startedAt).getTime();
    const end   = new Date(endsAt).getTime();
    const now   = Date.now();
    const total = end - start;
    if (total > 0) {
      return clamp(((now - start) / total) * 100);
    }
  }

  // Unknown — show indeterminate 50 % for active, 0 for paused
  return status === "active" ? 50 : 0;
}

/**
 * Human-readable label for aria-valuetext and the visible percentage.
 */
function deriveLabel(status: StreamStatus, percent: number): string {
  if (status === "draft")      return "Not started";
  if (status === "ended")      return "Completed";
  if (status === "withdrawn")  return "Withdrawn";
  if (status === "cancelled")  return "Cancelled";
  return `${Math.round(percent)}% accrued`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StreamProgress({
  status,
  accruedAmount,
  totalAmount,
  startedAt,
  endsAt,
  className = "",
}: StreamProgressProps) {
  const percent = derivePercent({ status, accruedAmount, totalAmount, startedAt, endsAt });
  const label   = deriveLabel(status, percent);

  // Map status to BEM modifier for color tokens
  const modifier =
    status === "active"    ? "active"    :
    status === "paused"    ? "paused"    :
    status === "ended" || status === "withdrawn" ? "ended" :
    status === "cancelled" ? "cancelled" :
    "draft";

  return (
    <div className={`stream-progress ${className}`.trim()}>
      {/* Track */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={label}
        aria-label={`Stream progress: ${label}`}
        className={`stream-progress__track stream-progress__track--${modifier}`}
      >
        {/* Fill */}
        <div
          className={`stream-progress__fill stream-progress__fill--${modifier}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Visible label — state is NOT conveyed by color alone */}
      <div className="stream-progress__meta" aria-hidden="true">
        <span className="stream-progress__label">{label}</span>
        {typeof totalAmount === "number" && typeof accruedAmount === "number" && totalAmount > 0 && (
          <span className="stream-progress__remaining">
            {Math.round(totalAmount - accruedAmount).toLocaleString()} remaining
          </span>
        )}
      </div>
    </div>
  );
}
