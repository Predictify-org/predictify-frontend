/**
 * POST /api/streams/:id/withdraw
 *
 * Lets the stream recipient claim the currently vested-but-unreleased balance.
 *
 * ## Authorization
 * Only the stream recipient may withdraw (mirrors `recipient.require_auth()`
 * in the Soroban contract). The caller is identified via:
 *   1. Verified JWT `sub` claim (preferred).
 *   2. `Actor-Wallet-Address` header (fallback for internal callers).
 *
 * The resolved address must match `stream.recipientAddress`.
 *
 * ## Withdraw amount
 *   - Body `{ amount: null | undefined }` → withdraw full withdrawable balance.
 *   - Body `{ amount: "1000000" }` → withdraw exactly that many raw units.
 *   - Over-withdraw or zero-amount → 422.
 *
 * ## State transitions
 *   - `released_amount` incremented by payout.
 *   - `last_update` set to now.
 *   - If fully drained at/after end_time → status transitions to `ended`.
 *
 * ## Invariant
 *   released_amount NEVER exceeds vested_amount after this operation.
 *
 * ## Idempotency
 * Supports `Idempotency-Key` header for safe retries.
 */

import { NextResponse } from "next/server";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";
import { db, idempotencyToken, withLock } from "@/app/lib/db";
import { getCorrelationContext } from "@/app/lib/logger";
import { tryAuthenticateRequest } from "@/app/lib/auth";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";
import {
  computeWithdraw,
  resolveEscrowState,
} from "@/app/lib/recipient-withdraw";

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

/**
 * Resolve the caller's wallet address.
 * JWT sub claim takes precedence over the raw header.
 */
function resolveCallerAddress(request: Request): string | null {
  const jwt = tryAuthenticateRequest(request);
  if (jwt?.walletAddress) return jwt.walletAddress;
  return getHeader(request, "Actor-Wallet-Address")?.trim() || null;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url      = getRequestUrl(request, `/api/streams/${id}/withdraw`);
  const limitType = getLimitForRoute("POST", url.pathname);
  const identity  = getClientIdentity(request);
  const rl        = await checkRateLimit(identity, limitType);

  if (!rl.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(rl.retryAfter!);
  }
  recordRequest(url.pathname);

  const idempotencyKey = getHeader(request, "Idempotency-Key");
  const idemToken = idempotencyKey
    ? idempotencyToken(`streams.withdraw.${id}`, idempotencyKey)
    : null;

  if (idemToken && db.idempotency.has(idemToken)) {
    return NextResponse.json(db.idempotency.get(idemToken));
  }

  return withLock(id, async () => {
    if (idemToken && db.idempotency.has(idemToken)) {
      return NextResponse.json(db.idempotency.get(idemToken));
    }

    // ── Fetch stream ───────────────────────────────────────────────────────
    const stream = db.streams.get(id);
    if (!stream) {
      return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }

    // ── Already withdrawn — idempotent return ──────────────────────────────
    if (stream.status === "withdrawn") {
      const payload = { data: stream };
      if (idemToken) db.idempotency.set(idemToken, payload);
      return NextResponse.json(payload);
    }

    // ── Resolve caller ─────────────────────────────────────────────────────
    const callerAddress = resolveCallerAddress(request);
    if (!callerAddress) {
      return createErrorResponse(
        "RECIPIENT_AUTH_REQUIRED",
        "A verified caller identity is required. Provide a Bearer JWT or Actor-Wallet-Address header.",
        401,
      );
    }

    // ── Parse optional requested amount from body ──────────────────────────
    let requestedAmount: bigint | null = null;
    try {
      const body = await request.clone().json().catch(() => ({}));
      if (body?.amount !== undefined && body.amount !== null) {
        requestedAmount = BigInt(String(body.amount));
      }
    } catch {
      return createErrorResponse("INVALID_REQUEST", "Request body must be valid JSON", 400);
    }

    // ── Resolve on-chain escrow state ──────────────────────────────────────
    const now    = new Date();
    const escrow = resolveEscrowState(stream, now);
    const token  = (stream as Record<string, unknown>).token as string ?? "XLM";

    // recipientAddress: stored on stream or fall back to stream.recipient label
    const recipientAddress =
      (stream as Record<string, unknown>).recipientAddress as string
      ?? stream.recipient;

    // ── Compute withdrawal ─────────────────────────────────────────────────
    const outcome = computeWithdraw(stream, {
      totalAmount:      escrow.totalAmount,
      releasedAmount:   escrow.releasedAmount,
      vestedAmount:     escrow.vestedAmount,
      requestedAmount:  requestedAmount ?? undefined,
      token,
      recipientAddress,
      callerAddress,
      endTime:          (stream as Record<string, unknown>).endsAt as string | undefined,
      now,
    });

    if (!outcome.ok) {
      const httpStatus =
        outcome.code === "RECIPIENT_AUTH_REQUIRED" ? 403 :
        outcome.code === "INVALID_STREAM_STATE"    ? 409 :
        422;
      return createErrorResponse(outcome.code, outcome.message, httpStatus);
    }

    const { amountPaidOut, newReleasedAmount, shouldMarkEnded } = outcome.result;

    // ── Mock token transfer ────────────────────────────────────────────────
    // In production: call getTokenClientForStream(stream).transfer(recipientAddress, amountPaidOut, id)
    const txHash = `mock-withdraw-${crypto.randomUUID().slice(0, 8)}`;

    // ── Persist updated stream ─────────────────────────────────────────────
    const before = structuredClone(stream);
    const updatedStream = {
      ...stream,
      status:    shouldMarkEnded ? ("ended" as const) : stream.status,
      nextAction: shouldMarkEnded ? ("withdraw" as const) : stream.nextAction,
      updatedAt: now.toISOString(),
      // Advance released_amount — never exceeds vested_amount (invariant enforced above).
      releasedAmount: newReleasedAmount.toString(),
    };
    db.streams.set(id, updatedStream);

    // ── Audit log ──────────────────────────────────────────────────────────
    recordPrivilegedStreamAuditEvent({
      action: "stream.withdraw.recipient",
      after:  updatedStream as unknown as Record<string, unknown>,
      before: before        as unknown as Record<string, unknown>,
      metadata: {
        amountPaidOut:     amountPaidOut.toString(),
        newReleasedAmount: newReleasedAmount.toString(),
        vestedAmount:      escrow.vestedAmount.toString(),
        totalAmount:       escrow.totalAmount.toString(),
        token,
        txHash,
        shouldMarkEnded,
        resultingStatus: updatedStream.status,
      },
      request,
      streamId:      id,
      targetAccount: recipientAddress,
    });

    const payload = {
      data: updatedStream,
      withdrawal: {
        amountPaidOut:     amountPaidOut.toString(),
        newReleasedAmount: newReleasedAmount.toString(),
        token,
        txHash,
        withdrawnAt: now.toISOString(),
      },
    };

    if (idemToken) db.idempotency.set(idemToken, payload);
    return NextResponse.json(payload);
  });
}
