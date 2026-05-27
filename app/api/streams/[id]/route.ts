import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getCorrelationContext } from "@/app/lib/logger";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";

type Context = { params: Promise<{ id: string }> };

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

function errorResponse(code: string, message: string, status: number) {
  return createErrorResponse(code, message, status);
}

function getRequestUrl(request: Request, fallbackPath: string): URL {
  try {
    return request.url ? new URL(request.url) : new URL(`http://localhost${fallbackPath}`);
  } catch {
    return new URL(`http://localhost${fallbackPath}`);
  }
}

async function enforceRateLimit(request: Request, method: "GET" | "DELETE", path: string) {
  const url = getRequestUrl(request, path);
  const limitType = getLimitForRoute(method, url.pathname);
  const identity = getClientIdentity(request);
  const result = await checkRateLimit(identity, limitType);

  if (!result.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(result.retryAfter!);
  }

  recordRequest(url.pathname);
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rateLimited = await enforceRateLimit(request, "GET", `/api/streams/${id}`);
  if (rateLimited) {
    return rateLimited;
  }

  const stream = db.streams.get(id);
  if (!stream) {
    return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }

  return NextResponse.json({ data: stream, links: { self: `/api/v1/streams/${id}` } });
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  const rateLimited = await enforceRateLimit(request, "DELETE", `/api/streams/${id}`);
  if (rateLimited) {
    return rateLimited;
  }

  const stream = db.streams.get(id);
  if (!stream) {
    return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }

  if (stream.status === "active" || stream.status === "paused") {
    return createErrorResponse(
      "STREAM_INACTIVE_STATE",
      "Cannot delete a stream that is active or paused. Stop it first.",
      409
    );
  }

  db.streams.delete(id);
  return new NextResponse(null, { status: 204 });
}
