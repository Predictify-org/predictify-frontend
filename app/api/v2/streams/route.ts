import { NextRequest, NextResponse } from "next/server";
import { errorResponse, ErrorCode } from "@/app/lib/errors";
import { toV2Stream, type StreamV1, dbStreamToV1 } from "@/app/lib/api-version";
import { validateCreateStreamBody } from "@/app/lib/stream-validation";
import { db } from "@/app/lib/db";
import {
  encodeCursor,
  parsePaginationParams,
  type CursorPayload,
} from "@/app/lib/cursor-pagination";

/**
 * GET /api/v2/streams
 *
 * Returns the authenticated user's payment streams with cursor-based pagination.
 * Requires: Authorization: Bearer <token>
 *
 * Query parameters:
 * - `cursor`: Opaque pagination cursor from previous response (optional)
 * - `limit`: Number of records to return (1-100, default 20)
 *
 * Response: {
 *   "streams": StreamV2[],
 *   "pagination": {
 *     "next_cursor": string | null,
 *     "limit": number
 *   }
 * }
 *
 * Streams are ordered by (created_at DESC, id DESC) for stable pagination.
 * Deprecation notice: v1 /api/streams is sunset — see Deprecation header.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return errorResponse(ErrorCode.UNAUTHORIZED, "Bearer token required.", 401);
  }

  try {
    // Parse pagination parameters
    const { cursor, limit } = parsePaginationParams(req.nextUrl.searchParams);

    // Fetch streams from data layer with cursor-based filtering
    const allStreams = Array.from(db.streams.values());

    // Apply cursor filter and stable ordering
    const filtered = filterAndSortStreams(allStreams, cursor);

    // Take limit + 1 to determine if there are more pages
    const page = filtered.slice(0, limit + 1);
    const hasMore = page.length > limit;
    const streams = page.slice(0, limit);

    // Convert to v2 shape
    const v2Streams = streams.map((s) => toV2Stream(dbStreamToV1(s)));

    // Generate next cursor if there are more results
    const nextCursor =
      hasMore && streams.length > 0
        ? encodeCursor(
            streams[streams.length - 1].createdAt,
            streams[streams.length - 1].id,
          )
        : null;

    return NextResponse.json(
      {
        streams: v2Streams,
        pagination: {
          next_cursor: nextCursor,
          limit,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    // Handle invalid cursor errors with 422
    if (err instanceof Error && err.message.includes("Invalid cursor")) {
      return errorResponse(ErrorCode.INVALID_CURSOR, err.message, 422);
    }

    return errorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      "Failed to retrieve streams.",
      500,
    );
  }
}

/**
 * Filter and sort streams for cursor pagination.
 *
 * Ordering: (created_at DESC, id DESC) — stable two-column sort.
 *
 * When a cursor is provided:
 * - Include only streams where (created_at, id) < cursor tuple
 * - This implements keyset pagination (more efficient than OFFSET)
 *
 * @param streams - All streams from data layer
 * @param cursor - Decoded cursor payload (null for first page)
 * @returns Sorted and filtered stream array
 */
function filterAndSortStreams(
  streams: Array<{ id: string; createdAt: string; [key: string]: any }>,
  cursor: CursorPayload | null,
): Array<{ id: string; createdAt: string; [key: string]: any }> {
  // Apply cursor filter
  let filtered = streams;
  if (cursor) {
    filtered = streams.filter((s) => {
      // Include streams where (created_at, id) < cursor
      // (created_at DESC, id DESC) means we want earlier timestamps
      if (s.createdAt < cursor.createdAt) return true;
      if (s.createdAt > cursor.createdAt) return false;
      // Same timestamp: use id for tie-breaking
      return s.id < cursor.id;
    });
  }

  // Sort by (created_at DESC, id DESC)
  return filtered.sort((a, b) => {
    // DESC order: newer first
    if (a.createdAt !== b.createdAt) {
      return b.createdAt.localeCompare(a.createdAt);
    }
    // Tie-break on id DESC
    return b.id.localeCompare(a.id);
  });
}

/**
 * POST /api/v2/streams
 *
 * Creates a new payment stream.
 * Requires: Authorization: Bearer <token>
 *
 * Body: { "recipient": "G…", "rate": "120", "schedule": "month", "token": "XLM" }
 * Response: StreamV2 (201)
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return errorResponse(ErrorCode.UNAUTHORIZED, "Bearer token required.", 401);
  }

  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(
        ErrorCode.BAD_REQUEST,
        "Request body must be valid JSON.",
        400,
      );
    }

    // Shared schema validation
    const validationErrors = validateCreateStreamBody(body as Record<string, unknown>);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "One or more fields are invalid.",
            details: validationErrors,
            request_id: "unknown",
          },
        },
        { status: 422 },
      );
    }

    const { recipient, rate, schedule } = body as {
      recipient: string;
      rate: string;
      schedule: string;
    };

    // TODO: persist stream via data layer
    const created: StreamV1 = {
      id: `stream_${Date.now().toString(36)}`,
      recipient,
      rate,
      status: "draft",
      actions: ["start"],
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(toV2Stream(created), { status: 201 });
  } catch {
    return errorResponse(
      ErrorCode.STREAM_CREATE_FAILED,
      "Failed to create stream.",
      500,
    );
  }
}
