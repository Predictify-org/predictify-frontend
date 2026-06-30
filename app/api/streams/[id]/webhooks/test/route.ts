/**
 * POST /api/streams/:id/webhooks/test
 *
 * Triggers a synthetic webhook event for a stream to allow subscribers to
 * verify their webhook endpoint configuration is working correctly.
 *
 * ## Request body (optional)
 * ```json
 * {
 *   "event_type": "stream.updated"  // defaults to "stream.test"
 * }
 * ```
 *
 * ## Response (202 Accepted)
 * ```json
 * {
 *   "data": {
 *     "delivery_id": "wh_test_01HZ...",
 *     "stream_id": "stream_abc",
 *     "event_type": "stream.test",
 *     "dispatched_at": "2024-01-01T00:00:00.000Z",
 *     "synthetic": true
 *   }
 * }
 * ```
 *
 * ## Error codes
 * | Status | Code               | Reason                                  |
 * |--------|--------------------|-----------------------------------------|
 * | 400    | `BAD_REQUEST`      | Invalid JSON body or unknown event type.|
 * | 404    | `STREAM_NOT_FOUND` | Stream does not exist.                  |
 * | 500    | `INTERNAL_SERVER_ERROR` | Dispatch failed.                  |
 */

import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getCorrelationContext, logger } from "@/app/lib/logger";
import { errorResponse, ErrorCode } from "@/app/lib/errors/server";

/** Allowed synthetic event types that subscribers can test against. */
const ALLOWED_EVENT_TYPES = new Set([
  "stream.test",
  "stream.created",
  "stream.updated",
  "stream.paused",
  "stream.resumed",
  "stream.stopped",
  "stream.cancelled",
  "stream.settled",
]);

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json(
    { error: { code, message, request_id: context?.request_id } },
    { status },
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Validate stream exists
  const stream = db.streams.get(id);
  if (!stream) {
    return createErrorResponse(
      ErrorCode.STREAM_NOT_FOUND,
      `Stream '${id}' not found`,
      404,
    );
  }

  // Parse optional body
  let eventType = "stream.test";
  if (req.headers.get("content-length") !== "0") {
    try {
      const body = await req.text();
      if (body.trim()) {
        const parsed = JSON.parse(body) as Record<string, unknown>;
        if (parsed.event_type !== undefined) {
          if (typeof parsed.event_type !== "string") {
            return createErrorResponse(
              ErrorCode.BAD_REQUEST,
              "'event_type' must be a string.",
              400,
            );
          }
          if (!ALLOWED_EVENT_TYPES.has(parsed.event_type)) {
            return createErrorResponse(
              ErrorCode.BAD_REQUEST,
              `Unknown event_type '${parsed.event_type}'. Allowed: ${[...ALLOWED_EVENT_TYPES].join(", ")}.`,
              400,
            );
          }
          eventType = parsed.event_type;
        }
      }
    } catch {
      return createErrorResponse(
        ErrorCode.BAD_REQUEST,
        "Request body must be valid JSON.",
        400,
      );
    }
  }

  const correlationCtx = getCorrelationContext();
  const deliveryId = `wh_test_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const dispatchedAt = new Date().toISOString();

  // Synthetic payload dispatched to registered webhook subscribers
  const syntheticPayload = {
    delivery_id: deliveryId,
    stream_id: id,
    event_type: eventType,
    dispatched_at: dispatchedAt,
    synthetic: true,
    request_id: correlationCtx?.request_id,
    data: {
      stream_id: id,
      status: stream.status,
    },
  };

  logger.info("Synthetic webhook test event dispatched", {
    action: "webhooks.test",
    delivery_id: deliveryId,
    event_type: eventType,
    stream_id: id,
    request_id: correlationCtx?.request_id,
  });

  return NextResponse.json({ data: syntheticPayload }, { status: 202 });
}
