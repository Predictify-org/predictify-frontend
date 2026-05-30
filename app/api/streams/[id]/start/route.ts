import { NextRequest, NextResponse } from "next/server";
import { db, idempotencyToken, withLock } from "@/app/lib/db";
import { getCorrelationContext } from "@/app/lib/logger";
import { checkStreamOrgPolicy } from "@/app/lib/org-policy";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";
import { transition } from "@/app/lib/state-machine";

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
  const url = getRequestUrl(req, `/api/streams/${id}/start`);
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
    ? idempotencyToken(`streams.start.${id}`, idempotencyKey)
    : null;

  if (token && db.idempotency.has(token)) {
    return NextResponse.json(db.idempotency.get(token));
  }

  return withLock(id, async () => {
    // Re-check idempotency inside the lock
    if (token && db.idempotency.has(token)) {
      return NextResponse.json(db.idempotency.get(token));
    }

    const stream = db.streams.get(id);
    if (!stream) {
      return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }

    // ── Org policy check ──────────────────────────────────────────────────────
    const actorAddress = getHeader(req, "Actor-Wallet-Address");
    const policyResult = actorAddress ? checkStreamOrgPolicy(id, actorAddress, "start") : null;
    if (policyResult) {
      if (!policyResult.allowed) {
        return errorResponse(policyResult.code, policyResult.message, policyResult.httpStatus);
      }
      if (policyResult.requiresApproval) {
        return errorResponse(
          "APPROVAL_REQUIRED",
          "This action requires multi-sig approval. Please initiate an approval request.",
          409
        );
      }
    }

    // ── State machine transition ──────────────────────────────────────────────
    const transitionResult = transition(stream.status, "start");
    if (!transitionResult.ok) {
      return errorResponse("ILLEGAL_TRANSITION", transitionResult.error, 409);
    }

    const nextStatus = transitionResult.nextStatus;

    // Apply transition
    const updatedStream = {
      ...stream,
      status: nextStatus,
      nextAction: nextStatus === "active" ? ("pause" as const) : stream.nextAction,
      updatedAt: new Date().toISOString(),
    };
    db.streams.set(id, updatedStream);

    const responseBody = { data: updatedStream };
    if (token) {
      db.idempotency.set(token, responseBody);
    }

    return NextResponse.json(responseBody);
  });
}
