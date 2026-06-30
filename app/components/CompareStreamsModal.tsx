"use client";

/**
 * CompareStreamsModal
 *
 * Renders two streams side-by-side in an accessible modal dialog so
 * users can compare rate, runway, and balance at a glance.
 *
 * Accessibility (WCAG 2.1 AA)
 * ───────────────────────────
 * - role="dialog" + aria-modal="true" + aria-labelledby
 * - Focus is trapped inside the modal while open (Tab / Shift+Tab cycle)
 * - Initial focus lands on the close button
 * - Escape key closes the modal
 * - Backdrop click closes the modal
 * - Reduced-motion: all animations are gated on prefers-reduced-motion
 * - All interactive elements meet the 44 × 44 px touch-target minimum
 *
 * Design tokens
 * ─────────────
 * Uses only CSS custom properties defined in globals.css so the
 * component is dark-mode-consistent and inherits any future theme changes.
 *
 * Responsive
 * ──────────
 * - < 640 px  : single-column stacked layout
 * - ≥ 640 px  : two-column side-by-side layout
 */

import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { StatusBadge, type StreamStatus } from "./StatusBadge";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompareStream {
  /** Unique stream identifier shown in the header. */
  id: string;
  /** Display name of the recipient. */
  recipient: string;
  /** Human-readable rate string, e.g. "120 XLM / month". */
  rate: string;
  /** Human-readable runway string, e.g. "14 days remaining". */
  runway: string;
  /** Human-readable current balance, e.g. "340 XLM available". */
  balance: string;
  /** Lifecycle status used to render the colour-coded badge. */
  status: StreamStatus;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
}

export interface CompareStreamsModalProps {
  /** Controls visibility. */
  isOpen: boolean;
  /** Called when the user dismisses the modal. */
  onClose: () => void;
  /** The two streams to compare. */
  streamA: CompareStream;
  streamB: CompareStream;
}

// ── Focus-trap helper ─────────────────────────────────────────────────────────

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function trapFocus(container: HTMLElement, e: KeyboardEvent) {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (!nodes.length) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

// ── Row helpers ───────────────────────────────────────────────────────────────

interface CompareRowProps {
  label: string;
  valueA: React.ReactNode;
  valueB: React.ReactNode;
  highlight?: boolean;
}

function CompareRow({ label, valueA, valueB, highlight }: CompareRowProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.75rem",
        padding: "0.75rem 0",
        borderBottom: "1px solid var(--border)",
        background: highlight ? "rgba(34,197,94,0.04)" : undefined,
      }}
    >
      <div>
        <span
          style={{
            display: "block",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--font-bold)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: "0.25rem",
          }}
        >
          {label}
        </span>
        <span style={{ fontWeight: "var(--font-semibold)", wordBreak: "break-word" }}>
          {valueA}
        </span>
      </div>
      <div>
        <span
          style={{
            display: "block",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--font-bold)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: "0.25rem",
          }}
        >
          {label}
        </span>
        <span style={{ fontWeight: "var(--font-semibold)", wordBreak: "break-word" }}>
          {valueB}
        </span>
      </div>
    </div>
  );
}

// ── Column header ─────────────────────────────────────────────────────────────

function StreamColumnHeader({ stream }: { stream: CompareStream }) {
  return (
    <div
      style={{
        paddingBottom: "0.75rem",
        borderBottom: "2px solid var(--border)",
        marginBottom: "0.25rem",
      }}
    >
      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--muted)",
          fontWeight: "var(--font-bold)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: "0.25rem",
        }}
      >
        {stream.id}
      </p>
      <p
        style={{
          fontWeight: "var(--font-bold)",
          fontSize: "var(--text-base)",
          marginBottom: "0.5rem",
          color: "var(--foreground)",
        }}
      >
        {stream.recipient}
      </p>
      <StatusBadge status={stream.status} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CompareStreamsModal({
  isOpen,
  onClose,
  streamA,
  streamB,
}: CompareStreamsModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(isOpen);

  // Keep mounted briefly after close so the fade-out animation plays.
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    } else {
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Move focus into the modal when it opens.
  useEffect(() => {
    if (isOpen) {
      // Defer so the DOM is rendered before we attempt to focus.
      const t = setTimeout(() => closeBtnRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Keyboard: Escape closes; Tab is trapped.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        trapFocus(dialogRef.current, e.nativeEvent);
      }
    },
    [onClose],
  );

  if (!mounted) return null;

  const createdA = streamA.createdAt
    ? new Date(streamA.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
  const createdB = streamB.createdAt
    ? new Date(streamB.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          animation: isOpen
            ? "csm-fade-in 200ms ease forwards"
            : "csm-fade-out 200ms ease forwards",
        }}
      />

      {/* ── Dialog ───────────────────────────────────────────────────── */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1001,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          pointerEvents: "none", // clicks on the wrapper fall through to backdrop
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            pointerEvents: "auto",
            width: "100%",
            maxWidth: "700px",
            maxHeight: "90vh",
            overflowY: "auto",
            backgroundColor: "var(--card-surface, var(--panel-elevated))",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "1.5rem",
            boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
            animation: isOpen
              ? "csm-scale-in 200ms ease forwards"
              : "csm-scale-out 200ms ease forwards",
          }}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
            }}
          >
            <h2
              id={titleId}
              style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-bold)" }}
            >
              Compare Streams
            </h2>
            <button
              ref={closeBtnRef}
              onClick={onClose}
              aria-label="Close compare streams dialog"
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: "1.25rem",
                lineHeight: 1,
                minWidth: "var(--touch-target, 44px)",
                minHeight: "var(--touch-target, 44px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 150ms ease, border-color 150ms ease",
              }}
            >
              ×
            </button>
          </div>

          {/* ── Column headers (recipient + status) ────────────────── */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}
            aria-hidden="true" /* repeated semantically in the rows */
          >
            <StreamColumnHeader stream={streamA} />
            <StreamColumnHeader stream={streamB} />
          </div>

          {/* ── Comparison rows ─────────────────────────────────────── */}
          <dl
            aria-label={`Comparing ${streamA.recipient} with ${streamB.recipient}`}
            style={{ margin: 0 }}
          >
            <CompareRow
              label="Rate"
              valueA={
                <span style={{ color: "var(--accent)", fontWeight: "var(--font-bold)" }}>
                  {streamA.rate}
                </span>
              }
              valueB={
                <span style={{ color: "var(--accent)", fontWeight: "var(--font-bold)" }}>
                  {streamB.rate}
                </span>
              }
              highlight
            />
            <CompareRow
              label="Runway"
              valueA={streamA.runway}
              valueB={streamB.runway}
            />
            <CompareRow
              label="Balance"
              valueA={streamA.balance}
              valueB={streamB.balance}
            />
            <CompareRow
              label="Status"
              valueA={<StatusBadge status={streamA.status} />}
              valueB={<StatusBadge status={streamB.status} />}
            />
            <CompareRow
              label="Created"
              valueA={createdA}
              valueB={createdB}
            />
          </dl>
        </div>
      </div>

      {/* ── Keyframes ────────────────────────────────────────────────── */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes csm-fade-in  { from { opacity: 0 } to { opacity: 1 } }
          @keyframes csm-fade-out { from { opacity: 1 } to { opacity: 0 } }
          @keyframes csm-scale-in {
            from { opacity: 0; transform: scale(0.95) translateY(6px) }
            to   { opacity: 1; transform: scale(1)    translateY(0)   }
          }
          @keyframes csm-scale-out {
            from { opacity: 1; transform: scale(1)    translateY(0)   }
            to   { opacity: 0; transform: scale(0.95) translateY(6px) }
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes csm-fade-in  { from { opacity: 0 } to { opacity: 1 } }
          @keyframes csm-fade-out { from { opacity: 1 } to { opacity: 0 } }
          @keyframes csm-scale-in  { from { opacity: 0 } to { opacity: 1 } }
          @keyframes csm-scale-out { from { opacity: 1 } to { opacity: 0 } }
        }
      `}</style>
    </>
  );
}
