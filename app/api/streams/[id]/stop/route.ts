import { NextResponse } from "next/server";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";
import { db } from "@/app/lib/db";
import { getCorrelationContext } from "@/app/lib/logger";
import { checkStreamOrgPolicy } from "@/app/lib/org-policy";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";

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
  const url = getRequestUrl(request, `/api/streams/${id}/stop`);
  const limitType = getLimitForRoute("POST", url.pathname);
  const identity = getClientIdentity(request);
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

  const actorAddress = getHeader(request, "Actor-Wallet-Address");
  const policyResult = actorAddress ? checkStreamOrgPolicy(id, actorAddress, "stop") : null;
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
    return createErrorResponse("INVALID_STREAM_STATE", "Only active or draft streams can be stopped", 409);
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
    metadata: {
      resultingStatus: updatedStream.status,
    },
    request,
    streamId: id,
    targetAccount: updatedStream.recipient,
  });

  return NextResponse.json({ data: updatedStream });
}
