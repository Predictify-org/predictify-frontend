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
import { evaluateWithdrawalState } from "@/app/lib/withdraw-finality";

type Context = { params: Promise<{ id: string }> };

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

function getHeader(request: Request, name: string): string | null {
  return request.headers?.get?.(name) ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const actorAddress = getHeader(request, "Actor-Wallet-Address");
  const idempotencyKey = getHeader(request, "Idempotency-Key");
  const token = idempotencyKey
    ? idempotencyToken(`streams.withdraw.${id}`, idempotencyKey)
    : null;

  const fingerprint = computeFingerprint("POST", `/api/streams/${id}/withdraw`, null);

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
      return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }

    const policyResult = actorAddress
      ? checkStreamOrgPolicy(id, actorAddress, "withdraw")
      : null;
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
          setIdempotency(db.idempotency, token, fingerprint, 200, payload);
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
      setIdempotency(db.idempotency, token, fingerprint, 200, payload);
    }

    logger.info("Stream withdrawn successfully", {
      streamId: id,
      action: "withdraw",
      status: "success",
    });

    return NextResponse.json(payload);
  });
}
