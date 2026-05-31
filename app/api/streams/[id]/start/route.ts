import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { logger } from "@/app/lib/logger";
import { getCorrelationContext } from "@/app/lib/correlation-middleware";
import { redact } from "@/app/lib/privacy";
import { NextRequest, NextResponse } from "next/server";
import { db, idempotencyToken, withLock } from "@/app/lib/db";
import { getCorrelationContext } from "@/app/lib/logger";
import { checkStreamOrgPolicy } from "@/app/lib/org-policy";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";
import { transition } from "@/app/lib/state-machine";

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
    logger.warn("Stream not found for start action", { correlationId, streamId: id });
    return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }
  if (stream.status !== "draft") {
    logger.warn("Invalid stream state for start action", { correlationId, streamId: id, status: stream.status });
    return createErrorResponse("INVALID_STREAM_STATE", "Only draft streams can be started", 409);
  }
  stream.status = "active";
  stream.nextAction = "pause";
  stream.updatedAt = new Date().toISOString();
  db.streams.set(id, stream);
  
  logger.info("Stream started successfully", { 
    correlationId, 
    streamId: id, 
    action: "start", 
    status: "success", 
    stream: redact(stream) 
  });
  
  return NextResponse.json({ data: stream });
  const url = getRequestUrl(request, `/api/streams/${id}/start`);
  const limitType = getLimitForRoute("POST", url.pathname);
  const identity = getClientIdentity(request);
  const result = await checkRateLimit(identity, limitType);

  if (!result.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(result.retryAfter!);
  }
  recordRequest(url.pathname);

  // ── Idempotency ────────────────────────────────────────────────────────────
  const token = idempotencyKey
    ? idempotencyToken(`streams.start.${id}`, idempotencyKey)
    : null;

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

    const actorAddress = getHeader(request, "Actor-Wallet-Address");
    const policyResult = actorAddress
      ? checkStreamOrgPolicy(id, actorAddress, "start")
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

    const updatedStream = {
      ...stream,
      nextAction: "pause" as const,
      status: "active" as const,
      updatedAt: new Date().toISOString(),
    };
    db.streams.set(id, updatedStream);

    const payload = { data: updatedStream };
    if (token) {
      db.idempotency.set(token, payload);
    }

    return NextResponse.json(payload);
  });
}
