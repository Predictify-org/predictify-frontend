"use client";

import { useMemo, useState } from "react";
import { CopyAddress } from "./CopyAddress";
import { Timestamp } from "./Timestamp";

/**
 * Contract event types emitted by the StreamPay Soroban contract over a
 * stream's lifecycle. Mirrors the on-chain event topics; keep in sync with the
 * contract's emitted events when new lifecycle actions are added.
 */
export type ContractEventType =
  | "created"
  | "started"
  | "paused"
  | "resumed"
  | "withdrawn"
  | "settled"
  | "cancelled";

/**
 * A single contract event surfaced from the chain for a given stream.
 *
 * Timestamps are ISO-8601 UTC strings. `txHash` is the Soroban transaction
 * hash that emitted the event and `ledger` is the ledger sequence number it
 * was included in. `amount` is an optional human-readable value label (e.g.
 * "120 XLM") for events that move funds.
 */
export type ContractEvent = {
  id: string;
  type: ContractEventType;
  /** Human-readable summary of what happened on-chain. */
  summary: string;
  /** ISO-8601 UTC timestamp the event was emitted. */
  timestamp: string;
  /** Soroban transaction hash that emitted the event. */
  txHash: string;
  /** Ledger sequence number the event was included in. */
  ledger: number;
  /** Optional value label for fund-moving events (e.g. "120 XLM"). */
  amount?: string;
};

/**
 * Presentation metadata for each event type. `status` reuses the shared
 * activity-timeline dot variants so the panel stays visually consistent with
 * the global Activity feed (and inherits dark-mode tokens for free).
 */
const EVENT_META: Record<
  ContractEventType,
  { label: string; status: "success" | "info" | "warning" | "accent" }
> = {
  created: { label: "Created", status: "accent" },
  started: { label: "Started", status: "success" },
  resumed: { label: "Resumed", status: "success" },
  paused: { label: "Paused", status: "warning" },
  cancelled: { label: "Cancelled", status: "warning" },
  withdrawn: { label: "Withdrawn", status: "info" },
  settled: { label: "Settled", status: "info" },
};

/** Canonical ordering used to render the filter chips deterministically. */
const TYPE_ORDER: ContractEventType[] = [
  "created",
  "started",
  "paused",
  "resumed",
  "withdrawn",
  "settled",
  "cancelled",
];

type FilterValue = "all" | ContractEventType;

interface EventTimelineProps {
  events: ContractEvent[];
}

/**
 * EventTimeline — contract events panel for a stream.
 *
 * Renders recent on-chain contract events as an accessible vertical timeline
 * with a type filter. The filter is a single-select toolbar (segmented
 * control) exposed via `aria-pressed`, and the visible-event count is
 * announced through a polite live region for screen readers.
 *
 * Accessibility (WCAG 2.1 AA):
 * - Filter controls are real buttons in a labelled `group` with `aria-pressed`.
 * - Result count changes are announced via `role="status"` / `aria-live`.
 * - Each event exposes a descriptive `aria-label` summarising type + time.
 */
export function EventTimeline({ events }: EventTimelineProps) {
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");

  // Newest first; defensive copy so we never mutate the caller's array.
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [events],
  );

  // Only offer filter chips for types that actually appear in the data.
  const availableTypes = useMemo(() => {
    const present = new Set(sortedEvents.map((event) => event.type));
    return TYPE_ORDER.filter((type) => present.has(type));
  }, [sortedEvents]);

  const visibleEvents = useMemo(
    () =>
      activeFilter === "all"
        ? sortedEvents
        : sortedEvents.filter((event) => event.type === activeFilter),
    [sortedEvents, activeFilter],
  );

  const countFor = (filter: FilterValue) =>
    filter === "all"
      ? sortedEvents.length
      : sortedEvents.filter((event) => event.type === filter).length;

  const renderChip = (filter: FilterValue, label: string) => {
    const isActive = activeFilter === filter;
    return (
      <button
        key={filter}
        type="button"
        className={`event-filter-chip${isActive ? " event-filter-chip--active" : ""}`}
        aria-pressed={isActive}
        onClick={() => setActiveFilter(filter)}
      >
        {label}
        <span className="event-filter-chip__count">{countFor(filter)}</span>
      </button>
    );
  };

  return (
    <section className="event-panel" aria-labelledby="contract-events-heading">
      <div className="event-panel__header">
        <h2 id="contract-events-heading" className="detail-card__heading">
          Contract Events
        </h2>
        <p className="event-panel__subtitle">
          Recent on-chain activity emitted by the stream contract.
        </p>
      </div>

      <div
        className="event-filters"
        role="group"
        aria-label="Filter contract events by type"
      >
        {renderChip("all", "All")}
        {availableTypes.map((type) => renderChip(type, EVENT_META[type].label))}
      </div>

      {/* Polite live region announces the visible count to assistive tech. */}
      <p className="event-panel__count" role="status" aria-live="polite">
        Showing {visibleEvents.length} of {sortedEvents.length} event
        {sortedEvents.length === 1 ? "" : "s"}
      </p>

      {visibleEvents.length === 0 ? (
        <p className="event-panel__empty">
          No contract events match this filter yet.
        </p>
      ) : (
        <ul className="activity-timeline">
          {visibleEvents.map((event) => {
            const meta = EVENT_META[event.type];
            return (
              <li
                key={event.id}
                className="activity-item"
                aria-label={`${meta.label} event`}
              >
                <div className="activity-marker">
                  <div className={`activity-dot activity-dot--${meta.status}`} />
                  <div className="activity-line" />
                </div>
                <div className="activity-content">
                  <div className="activity-card event-card">
                    <div className="activity-info">
                      <div className="event-card__row">
                        <span className="event-type-tag">{meta.label}</span>
                        {event.amount && (
                          <span className="event-amount">{event.amount}</span>
                        )}
                      </div>
                      <span className="activity-title">{event.summary}</span>
                      <Timestamp className="activity-time" iso={event.timestamp} />
                      <dl className="event-meta">
                        <div className="event-meta__item">
                          <dt>Tx</dt>
                          <dd>
                            <CopyAddress value={event.txHash} truncateChars={6} />
                          </dd>
                        </div>
                        <div className="event-meta__item">
                          <dt>Ledger</dt>
                          <dd>
                            <code className="receipt-mono">
                              {event.ledger.toLocaleString("en-US")}
                            </code>
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Loading placeholder mirroring the EventTimeline layout. */
export function EventTimelineSkeleton() {
  return (
    <section className="event-panel" aria-hidden="true">
      <div className="event-panel__header">
        <div className="skeleton" style={{ height: "1.25rem", width: "10rem", marginBottom: "0.5rem" }} />
        <div className="skeleton" style={{ height: "0.875rem", width: "16rem" }} />
      </div>
      <div className="event-filters">
        {[1, 2, 3, 4].map((chip) => (
          <div key={chip} className="skeleton" style={{ height: "2rem", width: "5rem", borderRadius: "999px" }} />
        ))}
      </div>
      <ul className="activity-timeline">
        {[1, 2, 3].map((item) => (
          <li key={item} className="activity-item">
            <div className="activity-marker">
              <div className="activity-dot" style={{ background: "var(--skeleton-base)" }} />
              <div className="activity-line" style={{ background: "var(--skeleton-base)" }} />
            </div>
            <div className="activity-content">
              <div className="activity-card event-card" style={{ borderStyle: "dashed" }}>
                <div className="activity-info">
                  <div className="skeleton" style={{ height: "0.875rem", width: "5rem", marginBottom: "0.5rem" }} />
                  <div className="skeleton" style={{ height: "1rem", width: "14rem", marginBottom: "0.5rem" }} />
                  <div className="skeleton" style={{ height: "0.75rem", width: "8rem" }} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
