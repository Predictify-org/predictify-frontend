import { DisputePanelSkeleton } from "@/components/disputes/DisputePanelSkeleton";

/**
 * Route-level loading fallback for the disputes dashboard.
 *
 * Previously returned `null`, which left a flash-of-empty-content during
 * route navigation. Now renders the same shape-preserving skeleton that
 * `<DisputePanel />` falls back to when no data is available, so the first
 * paint matches the resolved card exactly and avoids layout shift.
 */
export default function Loading() {
  return <DisputePanelSkeleton />;
}
