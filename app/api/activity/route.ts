import { NextResponse } from "next/server";
import {
  decodeCompositeCursor,
  encodeCompositeCursor,
  getStore,
} from "@/app/lib/db";
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
    let events = Array.from(streamRepository.activity.values()).sort((a, b) => {
      const tsCmp = b.timestamp.localeCompare(a.timestamp);
      return tsCmp !== 0 ? tsCmp : b.id.localeCompare(a.id);
    });

    if (streamId) {
      events = events.filter((event) => event.streamId === streamId);
    }

    if (type) {
      events = events.filter((event) => event.type === type);
    }

    const totalFiltered = events.length;

    if (cursor) {
      let cursorTimestamp: string;
      let cursorId: string;
      try {
        const decoded = decodeCompositeCursor(cursor);
        cursorTimestamp = decoded.timestamp;
        cursorId = decoded.id;
      } catch {
        return createErrorResponse("INVALID_CURSOR", "Malformed cursor", 422);
      }

      events = events.filter((event) => {
        const tsCmp = event.timestamp.localeCompare(cursorTimestamp);
        return tsCmp < 0 || (tsCmp === 0 && event.id.localeCompare(cursorId) < 0);
      });
    }

    const paginatedEvents = events.slice(0, limit);
    const hasNext = events.length > limit;
    const nextCursor =
      hasNext && paginatedEvents.length > 0
        ? encodeCompositeCursor(
            paginatedEvents[paginatedEvents.length - 1].timestamp,
            paginatedEvents[paginatedEvents.length - 1].id,
          )
        : null;

    logger.info("Activity list completed", {
      count: paginatedEvents.length,
      total: totalFiltered,
    });

    return NextResponse.json({
      data: paginatedEvents,
      meta: { hasNext, nextCursor, total: totalFiltered },
      links: { self: `/api/activity?limit=${limit}` },
    });
  });
}
