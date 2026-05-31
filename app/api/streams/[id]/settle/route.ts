import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { logger } from "@/app/lib/logger";
import { getCorrelationContext } from "@/app/lib/correlation-middleware";
import { redact } from "@/app/lib/privacy";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";
import { db, idempotencyToken, withLock } from "@/app/lib/db";
import { getCorrelationContext } from "@/app/lib/logger";
import { checkStreamOrgPolicy } from "@/app/lib/org-policy";
import { getStellarSettlementClient } from "@/app/lib/stellar";

type Context = { params: Promise<{ id: string }> };

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function getHeader(request: Request, name: string): string | null {
  return request.headers?.get?.(name) ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const correlationId = getCorrelationContext()?.correlationId || "unknown";
  
  const stream = db.streams.get(id);
  if (!stream) {
    logger.warn("Stream not found for settle action", { correlationId, streamId: id });
    return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }
  if (stream.status !== "active" && stream.status !== "paused") {
    logger.warn("Invalid stream state for settle action", { correlationId, streamId: id, status: stream.status });
    return createErrorResponse("INVALID_STREAM_STATE", "Only active or paused streams can be settled", 409);
  }
  stream.status = "ended";
  stream.nextAction = "withdraw";
  stream.updatedAt = new Date().toISOString();
  db.streams.set(id, stream);
  
  const settlement = {
    txHash: `fake-tx-${crypto.randomUUID().slice(0, 8)}`,
    settledAt: new Date().toISOString(),
  };

  logger.info("Stream settled successfully", { 
    correlationId, 
    streamId: id, 
    action: "settle", 
    status: "success", 
    stream: redact({ ...stream, settlement })
  });

  return NextResponse.json({
    data: {
      ...stream,
      settlement,
    },
  const idempotencyKey = getHeader(request, "Idempotency-Key");
  const token = idempotencyKey ? idempotencyToken(`streams.settle.${id}`, idempotencyKey) : null;

  if (token && db.idempotency.has(token)) {
    return NextResponse.json(db.idempotency.get(token));
  }

  return withLock(id, async () => {
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
