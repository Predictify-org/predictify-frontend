import { NextResponse } from "next/server";
import { StreamService } from "@/app/lib/stream-service";
import { db, idempotencyToken } from "@/app/lib/db";

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idempotencyKey = request.headers.get("Idempotency-Key") || undefined;

  const result = await StreamService.applyAction(id, "pause", idempotencyKey);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data });
  const idempotencyKey = request.headers.get("Idempotency-Key");
  const token = idempotencyKey ? idempotencyToken(`streams.pause.${id}`, idempotencyKey) : null;

  if (token && db.idempotency.has(token)) {
    return NextResponse.json(db.idempotency.get(token));
  }

  const stream = db.streams.get(id);
  if (!stream) {
    return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }

  // Org Policy Check
  const actorAddress = _request.headers.get("Actor-Wallet-Address");
  const policyResult = checkStreamOrgPolicy(id, actorAddress ?? "", "pause");

  if (policyResult) {
    if (!policyResult.allowed) {
      return createErrorResponse(policyResult.code, policyResult.message, policyResult.httpStatus);
    }
    if (policyResult.requiresApproval) {
      return createErrorResponse("APPROVAL_REQUIRED", "This action requires multi-sig approval. Please initiate an approval request.", 409);
    }
  }

  if (stream.status !== "active") {
    return createErrorResponse("INVALID_STREAM_STATE", "Only active streams can be paused", 409);
  }
  stream.status = "paused";
  stream.nextAction = "start";
  stream.updatedAt = new Date().toISOString();
  db.streams.set(id, stream);

  const payload = { data: stream };
  if (token) {
    db.idempotency.set(token, payload);
  }

  return NextResponse.json(payload);
}
