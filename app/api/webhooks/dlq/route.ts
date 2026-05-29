import { NextRequest } from "next/server";
import { errorResponse, ErrorCode } from "@/app/lib/errors";

/**
 * POST /api/webhooks/dlq
 *
 * Receives dead-letter-queue webhook events for reprocessing.
 * Returns 200 on success, or the canonical error envelope on failure.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(ErrorCode.BAD_REQUEST, "Request body must be a JSON object.", 400);
    }

    // TODO: enqueue body for reprocessing
    return Response.json({ received: true }, { status: 200 });
  } catch {
    return errorResponse(
      ErrorCode.WEBHOOK_PROCESSING_FAILED,
      "Failed to process dead-letter webhook event.",
      500,
    );
  }
}
