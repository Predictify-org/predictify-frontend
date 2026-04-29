import { NextResponse, NextRequest } from "next/server";
import { db, encodeCursor, decodeCursor } from "@/app/lib/db";
import { getClientIdentity, checkRateLimit, rateLimitResponse } from "@/app/lib/rate-limit";
import { recordThrottle, recordRequest } from "@/app/lib/rate-limit-metrics";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";

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

  const { searchParams } = url;
  const cursor = searchParams.get("cursor");
  const streamId = searchParams.get("streamId");
  const type = searchParams.get("type");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  let events = Array.from(db.activity.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  if (streamId) {
    events = events.filter((e) => e.streamId === streamId);
  }
  if (type) {
    events = events.filter((e) => e.type === type);
  }

  if (cursor) {
    const cursorId = decodeCursor(cursor);
    const cursorIndex = events.findIndex((e) => e.id === cursorId);
    if (cursorIndex >= 0) {
      events = events.slice(cursorIndex + 1);
    }

    if (cursor) {
      const cursorId = decodeCursor(cursor);
      const cursorIndex = events.findIndex((e) => e.id === cursorId);
      if (cursorIndex >= 0) {
        events = events.slice(cursorIndex + 1);
      }
    }

    const paginatedEvents = events.slice(0, limit);
    const hasNext = events.length > limit;
    const nextCursor = hasNext && paginatedEvents.length > 0 ? encodeCursor(paginatedEvents[paginatedEvents.length - 1].id) : null;

    logger.info('Activity list completed', { count: paginatedEvents.length, total: db.activity.size });

    return NextResponse.json({
      data: paginatedEvents,
      meta: { hasNext, nextCursor, total: db.activity.size },
      links: { self: `/api/v1/activity?limit=${limit}` },
    });
  });
}
