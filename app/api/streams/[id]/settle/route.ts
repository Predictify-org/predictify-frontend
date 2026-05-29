/**
 * POST /api/streams/[id]/settle
 *
 * Transitions an active or paused stream to "ended" and records the final
 * balance. Idempotent: repeated requests with the same Idempotency-Key
 * return the cached response without re-applying the transition.
 *
 * Concurrency: the entire read-modify-write is wrapped in withLock(id) so
 * that concurrent settle/pause/start/stop requests on the same stream are
 * serialised.
 */

import { NextRequest, NextResponse } from "next/server";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";
import { db, idempotencyToken, withLock } from "@/app/lib/db";
import { getCorrelationContext } from "@/app/lib/logger";
import { checkStreamOrgPolicy } from "@/app/lib/org-policy";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";
import { getStellarSettlementClient } from "@/app/lib/stellar";

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
  const url = getRequestUrl(req, `/api/streams/${id}/settle`);
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
    ? idempotencyToken(`streams.settle.${id}`, idempotencyKey)
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

    const actorAddress = getHeader(req, "Actor-Wallet-Address");
    const policyResult = actorAddress ? checkStreamOrgPolicy(id, actorAddress, "settle") : null;
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

    if (stream.status !== "active" && stream.status !== "paused") {
      return errorResponse("INVALID_STREAM_STATE", "Only active or paused streams can be settled", 409);
    }

    const before = structuredClone(stream);
    const updated = {
      ...stream,
      status: "ended" as const,
      updatedAt: new Date().toISOString(),
    };

    try {
      const settlement = await getStellarSettlementClient().settleStream({ streamId: id });
      
      db.streams.set(id, updated);

      recordPrivilegedStreamAuditEvent({
        action: "stream.settle",
        after: updated as any,
        before: before as any,
        metadata: {
          settlementTxHash: settlement.txHash,
        },
        request: req,
        streamId: id,
        targetAccount: updated.recipientAddress || updated.recipient,
      });

      const payload = { data: { ...updated, settlement } };
      if (token) {
        db.idempotency.set(token, payload);
      }

      return NextResponse.json(payload);
    } catch (err) {
      return errorResponse("SETTLEMENT_FAILED", "Failed to settle stream on Stellar/Soroban", 502);
    }
  });
}
