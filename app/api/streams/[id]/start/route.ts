import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getCorrelationContext } from "@/app/lib/logger";
import { enforceStreamRbac } from "@/app/lib/org-policy";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";

type Context = { params: Promise<{ id: string }> };

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
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
  const url = getRequestUrl(request, `/api/streams/${id}/start`);
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
    return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }

  // Mandatory RBAC — missing actor → 403; role insufficient → 403.
  // Actor is sourced from verified JWT first, then Actor-Wallet-Address header.
  const rbacError = enforceStreamRbac(request, id, "start");
  if (rbacError) return rbacError;

  const updatedStream = {
    ...stream,
    nextAction: "pause" as const,
    status: "active" as const,
    updatedAt: new Date().toISOString(),
  };
  db.streams.set(id, updatedStream);
  return NextResponse.json({ data: updatedStream });
}
