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
import { getStellarSettlementClient } from "@/app/lib/stellar";

type Context = { params: Promise<{ id: string }> };

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

function errorResponse(code: string, message: string, status: number) {
  return createErrorResponse(code, message, status);
}

function getHeader(request: Request, name: string): string | null {
  return request.headers?.get?.(name) ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const idempotencyKey = getHeader(request, "Idempotency-Key");
  const token = idempotencyKey
    ? idempotencyToken(`streams.settle.${id}`, idempotencyKey)
    : null;

  const fingerprint = computeFingerprint("POST", `/api/streams/${id}/settle`, null);

  if (token) {
    const cached = checkIdempotency(db.idempotency, token, fingerprint);
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
    if (token) {
      const cached = checkIdempotency(db.idempotency, token, fingerprint);
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

    const stream = db.streams.get(id);
    if (!stream) {
      return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }

    const actorAddress = getHeader(request, "Actor-Wallet-Address");
    const policyResult = actorAddress
      ? checkStreamOrgPolicy(id, actorAddress, "settle")
      : null;
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
    const txHash = `fake-tx-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const updatedStream = {
      ...stream,
      nextAction: "withdraw" as const,
      settlementTxHash: txHash,
      status: "ended" as const,
      updatedAt: now,
      withdrawal: {
        attempts: 0,
        lastCheckedAt: now,
        requestedAt: now,
        settlementTxHash: txHash,
        state: "pending" as const,
      },
    };
    db.streams.set(id, updatedStream);

    try {
      const settlement = await getStellarSettlementClient().settleStream({ streamId: id });

      db.streams.set(id, updatedStream);

      recordPrivilegedStreamAuditEvent({
        action: "stream.settle",
        after: updatedStream as any,
        before: before as any,
        metadata: {
          settlementTxHash: settlement.txHash,
        },
        request,
        streamId: id,
        targetAccount: updatedStream.recipient,
      });

      const payload = { data: { ...updatedStream, settlement } };
      if (token) {
        setIdempotency(db.idempotency, token, fingerprint, 200, payload);
      }

      logger.info("Stream settled successfully", {
        streamId: id,
        action: "settle",
        status: "success",
      });

      return NextResponse.json(payload);
    } catch {
      return errorResponse("SETTLEMENT_FAILED", "Failed to settle stream on Stellar/Soroban", 502);
    }
  });
}
