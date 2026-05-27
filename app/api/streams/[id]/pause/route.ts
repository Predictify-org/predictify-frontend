import { NextResponse } from "next/server";
import { db, idempotencyToken } from "@/app/lib/db";
import { getCorrelationContext } from "@/app/lib/logger";
import { checkStreamOrgPolicy } from "@/app/lib/org-policy";

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
  const token = idempotencyKey ? idempotencyToken(`streams.pause.${id}`, idempotencyKey) : null;

  if (token && db.idempotency.has(token)) {
    return NextResponse.json(db.idempotency.get(token));
  }

  const stream = db.streams.get(id);
  if (!stream) {
    return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }

  const actorAddress = getHeader(request, "Actor-Wallet-Address");
  const policyResult = actorAddress ? checkStreamOrgPolicy(id, actorAddress, "pause") : null;
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
    return createErrorResponse("INVALID_STREAM_STATE", "Only active streams can be paused", 409);
  }

  const updatedStream = {
    ...stream,
    nextAction: "start" as const,
    status: "paused" as const,
    updatedAt: new Date().toISOString(),
  };
  db.streams.set(id, updatedStream);

  const payload = { data: updatedStream };
  if (token) {
    db.idempotency.set(token, payload);
  }

  return NextResponse.json(payload);
}
