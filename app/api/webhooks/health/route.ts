import { NextResponse } from "next/server";
import { errorResponse, ErrorCode } from "@/app/lib/errors/server";

/**
 * GET /api/webhooks/health
 *
 * Returns the health status of the webhook delivery system along with
 * per-subscription delivery statistics.
 *
 * Response shape:
 * ```json
 * {
 *   "status": "ok",
 *   "checked_at": "2024-01-01T00:00:00.000Z",
 *   "subscriptions": {
 *     "total": 0,
 *     "active": 0,
 *     "degraded": 0,
 *     "disabled": 0
 *   },
 *   "delivery_stats": {
 *     "total": 0,
 *     "delivered": 0,
 *     "failed": 0,
 *     "pending": 0,
 *     "dlq": 0,
 *     "success_rate_pct": 100
 *   }
 * }
 * ```
 */

export interface WebhookSubscriptionStats {
  total: number;
  active: number;
  degraded: number;
  disabled: number;
}

export interface WebhookDeliveryStats {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  dlq: number;
  /** Percentage of deliveries that succeeded (0–100). */
  success_rate_pct: number;
}

export interface WebhookHealthResponse {
  status: "ok" | "degraded" | "unhealthy";
  checked_at: string;
  subscriptions: WebhookSubscriptionStats;
  delivery_stats: WebhookDeliveryStats;
}

/**
 * Derive an overall health status from subscription and delivery stats.
 *
 * Rules:
 * - "unhealthy" when more than 50 % of subscriptions are degraded/disabled
 * - "degraded"  when any subscriptions are degraded or DLQ depth > 0
 * - "ok"        otherwise
 */
export function deriveHealthStatus(
  subs: WebhookSubscriptionStats,
  stats: WebhookDeliveryStats,
): WebhookHealthResponse["status"] {
  const degradedRatio =
    subs.total > 0 ? (subs.degraded + subs.disabled) / subs.total : 0;
  if (degradedRatio > 0.5) return "unhealthy";
  if (subs.degraded > 0 || stats.dlq > 0) return "degraded";
  return "ok";
}

export async function GET() {
  try {
    // TODO: replace stubs with real data-layer queries once persistence is wired up.
    const subscriptions: WebhookSubscriptionStats = {
      total: 0,
      active: 0,
      degraded: 0,
      disabled: 0,
    };

    const delivery_stats: WebhookDeliveryStats = {
      total: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      dlq: 0,
      success_rate_pct: 100,
    };

    const status = deriveHealthStatus(subscriptions, delivery_stats);
    const checked_at = new Date().toISOString();

    const body: WebhookHealthResponse = {
      status,
      checked_at,
      subscriptions,
      delivery_stats,
    };

    return NextResponse.json(body, { status: 200 });
  } catch {
    return errorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      "Failed to retrieve webhook health stats.",
      500,
    );
  }
}
