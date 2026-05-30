import { NextResponse } from "next/server";
import { db, getStore } from "@/app/lib/db";
import { getCorrelationContext } from "@/app/lib/logger";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";
import { streamCache } from "@/app/lib/cache";

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

async function enforceRateLimit(request: Request, method: "GET" | "POST" | "DELETE", path: string) {
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
  const { streamRepository } = getStore();
  const { id } = await params;
  const rateLimited = await enforceRateLimit(request, "GET", `/api/streams/${id}`);
  if (rateLimited) {
    return rateLimited;
  }

  const tenant = request.headers.get("x-tenant-id");
  if (!tenant || tenant.trim() === "") {
    return errorResponse("MISSING_TENANT", "Tenant ID header is required", 400);
  }

  // Check cache first
  const cachedStream = streamCache.get(tenant, id);
  if (cachedStream) {
    return NextResponse.json(
      { data: cachedStream, links: { self: `/api/v1/streams/${id}` } },
      { headers: { "X-Cache": "HIT" } }
    );
  }

  // Fetch from DB using findOne
  const stream = db.streams.findOne ? db.streams.findOne(tenant, id) : null;
  if (!stream) {
    return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }

  // Set cache on read miss
  streamCache.set(tenant, id, stream);

  return NextResponse.json(
    { data: stream, links: { self: `/api/v1/streams/${id}` } },
    { headers: { "X-Cache": "MISS" } }
  );
}

export async function POST(
  request: Request,
  { params }: Context
) {
  const { id } = await params;
  const rateLimited = await enforceRateLimit(request, "POST", `/api/streams/${id}`);
  if (rateLimited) {
    return rateLimited;
  }

  const tenant = request.headers.get("x-tenant-id");
  if (!tenant || tenant.trim() === "") {
    return errorResponse("MISSING_TENANT", "Tenant ID header is required", 400);
  }

  const stream = db.streams.findOne ? db.streams.findOne(tenant, id) : null;
  if (!stream) {
    return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }

  const updatedStream = {
    ...stream,
    ...body,
    updatedAt: new Date().toISOString(),
  };

  db.streams.set(id, updatedStream);

  // Invalidate cache BEFORE returning response
  streamCache.invalidate(tenant, id);

  return NextResponse.json({ data: updatedStream });
}

export async function DELETE(request: Request, { params }: Context) {
  const { streamRepository } = getStore();
  const { id } = await params;
  const rateLimited = await enforceRateLimit(request, "DELETE", `/api/streams/${id}`);
  if (rateLimited) {
    return rateLimited;
  }

  const tenant = request.headers.get("x-tenant-id");
  if (!tenant || tenant.trim() === "") {
    return errorResponse("MISSING_TENANT", "Tenant ID header is required", 400);
  }

  const stream = db.streams.findOne ? db.streams.findOne(tenant, id) : null;
  if (!stream) {
    return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }

  if (stream.status === "active" || stream.status === "paused") {
    return errorResponse(
      "STREAM_INACTIVE_STATE",
      "Cannot delete a stream that is active or paused. Stop it first.",
      409
    );
  }

  db.streams.delete(id);

  // Invalidate cache BEFORE returning response
  streamCache.invalidate(tenant, id);

  return new NextResponse(null, { status: 204 });
}
