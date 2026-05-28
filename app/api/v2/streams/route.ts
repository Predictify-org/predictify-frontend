import { NextRequest } from "next/server";
import { errorResponse, ErrorCode } from "@/app/lib/errors";
import { toV2Stream, type StreamV1 } from "@/app/lib/api-version";

/**
 * GET /api/v2/streams
 *
 * Returns the authenticated user's payment streams in the v2 shape.
 * Requires: Authorization: Bearer <token>
 *
 * Response: { "streams": StreamV2[] }
 *
 * Deprecation notice: v1 /api/streams is sunset — see Deprecation header.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return errorResponse(ErrorCode.UNAUTHORIZED, "Bearer token required.", 401);
  }

  try {
    // TODO: fetch from data layer using token identity
    const v1Streams: StreamV1[] = [];
    const streams = v1Streams.map(toV2Stream);

    return Response.json({ streams }, { status: 200 });
  } catch {
    return errorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      "Failed to retrieve streams.",
      500,
    );
  }
}

/**
 * POST /api/v2/streams
 *
 * Creates a new payment stream.
 * Requires: Authorization: Bearer <token>
 *
 * Body: { "recipient": "G…", "rate": "120 XLM/month", "currency": "XLM" }
 * Response: StreamV2 (201)
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return errorResponse(ErrorCode.UNAUTHORIZED, "Bearer token required.", 401);
  }

  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body.recipient !== "string" || typeof body.rate !== "string") {
      return errorResponse(
        ErrorCode.BAD_REQUEST,
        "Request body must include 'recipient' and 'rate'.",
        400,
      );
    }

    // TODO: persist stream via data layer
    const created: StreamV1 = {
      id: `stream_${Date.now().toString(36)}`,
      recipient: body.recipient,
      rate: body.rate,
      status: "draft",
      actions: ["start"],
      createdAt: new Date().toISOString(),
    };

    return Response.json(toV2Stream(created), { status: 201 });
  } catch {
    return errorResponse(
      ErrorCode.STREAM_CREATE_FAILED,
      "Failed to create stream.",
      500,
    );
  }
}
