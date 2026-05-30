import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "streampay-dev-secret-do-not-use-in-prod";

export function tryAuthenticateRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header" };
  }
  const token = authHeader.slice(7);
  try {
    const verified = jwt.verify(token, JWT_SECRET) as { sub?: string };
    if (!verified.sub) {
      return { error: "Invalid or expired token" };
    }
    return { walletAddress: verified.sub };
  } catch {
    return { error: "Invalid or expired token" };
  }
}

export function createErrorResponse(code: string, message: string, status: number, requestId: string = "mock-request-id") {
  return NextResponse.json({ error: { code, message, request_id: requestId } }, { status });
}
