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

  const idempotencyKey = getHeader(request, "Idempotency-Key");
  const actorAddress = getHeader(request, "Actor-Wallet-Address");
  const token = idempotencyKey
    ? idempotencyToken(`streams.stop.${id}`, idempotencyKey)
    : null;

  const fingerprint = computeFingerprint("POST", `/api/streams/${id}/stop`, null);

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
      ? checkStreamOrgPolicy(id, actorAddress, "stop")
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

    if (stream.status !== "active" && stream.status !== "draft") {
      return createErrorResponse(
        "INVALID_STREAM_STATE",
        "Only active or draft streams can be stopped",
        409
      );
    }

    const before = structuredClone(stream);
    const updatedStream = {
      ...stream,
      nextAction: "withdraw" as const,
      status: "ended" as const,
      updatedAt: new Date().toISOString(),
    };
    db.streams.set(id, updatedStream);

    recordPrivilegedStreamAuditEvent({
      action: "stream.stop.override",
      after: updatedStream as unknown as Record<string, unknown>,
      before: before as unknown as Record<string, unknown>,
      metadata: { resultingStatus: updatedStream.status },
      request,
      streamId: id,
      targetAccount: updatedStream.recipient,
    });

    const payload = { data: updatedStream };
    if (token) {
      setIdempotency(db.idempotency, token, fingerprint, 200, payload);
    }

    logger.info("Stream stopped successfully", {
      streamId: id,
      action: "stop",
      status: "success",
    });

    return NextResponse.json(payload);
  });
}
