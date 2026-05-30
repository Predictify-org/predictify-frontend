import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { logger } from "@/app/lib/logger";
import { getCorrelationContext } from "@/app/lib/correlation-middleware";
import { redact } from "@/app/lib/privacy";
/**
 * POST /api/streams/[id]/pause
 *
 * Transitions an active stream to "paused".
 *
 * ## Concurrency fix
 * The entire read-modify-write is wrapped in withLock(id, ...) — matching the
 * pattern used by settle, start, and stop — so that concurrent pause/start/stop
 * requests on the same stream are serialised and cannot interleave.
 *
 * ## Idempotency
 * The Idempotency-Key check is performed *inside* the lock so that two
 * concurrent requests carrying the same key cannot both pass the check and
 * double-apply the transition.
 *
 * ## Org-policy approval
 * If the stream has requiresApprovalToPause set, the handler returns 202 and
 * marks pendingApproval instead of immediately transitioning. A subsequent
 * approved request (without the flag) completes the transition.
 */

import { NextRequest, NextResponse } from "next/server";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";
import { db, idempotencyToken, withLock } from "@/app/lib/db";
import { getCorrelationContext } from "@/app/lib/logger";
import { checkStreamOrgPolicy } from "@/app/lib/org-policy";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";

// ── Helpers ───────────────────────────────────────────────────────────────────

function errorResponse(code: string, message: string, status: number) {
  const ctx = getCorrelationContext();
  return NextResponse.json(
    { error: { code, message, request_id: ctx?.request_id } },
    { status },
  );
}

function getHeader(req: Request, name: string): string | null {
  return req.headers?.get?.(name) ?? null;
}

function getRequestUrl(req: Request, fallback: string): URL {
  try {
    return req.url ? new URL(req.url) : new URL(`http://localhost${fallback}`);
  } catch {
    return new URL(`http://localhost${fallback}`);
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const correlationId = getCorrelationContext()?.correlationId || "unknown";
  
  const stream = db.streams.get(id);
  if (!stream) {
    logger.warn("Stream not found for pause action", { correlationId, streamId: id });
    return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }
  if (stream.status !== "active") {
    logger.warn("Invalid stream state for pause action", { correlationId, streamId: id, status: stream.status });
    return createErrorResponse("INVALID_STREAM_STATE", "Only active streams can be paused", 409);
  }
  stream.status = "paused";
  stream.nextAction = "start";
  stream.updatedAt = new Date().toISOString();
  db.streams.set(id, stream);
  
  logger.info("Stream paused successfully", { 
    correlationId, 
    streamId: id, 
    action: "pause", 
    status: "success", 
    stream: redact(stream) 
  });
  
  return NextResponse.json({ data: stream });
  const url = getRequestUrl(req, `/api/streams/${id}/pause`);
  const idempotencyKey = getHeader(req, "Idempotency-Key");

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const limitType = getLimitForRoute("POST", url.pathname);
  const identity = getClientIdentity(req);
  const result = await checkRateLimit(identity, limitType);

  if (!result.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(result.retryAfter!);
  }
  recordRequest(url.pathname);

  // ── Idempotency ────────────────────────────────────────────────────────────
  const token = idempotencyKey
    ? idempotencyToken(`streams.pause.${id}`, idempotencyKey)
    : null;

  // All reads and writes happen inside the lock — no state is touched outside.
  return withLock(id, async () => {
    // ── Idempotency check (inside lock) ──────────────────────────────────────
    // Must be re-evaluated after acquiring the lock. If we checked before the
    // lock, two concurrent requests with the same key could both see "no record"
    // and both proceed to mutate state.
    if (idempotencyKey) {
      const cached = db.idempotencyKeys[idempotencyKey];
      if (cached) {
        return NextResponse.json(cached.body, { status: cached.status });
      }
    }

    // ── Stream existence ──────────────────────────────────────────────────────
    const stream = db.streams[id];
    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    // ── Active → paused transition guard ─────────────────────────────────────
    // Only active streams may be paused. Any other status is a client error.
    if (stream.status !== "active") {
      const body = { error: `Cannot pause a stream in '${stream.status}' status` };
      if (idempotencyKey) {
        db.idempotencyKeys[idempotencyKey] = { status: 409, body };
      }
      return NextResponse.json(body, { status: 409 });
    }

    // ── Org-policy approval flow ──────────────────────────────────────────────
    if (stream.requiresApprovalToPause && !stream.pendingApproval) {
      const pending = {
        ...stream,
        pendingApproval: true,
        updatedAt: new Date().toISOString(),
      };
      db.streams.set(id, pending);

      const responseBody = { data: pending, approvalRequired: true };
      if (token) {
        db.idempotency.set(token, responseBody);
      }

      recordPrivilegedStreamAuditEvent({
        action: "stream.pause.initiated",
        after: pending as any,
        before: before as any,
        request: req,
        streamId: id,
        targetAccount: pending.recipientAddress || pending.recipient,
      });

      return NextResponse.json(responseBody, { status: 202 });
    }

    // ── Apply transition ──────────────────────────────────────────────────────
    const updated = {
      ...stream,
      status: "paused" as const,
      pendingApproval: false,
      updatedAt: new Date().toISOString(),
    };
    db.streams.set(id, updated);

    recordPrivilegedStreamAuditEvent({
      action: "stream.pause",
      after: updated as any,
      before: before as any,
      request: req,
      streamId: id,
      targetAccount: updated.recipientAddress || updated.recipient,
    });

    const responseBody = { data: updated };
    if (token) {
      db.idempotency.set(token, responseBody);
    }

    return NextResponse.json(responseBody);
  });
}
