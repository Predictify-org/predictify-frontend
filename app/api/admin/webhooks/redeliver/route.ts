/**
 * POST /api/admin/webhooks/redeliver
 *
 * Force-redeliver a webhook event by its delivery ID.
 *
 * Creates a brand-new delivery with the same endpoint and event payload as the
 * original delivery, then processes it through the standard retry lifecycle.
 * The original delivery record is left unchanged so its audit trail is intact.
 *
 * ## Authorization
 * Requires internal-service HMAC auth OR a valid admin JWT. This route is
 * NEVER publicly reachable - it must sit behind an internal network boundary
 * or API gateway rule in production.
 *
 * ## Data availability
 * Deliveries recorded *before* the introduction of full event/endpoint
 * snapshots lack the data needed for redelivery and return HTTP 400.
 * Use the DLQ replay route (`POST /api/webhooks/dlq/:dlqId/replay`) for
 * those older deliveries.
 *
 * ## Error codes
 * | Code                    | HTTP | Meaning                                      |
 * |---|---|---|
 * | INTERNAL_AUTH_REQUIRED  | 401  | Missing / invalid internal-service signature  |
 * | DELIVERY_NOT_FOUND      | 404  | No delivery with the given deliveryId         |
 * | DELIVERY_NO_SNAPSHOT    | 400  | Delivery exists but lacks event/endpoint data |
 * | INVALID_REQUEST_BODY    | 400  | Request body is malformed JSON                |
 * | VALIDATION_ERROR        | 400  | Request body fails schema validation          |
 */

import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireInternalServiceAuth } from "@/app/lib/internal-service-auth";
import { tryAuthenticateRequest } from "@/app/lib/auth";
import { webhookDeliveryWorker } from "@/app/lib/webhook-delivery-worker";
import { logger, withCorrelationContext, getCorrelationContext } from "@/app/lib/logger";
import { z } from "zod";

const redeliverSchema = z.object({
  deliveryId: z.string().min(1, "deliveryId is required"),
});

function errorResponse(code: string, message: string, status: number) {
  const ctx = getCorrelationContext();
  return NextResponse.json(
    { error: { code, message, request_id: ctx?.request_id ?? "unknown" } },
    { status },
  );
}

async function authenticate(request: Request): Promise<NextResponse | null> {
  const internalResult = await requireInternalServiceAuth(request, {
    concealFailure: false,
  });

  if (!(internalResult instanceof NextResponse)) {
    return null;
  }

  const jwtIdentity = tryAuthenticateRequest(request);
  if (jwtIdentity && jwtIdentity.role === "admin") {
    return null;
  }

  return internalResult;
}

export async function POST(request: Request): Promise<NextResponse> {
  const correlation_id =
    request.headers.get("X-Correlation-ID") ?? `redeliver-${crypto.randomUUID()}`;
  const request_id = `req-${crypto.randomUUID()}`;

  return withCorrelationContext({ correlation_id, request_id }, async () => {
    const ctx = getCorrelationContext();

    logger.info("Admin redeliver request received", {
      correlation_id: ctx?.correlation_id,
    });

    // ── Auth ─────────────────────────────────────────────────────────────────
    const authError = await authenticate(request);
    if (authError) {
      logger.warn("Admin redeliver rejected: unauthorized", {
        correlation_id: ctx?.correlation_id,
      });
      return authError;
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "INVALID_REQUEST_BODY",
        "Request body is not valid JSON.",
        400,
      );
    }

    const parsed = redeliverSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return errorResponse(
        "VALIDATION_ERROR",
        firstIssue?.message ?? "Validation failed",
        400,
      );
    }

    const { deliveryId } = parsed.data;

    logger.info("Admin redeliver authenticated", {
      delivery_id:     deliveryId,
      correlation_id:  ctx?.correlation_id,
    });

    // ── Redeliver ────────────────────────────────────────────────────────────
    const result = await webhookDeliveryWorker.reissueDelivery(deliveryId);

    if (!result.ok) {
      if (result.error?.includes("not found")) {
        return errorResponse("DELIVERY_NOT_FOUND", result.error!, 404);
      }
      return errorResponse("DELIVERY_NO_SNAPSHOT", result.error!, 400);
    }

    logger.info("Admin redeliver succeeded", {
      original_delivery_id: deliveryId,
      new_delivery_id:      result.newDeliveryId,
      correlation_id:       ctx?.correlation_id,
    });

    return NextResponse.json({
      data: {
        deliveryId: result.newDeliveryId,
        originalDeliveryId: deliveryId,
      },
      links: {
        delivery: `/api/webhooks/deliveries?delivery_id=${result.newDeliveryId}`,
      },
    });
  });
}
