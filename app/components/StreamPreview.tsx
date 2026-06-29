"use client";

import React from "react";

/**
 * StreamPreview
 *
 * Read-only summary card shown on the final step of the CreateStream wizard.
 * It presents the configured stream parameters side-by-side with computed
 * totals so the creator can review everything before confirming.
 *
 * ## Accessibility (WCAG 2.1 AA)
 * - Rendered as a labelled region (`role="group"` + `aria-labelledby`).
 * - Field/value pairs use a description list (`<dl>`) for correct semantics.
 * - The computed total is announced via an `aria-live="polite"` region so it
 *   updates audibly if the upstream values change.
 *
 * ## Theming
 * Uses design tokens so it is consistent in light and dark mode; the layout is
 * responsive (single column on small screens, two columns on wider ones).
 */

export interface StreamPreviewData {
  recipient: string;
  /** Per-interval rate in display units. */
  rate: string;
  /** Schedule cadence, e.g. "day", "week". */
  schedule: string;
  /** Number of intervals the stream runs for. */
  durationIntervals: number;
  /** Token symbol, e.g. "XLM" or "USDC". */
  token: string;
  /** Whether the recipient bears the gas fee. */
  gasOnRecipient?: boolean;
}

export interface StreamPreviewProps {
  data: StreamPreviewData;
  className?: string;
}

/**
 * Computes the total streamed amount as `rate * durationIntervals`.
 * Returns a formatted string with up to 7 decimal places (Stellar precision),
 * or `"—"` when the rate is not a valid positive number.
 */
export function computeTotal(rate: string, durationIntervals: number): string {
  const numericRate = Number(rate);
  if (!Number.isFinite(numericRate) || numericRate <= 0 || durationIntervals <= 0) {
    return "—";
  }
  const total = numericRate * durationIntervals;
  // Trim trailing zeros while respecting Stellar's 7-dp precision.
  return Number(total.toFixed(7)).toString();
}

/** Truncates a long Stellar address to `GABC…WXYZ` for compact display. */
function shortenAddress(address: string): string {
  const trimmed = address.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
}

export function StreamPreview({ data, className = "" }: StreamPreviewProps) {
  const total = computeTotal(data.rate, data.durationIntervals);
  const headingId = "stream-preview-heading";

  return (
    <section
      className={`stream-preview ${className}`.trim()}
      role="group"
      aria-labelledby={headingId}
    >
      <h3 id={headingId} className="stream-preview__title">
        Review your stream
      </h3>

      <div className="stream-preview__grid">
        <dl className="stream-preview__list">
          <div className="stream-preview__row">
            <dt>Recipient</dt>
            <dd title={data.recipient}>{shortenAddress(data.recipient) || "—"}</dd>
          </div>
          <div className="stream-preview__row">
            <dt>Rate</dt>
            <dd>
              {data.rate || "—"} {data.token} / {data.schedule}
            </dd>
          </div>
          <div className="stream-preview__row">
            <dt>Duration</dt>
            <dd>
              {data.durationIntervals} {data.schedule}
              {data.durationIntervals === 1 ? "" : "s"}
            </dd>
          </div>
          <div className="stream-preview__row">
            <dt>Gas paid by</dt>
            <dd>{data.gasOnRecipient ? "Recipient" : "You (sender)"}</dd>
          </div>
        </dl>

        <aside className="stream-preview__totals" aria-live="polite">
          <span className="stream-preview__totals-label">Total to stream</span>
          <span className="stream-preview__totals-value">
            {total} {data.token}
          </span>
        </aside>
      </div>

      <style jsx>{`
        .stream-preview {
          padding: 1.25rem;
          background: var(--panel, var(--card-surface));
          border: 1px solid var(--border, var(--card-border));
          border-radius: 1rem;
        }
        .stream-preview__title {
          margin: 0 0 1rem;
          font-size: 1.05rem;
        }
        .stream-preview__grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          align-items: start;
        }
        @media (min-width: 640px) {
          .stream-preview__grid {
            grid-template-columns: 1.4fr 1fr;
          }
        }
        .stream-preview__list {
          display: grid;
          gap: 0.65rem;
          margin: 0;
        }
        .stream-preview__row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          font-size: 0.9rem;
        }
        .stream-preview__row dt {
          color: var(--muted);
        }
        .stream-preview__row dd {
          margin: 0;
          font-weight: 600;
          text-align: right;
          overflow-wrap: anywhere;
        }
        .stream-preview__totals {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          padding: 1rem;
          border-radius: 0.75rem;
          background: var(--accent-strong, rgba(34, 197, 94, 0.12));
          color: var(--foreground, inherit);
        }
        .stream-preview__totals-label {
          font-size: 0.8rem;
          color: var(--muted);
        }
        .stream-preview__totals-value {
          font-size: 1.4rem;
          font-weight: 700;
        }
      `}</style>
    </section>
  );
}

export default StreamPreview;
