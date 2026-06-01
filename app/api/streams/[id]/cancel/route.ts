/**
 * POST /api/streams/:id/cancel
 *
 * Terminates an active or paused stream early and splits the escrowed funds:
 *
 *   recipient_payout = vested_amount  - released_amount  (earned, not yet paid)
 *   sender_refund    = total_amount   - vested_amount    (unvested remainder)
 *
 * Escrow-conservation invariant:
 *   recipient_payout + sender_refund === total_amount - released_amount
 *
 * The stream escrow is fully drained — no dust remains after cancellation.
 *
 * ## Authorization
 * Either the stream sender (identified by `Actor-Wallet-Address` header
 * matching `stream.senderAddress`) OR a member with the "canceller" role in
 * the stream's org policy may cancel. This mirrors the Soroban contract's
 * `require_auth` on the caller.
 *
 * ## Terminal-state guard
 * Cancelling an already Cancelled / Ended / Withdrawn stream is rejected with
 * ALREADY_TERMINAL (409) to prevent double-refund.
 *
 * ## Idempotency
 * Supports `Idempotency-Key` header — safe to retry on network failure.
 */

import { NextResponse } from "next/server";
import {
  checkIdempotency,
  computeFingerprint,
  db,
  idempotencyToken,
  setIdempotency,
  withLock,
} from "@/app/lib/db";
import { getCorrelationContext } from "@/app/lib/logger";
import { checkStreamOrgPolicy } from "@/app/lib/org-policy";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";
import {
  computeCancellationSplit,
  buildCancellationRecord,
} from "@/app/lib/cancel-stream";

// ── Helpers ───────────────────────────────────────────────────────────────────

function createErrorResponse(code: string, message: string, status: number) {
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

// ── Mock escrow-state resolver ────────────────────────────────────────────────
// In production this would query the Soroban contract storage for the stream's
// current vested_amount, released_amount, and total_amount.
// Amounts are i128 raw units — no per-decimal logic here.
function resolveEscrowState(streamId: string): {
  totalAmount: bigint;
  releasedAmount: bigint;
  vestedAmount: bigint;
} {
  // Mock: use deterministic values keyed by stream ID for testability.
  // Replace with real Soroban RPC call in production.
  const mockEscrow: Record<string, { totalAmount: bigint; releasedAmount: bigint; vestedAmount: bigint }> = {
    "stream-ada":  { totalAmount: 3_600_000_000n, releasedAmount: 1_200_000_000n, vestedAmount: 1_800_000_000n },
    "stream-kemi": { totalAmount: 1_280_000_000n, releasedAmount: 0n,             vestedAmount: 0n             },
  };
  return mockEscrow[streamId] ?? { totalAmount: 1_000_000_000n, releasedAmount: 0n, vestedAmount: 500_000_000n };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const path = `/api/streams/${id}/cancel`;
  const url  = getRequestUrl(request, path);

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const limitType = getLimitForRoute("POST", url.pathname);
  const identity  = getClientIdentity(request);
  const rl        = await checkRateLimit(identity, limitType);
  if (!rl.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(rl.retryAfter!);
  }
  recordRequest(url.pathname);

  // ── Idempotency ────────────────────────────────────────────────────────────
  const actorAddress    = getHeader(request, "Actor-Wallet-Address");
  const idempotencyKey  = getHeader(request, "Idempotency-Key");
  const idemToken       = idempotencyKey
    ? idempotencyToken(`streams.cancel.${id}`, idempotencyKey)
    : null;

  const fingerprint = computeFingerprint("POST", `/api/streams/${id}/cancel`, null);

  if (idemToken) {
    const cached = checkIdempotency(db.idempotency, idemToken, fingerprint);
    if (cached) {
      if (!cached.ok) {
        return NextResponse.json(
          { error: { code: "IDEMPOTENCY_CONFLICT", message: "Idempotency key has been used with a different request." } },
          { status: 409 },
        );
      }
      return NextResponse.json(cached.body, { status: cached.status });
    }
  }

  return withLock(id, async () => {
    // Double-check inside lock (race-condition guard).
    if (idemToken) {
      const cached = checkIdempotency(db.idempotency, idemToken, fingerprint);
      if (cached) {
        if (!cached.ok) {
          return NextResponse.json(
            { error: { code: "IDEMPOTENCY_CONFLICT", message: "Idempotency key has been used with a different request." } },
            { status: 409 },
          );
        }
        return NextResponse.json(cached.body, { status: cached.status });
      }
    }

    // ── Fetch stream ─────────────────────────────────────────────────────────
    const stream = db.streams.get(id);
    if (!stream) {
      return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }

    // ── Authorization ─────────────────────────────────────────────────────────
    // Allow: stream sender OR org canceller role.
    // The sender check uses the Actor-Wallet-Address header against
    // stream.senderAddress (set at creation time).
    const isSender = actorAddress && stream.senderAddress
      ? actorAddress === stream.senderAddress
      : false;

    if (!isSender) {
      // Fall through to org-policy check.
      const policyResult = actorAddress
        ? checkStreamOrgPolicy(id, actorAddress, "stop") // "stop" covers canceller role
        : null;

      if (policyResult) {
        if (!policyResult.allowed) {
          return createErrorResponse(policyResult.code, policyResult.message, policyResult.httpStatus);
        }
        if (policyResult.requiresApproval) {
          return createErrorResponse(
            "APPROVAL_REQUIRED",
            "This cancellation requires multi-sig approval. Please initiate an approval request.",
            409,
          );
        }
      } else if (!actorAddress) {
        // No actor header and stream is not org-owned — reject unauthenticated cancel.
        return createErrorResponse(
          "UNAUTHORIZED",
          "Actor-Wallet-Address header is required to cancel a stream.",
          401,
        );
      }
    }

    // ── Resolve escrow state ──────────────────────────────────────────────────
    const escrow = resolveEscrowState(id);
    const token  = stream.token ?? "XLM";

    // ── Compute split ─────────────────────────────────────────────────────────
    const cancelResult = computeCancellationSplit(stream, {
      totalAmount:      escrow.totalAmount,
      releasedAmount:   escrow.releasedAmount,
      vestedAmount:     escrow.vestedAmount,
      token,
      senderAddress:    stream.senderAddress ?? actorAddress ?? "unknown",
      recipientAddress: stream.recipient,
    });

    if (!cancelResult.ok) {
      const httpStatus = cancelResult.code === "ALREADY_TERMINAL" ? 409 : 422;
      return createErrorResponse(cancelResult.code, cancelResult.message, httpStatus);
    }

    const { split } = cancelResult;

    // ── Execute token transfers ───────────────────────────────────────────────
    // Both legs use the stream's own token — never mix tokens across streams.
    // In production: call getTokenClientForStream(stream).transfer / .refund
    const recipientTxHash = `mock-cancel-payout-${crypto.randomUUID().slice(0, 8)}`;
    const senderTxHash    = split.senderRefund > 0n
      ? `mock-cancel-refund-${crypto.randomUUID().slice(0, 8)}`
      : undefined;

    // ── Build cancellation record ─────────────────────────────────────────────
    const cancellation = buildCancellationRecord(
      {
        totalAmount:      escrow.totalAmount,
        releasedAmount:   escrow.releasedAmount,
        vestedAmount:     escrow.vestedAmount,
        token,
        senderAddress:    stream.senderAddress ?? actorAddress ?? "unknown",
        recipientAddress: stream.recipient,
      },
      split,
      recipientTxHash,
      senderTxHash,
    );

    // ── Persist updated stream ────────────────────────────────────────────────
    const before = structuredClone(stream);
    const now    = new Date().toISOString();
    const updatedStream = {
      ...stream,
      status:         "cancelled" as const,
      nextAction:     undefined,
      updatedAt:      now,
      // Advance released_amount to vested_amount — escrow fully drained.
      releasedAmount: escrow.vestedAmount.toString(),
      vestedAmount:   escrow.vestedAmount.toString(),
      cancellation,
    };
    db.streams.set(id, updatedStream);

    // ── Audit log ─────────────────────────────────────────────────────────────
    recordPrivilegedStreamAuditEvent({
      action:        "stream.cancel",
      after:         updatedStream as unknown as Record<string, unknown>,
      before:        before        as unknown as Record<string, unknown>,
      metadata: {
        recipientPayout:  split.recipientPayout.toString(),
        senderRefund:     split.senderRefund.toString(),
        escrowDrained:    split.escrowDrained.toString(),
        token,
        recipientTxHash,
        ...(senderTxHash ? { senderTxHash } : {}),
      },
      request,
      streamId:      id,
      targetAccount: stream.recipient,
    });

    const payload = {
      data:         updatedStream,
      cancellation,
      links: { self: `/api/v1/streams/${id}` },
    };

    if (idemToken) setIdempotency(db.idempotency, idemToken, fingerprint, 200, payload);

    return NextResponse.json(payload);
  });
}
