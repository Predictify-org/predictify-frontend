import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { processDeletionRequest } from "@/app/lib/privacy";

const JWT_SECRET = process.env.JWT_SECRET || "streampay-dev-secret-do-not-use-in-prod";

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, request_id: "mock-request-id" } }, { status });
}

/**
 * DELETE /api/identity/me/delete
 * Trigger a Data Subject Request (DSR) for account deletion.
 */
export async function DELETE(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return createErrorResponse("UNAUTHORIZED", "Missing or invalid authorization header", 401);
  }

  const token = authHeader.slice(7);
  try {
    const verified = jwt.verify(token, JWT_SECRET) as { sub?: string };
    if (!verified.sub) {
      return createErrorResponse("UNAUTHORIZED", "Invalid or expired token", 401);
    }

    const walletAddress = verified.sub;
    const result = await processDeletionRequest(walletAddress);

    return NextResponse.json({
      data: {
        ...result,
        message: "Your deletion request has been received and is being processed. All PII will be scrubbed within 30 days.",
        completion_estimate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    }, { status: 202 });
  } catch (error) {
    return createErrorResponse("INTERNAL_ERROR", "Failed to process deletion request", 500);
  }
}
