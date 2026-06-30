import { NextRequest, NextResponse } from "next/server";
import { getRateLimitStore, RateLimitStore } from "@/app/lib/rate-limit-store";
import { recordThrottle, recordRequest } from "@/app/lib/rate-limit-metrics";

export const WALLET_RATE_LIMITS = {
  challenge: { limit: 20, windowMs: 60_000 },
  login: { limit: 5, windowMs: 60_000 },
} as const;

export type WalletRateLimitType = keyof typeof WALLET_RATE_LIMITS;

export interface WalletRateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

function extractIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

export async function checkIpRateLimit(
  req: NextRequest,
  limitType: WalletRateLimitType,
  store?: RateLimitStore
): Promise<WalletRateLimitResult> {
  const ip = extractIp(req);
  const config = WALLET_RATE_LIMITS[limitType];
  const rateLimitStore = store ?? getRateLimitStore();

  const result = await rateLimitStore.check(`${limitType}:${ip}`, config.limit, config.windowMs);

  recordRequest(req.nextUrl.pathname);

  if (!result.allowed) {
    recordThrottle(
      req.nextUrl.pathname,
      limitType,
      "ip",
      ip
    );
    return {
      allowed: false,
      retryAfter: result.retryAfter,
    };
  }

  return { allowed: true };
}

export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "rate_limit_exceeded",
        message: "Too many requests. Please try again later.",
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
