import { NextResponse } from "next/server";
import { RATE_LIMITS, getLimitForRoute, LimitType } from "./rate-limit-config";
import { getRateLimitStore } from "./rate-limit-store";

const JWT_SECRET = process.env.JWT_SECRET || "streampay-dev-secret-do-not-use-in-prod";

export interface ClientIdentity {
  type: "api_key" | "wallet" | "ip";
  value: string;
  displayValue: string;
}

function extractApiKey(request: Request): string | null {
  return request.headers.get("X-API-Key");
}

function extractWalletFromJwt(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.slice(7);
    const { sub } = JSON.parse(atob(token.split(".")[1])) as { sub?: string };
    return sub || null;
  } catch {
    return null;
  }
}

function extractIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function getClientIdentity(request: Request): ClientIdentity {
  const apiKey = extractApiKey(request);
  if (apiKey) {
    return {
      type: "api_key",
      value: apiKey,
      displayValue: apiKey.slice(0, 8) + "...",
    };
  }

  const wallet = extractWalletFromJwt(request);
  if (wallet) {
    return {
      type: "wallet",
      value: wallet,
      displayValue: wallet.slice(0, 16) + "...",
    };
  }

  const ip = extractIp(request);
  return {
    type: "ip",
    value: ip,
    displayValue: ip,
  };
}

export async function checkRateLimit(
  identity: ClientIdentity,
  limitType: LimitType
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const store = getRateLimitStore();
  const config = RATE_LIMITS[limitType];

  const result = await store.check(identity.value, config.limit, config.windowMs);

  return {
    allowed: result.allowed,
    remaining: result.allowed ? result.remaining : 0,
    retryAfter: result.retryAfter,
  };
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    {
      error: {
        code: "rate_limit_exceeded",
        message: "Rate limit exceeded. Please try again later.",
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    }
  );
}

export async function withRateLimit(
  request: Request,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname;

  const limitType = getLimitForRoute(method, path);
  const identity = getClientIdentity(request);
  const result = await checkRateLimit(identity, limitType);

  if (!result.allowed) {
    return rateLimitResponse(result.retryAfter!);
  }

  return handler();
}
