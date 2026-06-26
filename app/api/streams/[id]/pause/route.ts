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

function getHeader(req: Request, name: string): string | null {
  return req.headers?.get?.(name) ?? null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const idempotencyKey = getHeader(req, "Idempotency-Key");
  const token = idempotencyKey
    ? idempotencyToken(`streams.pause.${id}`, idempotencyKey)
    : null;

  const fingerprint = computeFingerprint("POST", `/api/streams/${id}/pause`, null);

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

    const stream = db.streams[id];
    if (!stream) {
      return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }

    const actorAddress = getHeader(req, "Actor-Wallet-Address");
    const policyResult = actorAddress
      ? checkStreamOrgPolicy(id, actorAddress, "pause")
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

    if (stream.status !== "active") {
      const body = { error: `Cannot pause a stream in '${stream.status}' status` };
      return NextResponse.json(body, { status: 409 });
    }

    const before = structuredClone(stream);
    const updated = {
      ...stream,
      status: "paused" as const,
      updatedAt: new Date().toISOString(),
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
      streamId: id,
      action: "pause",
      status: "success",
    });

    return NextResponse.json(responseBody);
  });
}
