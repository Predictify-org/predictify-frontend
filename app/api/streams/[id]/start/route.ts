import { NextResponse } from "next/server";
import { StreamService } from "@/app/lib/stream-service";
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/app/lib/db";
import { getClientIdentity, checkRateLimit, rateLimitResponse } from "@/app/lib/rate-limit";
import { recordThrottle, recordRequest } from "@/app/lib/rate-limit-metrics";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";

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

  const result = await StreamService.applyAction(id, "start", idempotencyKey);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  const url = new URL(_request.url);
  const limitType = getLimitForRoute("POST", url.pathname);
  const identity = getClientIdentity(_request);
  const result = await checkRateLimit(identity, limitType);

  if (!result.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(result.retryAfter!);
  }
  recordRequest(url.pathname);

  const stream = db.streams.get(id);
  if (!stream) {
    return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }

  // Org Policy Check
  const actorAddress = _request.headers.get("Actor-Wallet-Address");
  const policyResult = checkStreamOrgPolicy(id, actorAddress ?? "", "start");

  if (policyResult) {
    if (!policyResult.allowed) {
      return createErrorResponse(policyResult.code, policyResult.message, policyResult.httpStatus);
    }
    if (policyResult.requiresApproval) {
      return createErrorResponse("APPROVAL_REQUIRED", "This action requires multi-sig approval. Please initiate an approval request.", 409);
    }
  }

  if (stream.status !== "draft") {
    return createErrorResponse("INVALID_STREAM_STATE", "Only draft streams can be started", 409);
  }

  return NextResponse.json({ data: result.data });
}
