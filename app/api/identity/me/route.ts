import { NextResponse } from "next/server";
import { getClientIdentity, checkRateLimit, rateLimitResponse } from "@/app/lib/rate-limit";
import { recordThrottle, recordRequest } from "@/app/lib/rate-limit-metrics";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { getCorrelationContext } from "@/app/lib/logger";
import { tryAuthenticateRequest } from "@/app/lib/auth";

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

  const actor = tryAuthenticateRequest(request);
  if (!actor) {
    return createErrorResponse("UNAUTHORIZED", "Missing or invalid authorization header", 401);
  }

  return NextResponse.json({
    data: {
      wallet_address: actor.walletAddress,
      email: null,
      display_name: actor.walletAddress,
      avatar_url: null,
      created_at: new Date().toISOString(),
    },
    links: { self: "/api/identity/me" },
  });
}
