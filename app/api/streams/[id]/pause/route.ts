/**
 * POST /api/streams/:id/pause
 *
 * Pause entrypoint — halts individual stream accrual and records the
 * pause timestamp (`pausedAt`) on the stream record.
 *
 * ## State transition
 *   active → paused
 *
 * ## Fields written on success
 * | Field       | Value                                      |
 * |-------------|--------------------------------------------|
 * | `status`    | `"paused"`                                 |
 * | `nextAction`| `"stop"`                                   |
 * | `pausedAt`  | ISO-8601 UTC timestamp of this request.    |
 * | `updatedAt` | ISO-8601 UTC timestamp of this request.    |
 *
 * `pausedAt` maps to the Soroban contract's `paused_at` storage field on
 * the stream escrow account (GrantFox campaign, issue #pause-entrypoint).
 * The settlement catch-up job uses this value to compute accrued-but-
 * unsettled ticks between `pausedAt` and the subsequent resume.
 *
 * ## Fields cleared on resume
 * `pausedAt` is set to `undefined` when `POST /api/streams/:id/start`
 * successfully resumes the stream from `paused` status.
 *
 * ## Auth
 * Org-owned streams require an `Actor-Wallet-Address` header carrying a
 * wallet address with a role that has `canPause` permission (owner or pauser
 * in the default policy). Individually owned streams skip the RBAC check.
 *
 * ## Idempotency
 * Supply an `Idempotency-Key` header to make the operation safe to retry.
 * The same key on the same stream always returns the same cached response.
 *
 * ## Error codes
 * | Status | Code                    | Reason                                   |
 * |--------|-------------------------|------------------------------------------|
 * | 404    | `STREAM_NOT_FOUND`      | Stream does not exist.                   |
 * | 409    | `INVALID_STREAM_STATE`  | Stream is not `active`.                  |
 * | 403    | `NOT_ORG_MEMBER`        | Actor is not in the owning org.          |
 * | 403    | `ROLE_INSUFFICIENT`     | Actor's role cannot pause.               |
 * | 409    | `APPROVAL_REQUIRED`     | Org policy requires multi-sig approval.  |
 * | 409    | `IDEMPOTENCY_CONFLICT`  | Key reused with a different request.     |
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
import { getCorrelationContext, logger } from "@/app/lib/logger";
import { checkStreamOrgPolicy } from "@/app/lib/org-policy";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json(
    { error: { code, message, request_id: context?.request_id } },
    { status },
  );
}

function getHeader(req: Request, name: string): string | null {
  return req.headers?.get?.(name) ?? null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const idempotencyKey = getHeader(req, "Idempotency-Key");
  const token = idempotencyKey
    ? idempotencyToken(`streams.pause.${id}`, idempotencyKey)
    : null;

  const fingerprint = computeFingerprint("POST", `/api/streams/${id}/pause`, null);

  // Pre-lock idempotency check — avoids acquiring the lock for pure replays.
  if (token) {
    const cached = checkIdempotency(db.idempotency, token, fingerprint);
    if (cached) {
      if (!cached.ok) {
        return NextResponse.json(
          {
            error: {
              code: "IDEMPOTENCY_CONFLICT",
              message: "Idempotency key has been used with a different request.",
            },
          },
          { status: 409 },
        );
      }
      return NextResponse.json(cached.body, { status: cached.status });
    }
  }

  return withLock(id, async () => {
    // Post-lock idempotency check — guards against races between concurrent
    // requests that both passed the pre-lock check simultaneously.
    if (token) {
      const cached = checkIdempotency(db.idempotency, token, fingerprint);
      if (cached) {
        if (!cached.ok) {
          return NextResponse.json(
            {
              error: {
                code: "IDEMPOTENCY_CONFLICT",
                message: "Idempotency key has been used with a different request.",
              },
            },
            { status: 409 },
          );
        }
        return NextResponse.json(cached.body, { status: cached.status });
      }
    }

    const stream = db.streams.get(id);
    if (!stream) {
      return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }

    // ── Org RBAC ──────────────────────────────────────────────────────────
    const actorAddress = getHeader(req, "Actor-Wallet-Address");
    const policyResult = actorAddress
      ? checkStreamOrgPolicy(id, actorAddress, "pause")
      : null;
    if (policyResult) {
      if (!policyResult.allowed) {
        return createErrorResponse(
          policyResult.code,
          policyResult.message,
          policyResult.httpStatus,
        );
      }
      if (policyResult.requiresApproval) {
        return createErrorResponse(
          "APPROVAL_REQUIRED",
          "This action requires multi-sig approval. Please initiate an approval request.",
          409,
        );
      }
    }

    // ── State guard ───────────────────────────────────────────────────────
    if (stream.status !== "active") {
      return createErrorResponse(
        "INVALID_STREAM_STATE",
        `Cannot pause a stream in '${stream.status}' status. Stream must be active.`,
        409,
      );
    }

    // ── Mutation ──────────────────────────────────────────────────────────
    const now = new Date().toISOString();
    const before = structuredClone(stream);

    const updated = {
      ...stream,
      /**
       * pausedAt: ISO-8601 UTC timestamp recorded the moment this stream
       * enters paused status. Maps to the Soroban contract's `paused_at`
       * storage field. Cleared by the /start endpoint on resume.
       */
      pausedAt: now,
      nextAction: "stop" as const,
      status: "paused" as const,
      updatedAt: now,
    };

    db.streams.set(id, updated);

    recordPrivilegedStreamAuditEvent({
      action: "stream.pause",
      after: updated as any,
      before: before as any,
      request: req,
      streamId: id,
      targetAccount: updated.recipient,
    });

    const responseBody = { data: updated };

    if (token) {
      setIdempotency(db.idempotency, token, fingerprint, 200, responseBody);
    }

    logger.info("Stream paused successfully", {
      action: "pause",
      pausedAt: now,
      status: "success",
      streamId: id,
    });

    return NextResponse.json(responseBody);
  });
}
