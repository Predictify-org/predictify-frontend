import { NextResponse } from "next/server";
import { getPublicKeys } from "@/app/lib/auth";

/**
 * GET /api/auth/jwks
 *
 * Returns the current public keys for JWT verification. For simplicity
 * this endpoint returns an array of objects with `kid` and `publicKeyPem`.
 * In production you may prefer a fully-formed JWK set.
 */
export async function GET() {
  try {
    const keys = getPublicKeys().map(k => ({ kid: k.kid, publicKeyPem: k.publicKeyPem, created_at: new Date(k.createdAt).toISOString(), retired_at: k.retiredAt ? new Date(k.retiredAt).toISOString() : null }));
    return NextResponse.json({ keys }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch JWKS" } }, { status: 500 });
  }
}
