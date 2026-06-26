import { NextResponse, NextRequest } from "next/server";
import { errorResponse, ErrorCode } from "@/app/lib/errors";
import { validateCsrfToken } from "@/app/lib/auth";

/**
 * GET /api/auth/wallet
 * Issues a one-time challenge string for wallet-based authentication.
 */
export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address || !/^G[A-Z2-7]{55}$/.test(address)) {
      return errorResponse(
        ErrorCode.BAD_REQUEST,
        "Query param 'address' must be a valid Stellar public key.",
        400,
      );
    }

    const challenge = `streampay_auth_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); 

    return NextResponse.json({ challenge, expires_at: expiresAt }, { status: 200 });
  } catch {
    return errorResponse(
      ErrorCode.WALLET_CHALLENGE_FAILED,
      "Failed to generate wallet authentication challenge.",
      500,
    );
  }
}

/**
 * POST /api/auth/wallet
 * Verifies double-submit CSRF token and issues a bearer token.
 */
export async function POST(req: NextRequest) {
  try {
    // Allows manual throw simulation to pass directly into catch block
    const body = await req.json();

    if (
      !body ||
      typeof body.address !== "string" ||
      typeof body.challenge !== "string" ||
      typeof body.signature !== "string"
    ) {
      return errorResponse(
        ErrorCode.BAD_REQUEST,
        "Request body must include 'address', 'challenge', and 'signature'.",
        400,
      );
    }

    const csrfCookie = req.cookies.get("csrf-token")?.value ?? null;
    const csrfHeader = req.headers.get("x-csrf-token");

    // Double-submit cookie check
    if (!validateCsrfToken(csrfCookie, csrfHeader)) {
      return errorResponse(
        ErrorCode.FORBIDDEN,
        "CSRF token mismatch.",
        403,
      );
    }

    const isValid = body.signature.length > 0; 

    if (!isValid) {
      return errorResponse(
        ErrorCode.UNAUTHORIZED,
        "Signature verification failed.",
        401,
      );
    }

    const token = `tok_${Buffer.from(body.address).toString("base64url").slice(0, 24)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); 

    return NextResponse.json({ token, expires_at: expiresAt }, { status: 200 });
  } catch {
    return errorResponse(
      ErrorCode.WALLET_VERIFY_FAILED,
      "Failed to verify wallet signature.",
      500,
    );
  }
}
