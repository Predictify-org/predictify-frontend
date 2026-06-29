"use client";

import { useState, useEffect, useCallback } from "react";
import { EmptyState } from "../components/EmptyState";
import { PageError } from "../components/PageError";
import {
  ActivityTimeline,
  ActivityTimelineSkeleton,
  type ActivityGroup,
} from "../components/ActivityTimeline";

type ActivityPageState = "loading" | "populated" | "empty" | "error";

const MOCK_ACTIVITY: ActivityGroup[] = [
  {
    date: "Today",
    events: [
      {
        id: "1",
        type: "stream_created",
        title: "New stream created for Project Alpha",
        timestamp: "2026-06-27T10:00:00.000Z",
        link: "/streams/alpha",
        status: "accent",
      },
      {
        id: "2",
        type: "wallet_connected",
        title: "Wallet connected (G...7X9)",
        timestamp: "2026-06-27T07:00:00.000Z",
        status: "success",
      },
    ],
  },
  {
    date: "Yesterday",
    events: [
      {
        id: "3",
        type: "stream_settled",
        title: "Design Retainer stream settled",
        timestamp: "2026-06-26T16:00:00.000Z",
        link: "/receipt/settle-123",
        status: "info",
      },
      {
        id: "4",
        type: "funds_withdrawn",
        title: "1,200.50 XLM withdrawn to wallet",
        timestamp: "2026-06-26T12:00:00.000Z",
        link: "/receipt/withdraw-456",
        status: "warning",
      },
    ],
  },
];

export default function ActivityPage() {
  const [pageState, setPageState] = useState<ActivityPageState>("loading");
  const [activities, setActivities] = useState<ActivityGroup[]>([]);
  // Incrementing this key re-triggers the data-loading effect (retry).
  const [loadKey, setLoadKey] = useState(0);

  const handleRetry = useCallback(() => {
    setLoadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    setPageState("loading");

    // In production replace with a real API call; reject to exercise error path.
    const timer = setTimeout(() => {
      setActivities(MOCK_ACTIVITY);
      setPageState(MOCK_ACTIVITY.length > 0 ? "populated" : "empty");
    }, 1500);

    return () => clearTimeout(timer);
  }, [loadKey]);

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="page-hero__eyebrow">Activity</p>
          <h1 className="page-hero__title">Track every event.</h1>
          <p className="page-hero__description">
            Every transaction, status update, and wallet event — visible the
            moment it happens.
          </p>
        </div>
      </section>

      {/*
       * aria-live="polite" lets screen readers announce content changes without
       * interrupting. aria-busy signals that a fetch is in progress so assistive
       * technology can defer reading until data arrives.
       */}
      <section
        aria-busy={pageState === "loading"}
        aria-labelledby="activity-overview-title"
        aria-live="polite"
        className="stream-layout"
      >
        <div className="section-heading">
          <div>
            <h2 className="section-heading__title" id="activity-overview-title">
              Activity feed
            </h2>
            <p className="section-heading__description">
              Payments, stream lifecycle changes, and wallet events appear here
              as they happen.
            </p>
          </div>
        </div>

        {/* Screen-reader-only live announcement for state changes */}
        <span aria-live="polite" className="sr-only" role="status">
          {pageState === "loading"
            ? "Loading activity feed…"
            : pageState === "error"
              ? "Failed to load activity feed."
              : ""}
        </span>

        {pageState === "loading" ? (
          <ActivityTimelineSkeleton />
        ) : pageState === "error" ? (
          <PageError
            heading="Couldn't load your activity"
            message="There was a problem fetching your activity feed. Check your connection and try again."
            onRetry={handleRetry}
          />
        ) : activities.length > 0 ? (
          <ActivityTimeline groups={activities} />
        ) : (
          <EmptyState
            actionLabel="View streams"
            description="Any payment stream updates, payments, or wallet events will show up once activity begins. Stay connected to monitor your flow."
            eyebrow="Activity"
            title="Activity will appear here"
          />
        )}
      </section>
    </main>
  );
}
