/**
 * org-quota.ts
 *
 * Per-org daily stream creation quota enforcement.
 *
 * Usage:
 *   const result = await checkOrgDailyQuota(orgId);
 *   if (!result.allowed) {
 *     return orgQuotaResponse(result.retryAfter);
 *   }
 *
 * The quota limit and window are controlled by ORG_DAILY_STREAM_QUOTA in
 * app/lib/rate-limit-config.ts so operators can tune them without touching
 * business logic.
 */

import { NextResponse } from "next/server";
import { ORG_DAILY_STREAM_QUOTA } from "./rate-limit-config";
import { getOrgQuotaStore } from "./org-quota-store";
import { recordOrgQuotaRejection } from "./org-quota-metrics";

export interface OrgQuotaResult {
  allowed: boolean;
  /** Streams created today (after incrementing). */
  used: number;
  /** Configured daily limit for this org. */
  limit: number;
  /** Seconds until the quota window resets (only set when allowed === false). */
  retryAfter?: number;
}

/**
 * Atomically increments the org's daily stream counter and checks it against
 * the configured quota.
 *
 * The counter is incremented optimistically before the stream is persisted.
 * If the downstream write fails, the caller should NOT roll back the counter —
 * the off-by-one is negligible and avoids race conditions on rollback.
 */
export async function checkOrgDailyQuota(orgId: string): Promise<OrgQuotaResult> {
  const store = getOrgQuotaStore();
  const { limit } = ORG_DAILY_STREAM_QUOTA;

  const { count, retryAfter } = await store.increment(orgId);

  if (count > limit) {
    // Counter exceeded — record a metric and report rejection.
    recordOrgQuotaRejection(orgId);
    return { allowed: false, used: count, limit, retryAfter };
  }

  return { allowed: true, used: count, limit };
}

/**
 * Returns a well-formed 429 response with:
 *   - `Retry-After` header (seconds until UTC midnight reset)
 *   - JSON error body matching the project's error envelope
 */
export function orgQuotaResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "ORG_DAILY_QUOTA_EXCEEDED",
        message:
          "Your organisation has reached the daily stream creation limit. " +
          "Quota resets at UTC midnight.",
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    },
  );
}
