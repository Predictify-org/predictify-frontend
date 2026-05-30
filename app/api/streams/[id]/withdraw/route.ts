import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { logger } from "@/app/lib/logger";
import { getCorrelationContext } from "@/app/lib/correlation-middleware";
import { redact } from "@/app/lib/privacy";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";
import { db, idempotencyToken, withLock } from "@/app/lib/db";
import { getCorrelationContext } from "@/app/lib/logger";
import { checkStreamOrgPolicy } from "@/app/lib/org-policy";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";
import { evaluateWithdrawalState } from "@/app/lib/withdraw-finality";

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

function getHeader(request: Request, name: string): string | null {
  return request.headers?.get?.(name) ?? null;
}

function getRequestUrl(request: Request, fallbackPath: string): URL {
  try {
    return request.url ? new URL(request.url) : new URL(`http://localhost${fallbackPath}`);
  } catch {
    return new URL(`http://localhost${fallbackPath}`);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const correlationId = getCorrelationContext()?.correlationId || "unknown";
  
  const stream = db.streams.get(id);
  if (!stream) {
    logger.warn("Stream not found for withdraw action", { correlationId, streamId: id });
    return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }
  if (stream.status !== "ended") {
    logger.warn("Invalid stream state for withdraw action", { correlationId, streamId: id, status: stream.status });
    return createErrorResponse("INVALID_STREAM_STATE", "Only ended streams can be withdrawn from", 409);
  }
  stream.status = "withdrawn";
  stream.nextAction = undefined;
  stream.updatedAt = new Date().toISOString();
  db.streams.set(id, stream);
  
  logger.info("Stream withdrawn successfully", { 
    correlationId, 
    streamId: id, 
    action: "withdraw", 
    status: "success", 
    stream: redact(stream) 
  });
  
  return NextResponse.json({ data: stream });
  const url = getRequestUrl(request, `/api/streams/${id}/withdraw`);
  const limitType = getLimitForRoute("POST", url.pathname);
  const identity = getClientIdentity(request);
  const result = await checkRateLimit(identity, limitType);

  if (!result.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(result.retryAfter!);
  }
  recordRequest(url.pathname);

  const actorAddress = getHeader(request, "Actor-Wallet-Address");
  const idempotencyKey = getHeader(request, "Idempotency-Key");
  const token = idempotencyKey ? idempotencyToken(`streams.withdraw.${id}`, idempotencyKey) : null;

  if (token && db.idempotency.has(token)) {
    return NextResponse.json(db.idempotency.get(token));
  }

  return withLock(id, async () => {
    if (token && db.idempotency.has(token)) {
      return NextResponse.json(db.idempotency.get(token));
    }

    const stream = db.streams.get(id);
    if (!stream) {
      return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }

    const policyResult = actorAddress ? checkStreamOrgPolicy(id, actorAddress, "withdraw") : null;
    if (policyResult) {
      if (!policyResult.allowed) {
        return createErrorResponse(policyResult.code, policyResult.message, policyResult.httpStatus);
      }
      if (policyResult.requiresApproval) {
        return createErrorResponse(
          "APPROVAL_REQUIRED",
          "This action requires multi-sig approval. Please initiate an approval request.",
          409
        );
      }
    }

    if (stream.status !== "ended") {
      if (stream.status === "withdrawn") {
        const payload = { data: stream, withdrawal: stream.withdrawal };
        if (token) {
          db.idempotency.set(token, payload);
        }
        return NextResponse.json(payload);
      }
      return createErrorResponse("INVALID_STREAM_STATE", "Only ended streams can be withdrawn from", 409);
    }

    const before = structuredClone(stream);
    const { alert, stream: updated } = await evaluateWithdrawalState(stream, new Date(), fetch);
    db.streams.set(id, updated);

    const payload = {
      alert,
      data: updated,
      withdrawal: updated.withdrawal,
    };

    recordPrivilegedStreamAuditEvent({
      action: "stream.withdraw",
      after: updated as any,
      before: before as any,
      metadata: {
        resultingStatus: updated.status,
        withdrawalState: updated.withdrawal?.state ?? null,
      },
      request,
      streamId: id,
      targetAccount: updated.recipient,
    });

    if (token) {
      db.idempotency.set(token, payload);
    }

    return NextResponse.json(payload);
  });
}
