import { NextResponse, NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { getClientIdentity, checkRateLimit, rateLimitResponse } from "@/app/lib/rate-limit";
import { recordThrottle, recordRequest } from "@/app/lib/rate-limit-metrics";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";

const JWT_SECRET = process.env.JWT_SECRET || "streampay-dev-secret-do-not-use-in-prod";

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitType = getLimitForRoute("GET", url.pathname);
  const identity = getClientIdentity(request);
  const result = await checkRateLimit(identity, limitType);

  if (!result.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(result.retryAfter!);
  }
  recordRequest(url.pathname);

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return createErrorResponse("UNAUTHORIZED", "Missing or invalid authorization header", 401);
  }
  const token = authHeader.slice(7);
  try {
    const verified = jwt.verify(token, JWT_SECRET) as { sub?: string };
    if (!verified.sub) {
      return createErrorResponse("UNAUTHORIZED", "Invalid or expired token", 401);
    }
  });
}
