import { NextRequest } from "next/server";
import { errorResponse, ErrorCode } from "@/app/lib/errors";

/**
 * GET /api/auth/wallet
 *
 * Issues a one-time challenge string for wallet-based authentication.
 * The client signs the challenge with their Stellar private key and
 * submits it to POST /api/auth/wallet to receive a bearer token.
 *
 * Query params:
 *   - address (string, required) — Stellar public key (G…)
 *
 * Response: { "challenge": "<random nonce>", "expires_at": "<ISO-8601>" }
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
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min TTL

    // TODO: persist challenge → address mapping with TTL
    return Response.json({ challenge, expires_at: expiresAt }, { status: 200 });
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
 *
 * Verifies a signed challenge and issues a bearer token.
 *
 * Body: { "address": "G…", "challenge": "<nonce>", "signature": "<base64>" }
 * Response: { "token": "<JWT or opaque bearer token>", "expires_at": "<ISO-8601>" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

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

    // TODO: verify signature against stored challenge using Stellar SDK
    const isValid = body.signature.length > 0; // placeholder

    if (!isValid) {
      return errorResponse(
        ErrorCode.UNAUTHORIZED,
        "Signature verification failed.",
        401,
      );
    }

    const token = `tok_${Buffer.from(body.address).toString("base64url").slice(0, 24)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 h

    return Response.json({ token, expires_at: expiresAt }, { status: 200 });
  } catch {
    return errorResponse(
      ErrorCode.WALLET_VERIFY_FAILED,
      "Failed to verify wallet signature.",
      500,
    );
  }
}
