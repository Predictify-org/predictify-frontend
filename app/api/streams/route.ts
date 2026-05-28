import { NextResponse } from "next/server";
import { decodeCursor, encodeCursor, getStore, idempotencyToken } from "@/app/lib/db";
import { getCorrelationContext, logger } from "@/app/lib/logger";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";
import { checkTokenAllowed, normaliseToken } from "@/app/lib/token-allowlist";

function errorResponse(code: string, message: string, status: number) {
  return createErrorResponse(code, message, status);
}

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

function getRequestUrl(request: Request, fallbackPath: string): URL {
  try {
    return request.url ? new URL(request.url) : new URL(`http://localhost${fallbackPath}`);
  } catch {
    return new URL(`http://localhost${fallbackPath}`);
  }
}

function getHeader(request: Request, name: string): string | null {
  return request.headers?.get?.(name) ?? null;
}

export async function GET(request: Request) {
  const { streamRepository } = getStore();
  const url = getRequestUrl(request, "/api/streams");
  const limitType = getLimitForRoute("GET", url.pathname);
  const identity = getClientIdentity(request);
  const result = await checkRateLimit(identity, limitType);

  if (!result.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(result.retryAfter!);
  }
  recordRequest(url.pathname);

  const { searchParams } = url;
  const cursor = searchParams.get("cursor");
  const status = searchParams.get("status");
  const limit = Math.min(Number.parseInt(searchParams.get("limit") ?? "20", 10), 100);

  let streams = Array.from(streamRepository.streams.values()).sort((left, right) => {
    const timeCompare = left.createdAt.localeCompare(right.createdAt);
    return timeCompare !== 0 ? timeCompare : left.id.localeCompare(right.id);
  });

  if (status) {
    streams = streams.filter((stream) => stream.status === status);
  }

  if (cursor) {
    let cursorId: string;
    try {
      cursorId = decodeCursor(cursor);
    } catch {
      return errorResponse("INVALID_CURSOR", "Malformed cursor", 422);
    }
    const cursorIndex = streams.findIndex((stream) => stream.id === cursorId);
    if (cursorIndex >= 0) {
      streams = streams.slice(cursorIndex + 1);
    }
  }

  const paginatedStreams = streams.slice(0, limit);
  const hasNext = streams.length > limit;
  const nextCursor =
    hasNext && paginatedStreams.length > 0
      ? encodeCursor(paginatedStreams[paginatedStreams.length - 1].id)
      : null;

  logger.info("Streams listed successfully", {
    count: paginatedStreams.length,
    total: streamRepository.streams.size,
  });

  return NextResponse.json({
    data: paginatedStreams,
    links: { self: `/api/v1/streams?limit=${limit}` },
    meta: { hasNext, nextCursor, total: streams.length },
  });
}

export async function POST(request: Request) {
  const { idempotencyStore, streamRepository } = getStore();
  const url = getRequestUrl(request, "/api/streams");
  const limitType = getLimitForRoute("POST", url.pathname);
  const identity = getClientIdentity(request);
  const result = await checkRateLimit(identity, limitType);

  if (!result.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(result.retryAfter!);
  }
  recordRequest(url.pathname);

  const idempotencyKey = getHeader(request, "Idempotency-Key");
  const token = idempotencyKey ? idempotencyToken("streams.create", idempotencyKey) : null;

  if (token && idempotencyStore.has(token)) {
    return NextResponse.json(idempotencyStore.get(token), { status: 201 });
  }

  // Global pause circuit breaker — create_stream is blocked during incidents.
  const pauseError = checkNotPaused("create_stream");
  if (pauseError) return pauseError;

  // Global pause circuit breaker — create_stream is blocked when paused.
  const pauseError = checkNotPaused("create_stream");
  if (pauseError) return pauseError;

  try {
    const body = await request.json();
    const { rate, recipient, schedule, token: rawToken } = body as {
      rate?: string;
      recipient?: string;
      schedule?: string;
      /**
       * SEP-41 token address for this stream's escrow.
       * Accepts "XLM", "native", or "CODE:ISSUER" (e.g. "USDC:GA5Z...").
       * Defaults to "XLM" when omitted.
       * Amounts are i128 raw units — no per-decimal logic in the contract.
       */
      token?: string;
    };

    if (!recipient || !rate || !schedule) {
      logger.warn("Stream creation validation failed", {
        fields: { rate: Boolean(rate), recipient: Boolean(recipient), schedule: Boolean(schedule) },
      });
      return createErrorResponse("VALIDATION_ERROR", "Missing required fields: recipient, rate, schedule", 422);
    }

    // ── SEP-41 token validation ──────────────────────────────────────────────
    // Normalise the token (defaults to XLM) and check against the allowlist.
    // The allowlist is admin-gated: when empty (disabled) every well-formed
    // token is accepted; when non-empty only listed tokens are accepted.
    const tokenStr = rawToken?.trim() || "XLM";
    let normalisedToken: string;
    try {
      normalisedToken = normaliseToken(tokenStr);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return createErrorResponse("INVALID_TOKEN", `Invalid token format: ${msg}`, 422);
    }

    const allowlistResult = checkTokenAllowed(normalisedToken);
    if (!allowlistResult.accepted) {
      logger.warn("Stream creation rejected: token not in allowlist", { token: normalisedToken });
      return createErrorResponse("TOKEN_NOT_ALLOWED", allowlistResult.reason, 422);
    }
    // ────────────────────────────────────────────────────────────────────────

    const id = `stream-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const newStream = {
      createdAt: now,
      id,
      nextAction: "start" as const,
      rate,
      recipient,
      schedule,
      status: "draft" as const,
      updatedAt: now,
      // Each stream carries its own SEP-41 token address.  Every subsequent
      // money-movement operation (withdraw, settle, cancel) MUST use this
      // field to construct its token client — never a hardcoded asset.
      token: normalisedToken,
    };

    streamRepository.streams.set(id, newStream);
    const payload = { data: newStream, links: { self: `/api/v1/streams/${id}` } };

    if (token) {
      idempotencyStore.set(token, payload);
    }

    return NextResponse.json(payload, { status: 201 });
  } catch {
    return errorResponse("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }
}
