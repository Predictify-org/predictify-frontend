import { NextRequest } from "next/server";
import { errorResponse, ErrorCode } from "@/app/lib/errors";

/**
 * GET /api/webhooks/deliveries
 *
 * Returns a paginated list of webhook delivery attempts.
 * Query params:
 *   - limit  (number, default 20, max 100)
 *   - cursor (opaque pagination cursor)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const rawLimit = searchParams.get("limit");
    const cursor = searchParams.get("cursor") ?? undefined;

    const limit = rawLimit !== null ? parseInt(rawLimit, 10) : 20;

    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      return errorResponse(
        ErrorCode.BAD_REQUEST,
        "Query param 'limit' must be an integer between 1 and 100.",
        400,
      );
    }

    // TODO: fetch delivery records from the data layer
    const deliveries: unknown[] = [];

    return Response.json({ deliveries, cursor: cursor ?? null, limit }, { status: 200 });
  } catch {
    return errorResponse(
      ErrorCode.DELIVERY_FETCH_FAILED,
      "Failed to retrieve webhook deliveries.",
      500,
    );
  }
}
