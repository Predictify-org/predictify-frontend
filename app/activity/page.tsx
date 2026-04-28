import { EmptyState } from "../components/EmptyState";
import Link from "next/link";

export default function ActivityPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <EmptyState
        title="Activity will appear here"
        description="Any payment stream updates, payments, or wallet events will show up once activity begins. Stay connected to monitor your flow."
        eyebrow="Activity"
        actionLabel="View streams"
      />
    </main>
  );
}
