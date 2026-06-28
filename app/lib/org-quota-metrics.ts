/**
 * org-quota-metrics.ts
 *
 * Lightweight in-process metrics for org daily quota rejections.
 *
 * Mirrors the shape of rate-limit-metrics.ts so that dashboards and
 * log-scrapers can handle both with the same pattern.
 *
 * In production, replace the console.warn call with your observability
 * pipeline (e.g. emit a CloudWatch metric or push to a StatsD client).
 */

interface QuotaRejectionEvent {
  orgId: string;
  timestamp: string;
}

/** Total rejections per orgId. */
const rejectionCounters = new Map<string, number>();

/** Ring buffer of the 100 most recent rejection events. */
const recentRejections: QuotaRejectionEvent[] = [];
const MAX_RECENT = 100;

/**
 * Records a single quota rejection for the given org.
 * Increments the counter, appends to the ring buffer, and emits a
 * structured log line for log-based alerting.
 */
export function recordOrgQuotaRejection(orgId: string): void {
  rejectionCounters.set(orgId, (rejectionCounters.get(orgId) ?? 0) + 1);

  const event: QuotaRejectionEvent = {
    orgId,
    timestamp: new Date().toISOString(),
  };

  recentRejections.push(event);
  if (recentRejections.length > MAX_RECENT) {
    recentRejections.shift();
  }

  // Structured log — consumed by log-based alerting and metrics pipelines.
  console.warn(
    JSON.stringify({
      event: "org_daily_quota_exceeded",
      orgId,
      timestamp: event.timestamp,
    }),
  );
}

/** Returns a snapshot of all quota-rejection metrics. */
export function getOrgQuotaMetrics(): {
  rejections: Record<string, number>;
  recentRejections: QuotaRejectionEvent[];
} {
  return {
    rejections: Object.fromEntries(rejectionCounters),
    recentRejections: [...recentRejections],
  };
}

/** Resets all counters and the ring buffer. Use in tests' beforeEach. */
export function resetOrgQuotaMetrics(): void {
  rejectionCounters.clear();
  recentRejections.length = 0;
}
