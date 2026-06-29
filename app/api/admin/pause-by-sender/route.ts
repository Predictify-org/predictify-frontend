/**
 * POST /api/admin/pause-by-sender
 *
 * Admin emergency pause for all active streams from a given sender address.
 * Gated by admin auth — only the admin address may call this.
 *
 * Body: { "senderAddress": "G..." }
 *
 * On success, returns a list of all streams that were paused (active streams
 * belonging to the sender). Streams in non-active states are silently skipped.
 *
 * ## Error codes
 * | Status | Code                    | Reason                                   |
 * |--------|-------------------------|------------------------------------------|
 * | 403    | Unauthorized            | Caller is not the admin.                 |
 * | 422    | VALIDATION_ERROR        | Request body fails schema validation.    |
 * | 400    | INVALID_REQUEST         | Request body must be valid JSON.         |
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-guard";
import { db } from "@/app/lib/db";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";
import { getCorrelationContext, logger, withCorrelationContext } from "@/app/lib/logger";
import crypto from "crypto";
import type { Stream } from "@/app/types/openapi";

function errorResponse(code: string, message: string, status: number) {
  const ctx = getCorrelationContext();
  return NextResponse.json(
    { error: { code, message, request_id: ctx?.request_id ?? "unknown" } },
    { status },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const correlation_id =
    request.headers.get("X-Correlation-ID") ?? `admin-pause-${crypto.randomUUID()}`;
  const request_id = `req-${crypto.randomUUID()}`;

  return withCorrelationContext({ correlation_id, request_id }, async () => {
    const ctx = getCorrelationContext();

    logger.info("Admin pause-by-sender request received", {
      correlation_id: ctx?.correlation_id,
    });

    // ── Admin auth ─────────────────────────────────────────────────────────
    const adminResult = requireAdmin(request);
    if (adminResult instanceof NextResponse) {
      logger.warn("Admin pause-by-sender rejected: unauthorized", {
        correlation_id: ctx?.correlation_id,
      });
      return adminResult;
    }

    // ── Parse body ─────────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("INVALID_REQUEST", "Request body must be valid JSON.", 400);
    }

    const { senderAddress } = body as Record<string, unknown>;
    if (typeof senderAddress !== "string" || senderAddress.trim().length === 0) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Body must contain { senderAddress: string }.",
        422,
      );
    }

    const trimmedSender = senderAddress.trim();

    logger.info("Admin pause-by-sender authenticated", {
      senderAddress: trimmedSender,
      correlation_id: ctx?.correlation_id,
    });

    // ── Find streams by sender ─────────────────────────────────────────────
    const allStreams: Stream[] = [];
    db.streams.forEach((stream: Stream) => {
      allStreams.push(stream);
    });

    const senderStreams = allStreams.filter(
      (s) => s.senderAddress?.trim() === trimmedSender,
    );

    const activeStreams = senderStreams.filter((s) => s.status === "active");

    logger.info("Admin pause-by-sender streams found", {
      senderAddress: trimmedSender,
      total_streams: senderStreams.length,
      active_streams: activeStreams.length,
      correlation_id: ctx?.correlation_id,
    });

    // ── Pause each active stream ───────────────────────────────────────────
    const now = new Date().toISOString();
    const paused: Stream[] = [];

    for (const stream of activeStreams) {
      const before = { ...stream };

      const updated: Stream = {
        ...stream,
        status: "paused",
        nextAction: "stop",
        pausedAt: now,
        updatedAt: now,
      };

      db.streams.set(stream.id, updated);

      recordPrivilegedStreamAuditEvent({
        action: "admin.pause-by-sender",
        after: updated as any,
        before: before as any,
        request,
        streamId: stream.id,
        targetAccount: stream.recipient,
        metadata: { senderAddress: trimmedSender, pausedAt: now },
      });

      paused.push(updated);
    }

    logger.info("Admin pause-by-sender completed", {
      senderAddress: trimmedSender,
      paused_count: paused.length,
      correlation_id: ctx?.correlation_id,
    });

    return NextResponse.json({
      data: {
        paused,
        count: paused.length,
        senderAddress: trimmedSender,
      },
    });
  });
}
