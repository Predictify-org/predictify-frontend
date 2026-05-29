/**
 * POST /api/webhooks/dlq/:dlqId/replay
 *
 * Re-enqueues a dead-lettered webhook delivery through the delivery worker.
 *
 * ## Authorization
 * Requires internal-service HMAC auth (x-streampay-signature et al.) OR a
 * valid admin JWT. This route is NEVER publicly reachable — it must sit
 * behind an internal network boundary or API gateway rule in production.
 *
 * ## Idempotency
 * A DLQ entry that has already been replayed returns HTTP 200 with the
 * existing delivery ID and `alreadyReplayed: true`. A double-click never
 * double-delivers.
 *
 * ## Error codes
 * | Code                  | HTTP | Meaning                                      |
 * |---|---|---|
 * | INTERNAL_AUTH_REQUIRED | 401 | Missing / invalid internal-service signature |
 * | DLQ_ENTRY_NOT_FOUND   | 404  | No DLQ entry with the given dlqId            |
 * | REPLAY_FAILED         | 502  | Worker failed to enqueue the replay          |
 */

import { NextResponse } from "next/server";
import { requireInternalServiceAuth } from "@/app/lib/internal-service-auth";
import { tryAuthenticateRequest } from "@/app/lib/auth";
import { webhookDeliveryWorker } from "@/app/lib/webhook-delivery-worker";
import { webhookDeliveryStore } from "@/app/lib/webhook-delivery-store";
import { logger, withCorrelationContext, getCorrelationContext } from "@/app/lib/logger";

// ── Helpers ───────────────────────────────────────────────────────────────────

function errorResponse(code: string, message: string, status: number) {
  const ctx = getCorrelationContext();
  return NextResponse.json(
    { error: { code, message, request_id: ctx?.request_id ?? "unknown" } },
    { status },
  );
}

/**
 * Verify the caller is either an internal service (HMAC) or an admin JWT.
 * Returns null on success, or a NextResponse error to return immediately.
 */
async function authenticate(request: Request): Promise<NextResponse | null> {
  // 1. Try internal-service HMAC auth first (preferred for machine callers).
  //    concealFailure=false so operators get a clear 401 rather than a 404.
  const internalResult = await requireInternalServiceAuth(request, {
    concealFailure: false,
  });

  // requireInternalServiceAuth returns the identity object on success,
  // or a NextResponse on failure.
  if (!(internalResult instanceof NextResponse)) {
    // Internal-service auth passed.
    return null;
  }

  // 2. Fall back to admin JWT auth (human operators via dashboard/CLI).
  const jwtIdentity = tryAuthenticateRequest(request);
  if (jwtIdentity && jwtIdentity.role === "admin") {
    return null;
  }

  // Neither auth method passed — return the internal-service error response.
  return internalResult;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ dlqId: string }> },
) {
  const { dlqId } = await params;

  // ── Correlation context ────────────────────────────────────────────────────
  withCorrelationContext({
    correlation_id:
      request.headers.get("X-Correlation-ID") ?? `dlq-replay-${crypto.randomUUID()}`,
    request_id: `req-${crypto.randomUUID()}`,
  });
  const ctx = getCorrelationContext();

  logger.info("DLQ replay requested", {
    dlq_id:         dlqId,
    correlation_id: ctx?.correlation_id,
  });

  // ── Auth ───────────────────────────────────────────────────────────────────
  const authError = await authenticate(request);
  if (authError) {
    logger.warn("DLQ replay rejected: unauthorized", {
      dlq_id:         dlqId,
      correlation_id: ctx?.correlation_id,
    });
    return authError;
  }

  // ── Existence check ────────────────────────────────────────────────────────
  const dlqEntry = webhookDeliveryStore.getDLQEntry(dlqId);
  if (!dlqEntry) {
    logger.warn("DLQ replay rejected: entry not found", {
      dlq_id:         dlqId,
      correlation_id: ctx?.correlation_id,
    });
    return errorResponse("DLQ_ENTRY_NOT_FOUND", `DLQ entry '${dlqId}' not found.`, 404);
  }

  // ── Replay (idempotent) ────────────────────────────────────────────────────
  const result = await webhookDeliveryWorker.replayFromDLQ(dlqId);

  if (!result.ok) {
    logger.error("DLQ replay failed", {
      dlq_id:         dlqId,
      error:          result.error,
      correlation_id: ctx?.correlation_id,
    });
    return errorResponse("REPLAY_FAILED", result.error ?? "Failed to replay DLQ entry.", 502);
  }

  // ── Response ───────────────────────────────────────────────────────────────
  const deliveryId = result.alreadyReplayed
    ? result.existingDeliveryId
    : result.newDeliveryId;

  logger.info("DLQ replay enqueued", {
    dlq_id:          dlqId,
    delivery_id:     deliveryId,
    already_replayed: result.alreadyReplayed,
    correlation_id:  ctx?.correlation_id,
  });

  return NextResponse.json({
    data: {
      dlqId,
      deliveryId,
      /**
       * true  → this entry was already replayed; the existing delivery is
       *         returned and no new delivery was created (idempotent).
       * false → a new delivery was created and enqueued.
       */
      alreadyReplayed: result.alreadyReplayed,
      endpointId:  dlqEntry.endpointId,
      endpointUrl: dlqEntry.endpointUrl,
      eventId:     dlqEntry.eventId,
      eventType:   dlqEntry.eventType,
      replayedAt:  result.alreadyReplayed
        ? dlqEntry.replayedAt
        : new Date().toISOString(),
    },
    links: {
      dlq:      `/api/webhooks/dlq`,
      delivery: `/api/webhooks/deliveries?endpoint_id=${dlqEntry.endpointId}`,
    },
  });
}
