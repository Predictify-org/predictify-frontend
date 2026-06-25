"use client";

import { useState, useEffect } from "react";
import { EmptyState } from "../components/EmptyState";
import { ActivityTimeline, ActivityTimelineSkeleton, type ActivityGroup } from "../components/ActivityTimeline";

const MOCK_ACTIVITY: ActivityGroup[] = [
  {
    date: "Today",
    events: [
      {
        id: "1",
        type: "stream_created",
        title: "New stream created for Project Alpha",
        timestamp: "2 hours ago",
        link: "/streams/alpha",
        status: "accent",
      },
      {
        id: "2",
        type: "wallet_connected",
        title: "Wallet connected (G...7X9)",
        timestamp: "5 hours ago",
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
        timestamp: "20 hours ago",
        link: "/receipt/settle-123",
        status: "info",
      },
      {
        id: "4",
        type: "funds_withdrawn",
        title: "1,200.50 XLM withdrawn to wallet",
        timestamp: "1 day ago",
        link: "/receipt/withdraw-456",
        status: "warning",
      },
    ],
  },
];

export default function ActivityPage() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityGroup[]>([]);

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => {
      setActivities(MOCK_ACTIVITY);
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "4rem 2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ maxWidth: "48rem", width: "100%", marginBottom: "3rem" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>Activity</h1>
        <p style={{ color: "var(--muted-light)", fontSize: "1.1rem" }}>
          Track every transaction, status update, and wallet event in real-time.
        </p>
      </div>

      {loading ? (
        <ActivityTimelineSkeleton />
      ) : activities.length > 0 ? (
        <ActivityTimeline groups={activities} />
      ) : (
        <EmptyState
          eyebrow="Activity"
          title="Activity will appear here"
          description="Any payment stream updates, payments, or wallet events will show up once activity begins. Stay connected to monitor your flow."
          actionLabel="View streams"
        />
      )}
    </main>
  );
}
