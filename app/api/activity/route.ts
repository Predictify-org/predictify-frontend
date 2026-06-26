import { NextResponse } from "next/server";
import { decodeCursor, encodeCursor, getStore } from "@/app/lib/db";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";
import { getCorrelationContext, logger, withCorrelationContext } from "@/app/lib/logger";

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

export async function GET(request: Request) {
  const { streamRepository } = getStore();
  const url = new URL(request.url);
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
  const streamId = searchParams.get("streamId");
  const type = searchParams.get("type");
  const limit = Math.min(Number.parseInt(searchParams.get("limit") || "20", 10), 100);

  const context = {
    correlation_id: request.headers.get("x-correlation-id") || `api-${crypto.randomUUID()}`,
    request_id: `req-${crypto.randomUUID()}`,
  };

  return withCorrelationContext(context, async () => {
    let events = Array.from(streamRepository.activity.values()).sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    );

    if (streamId) {
      events = events.filter((event) => event.streamId === streamId);
    }

    if (type) {
      events = events.filter((event) => event.type === type);
    }

    if (cursor) {
      let cursorId: string;
      try {
        cursorId = decodeCursor(cursor);
      } catch {
        return createErrorResponse("INVALID_CURSOR", "Malformed cursor", 422);
      }

      const cursorIndex = events.findIndex((event) => event.id === cursorId);
      if (cursorIndex >= 0) {
        events = events.slice(cursorIndex + 1);
      }
    }

    const paginatedEvents = events.slice(0, limit);
    const hasNext = events.length > limit;
    const nextCursor =
      hasNext && paginatedEvents.length > 0
        ? encodeCursor(paginatedEvents[paginatedEvents.length - 1].id)
        : null;

    logger.info("Activity list completed", {
      count: paginatedEvents.length,
      total: streamRepository.activity.size,
    });

    return NextResponse.json({
      data: paginatedEvents,
      meta: { hasNext, nextCursor, total: streamRepository.activity.size },
      links: { self: `/api/v1/activity?limit=${limit}` },
    });
  }
}
