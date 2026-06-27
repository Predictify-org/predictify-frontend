import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * JWT signing secret. Must be 32+ chars in production.
 */
export const JWT_SECRET = process.env.JWT_SECRET || "streampay-dev-secret-do-not-use-in-prod";

/**
 * Insecure dev JWT secret for testing purposes only.
 */
export const INSECURE_DEV_JWT_SECRET = "dev-secret-do-not-use-in-prod";

/**
 * Actor interface returned by tryAuthenticateRequest.
 */
export interface AuthenticatedActor {
  actorId: string;
  walletAddress: string;
  role: "user" | "admin" | "system";
  error?: string;
}

/**
 * Validates double-submit CSRF tokens using constant-time comparison.
 * Protects wallet authentication endpoints from timing and CSRF attacks.
 */
export function validateCsrfToken(cookieToken: string | null, headerToken: string | null): boolean {
  if (!cookieToken || !headerToken) return false;

  try {
    const bufCookie = Buffer.from(cookieToken);
    const bufHeader = Buffer.from(headerToken);

    if (bufCookie.length !== bufHeader.length) {
      return false;
    }

    // Secure constant-time string comparison
    return crypto.timingSafeEqual(bufCookie, bufHeader);
  } catch {
    return false;
  }
}

/**
 * Attempts to authenticate a request using JWT Bearer token.
 * Returns the authenticated actor or null if authentication fails.
 */
export function tryAuthenticateRequest(request: Request): AuthenticatedActor | null {
  const authHeader = request.headers?.get?.("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    
    // Validate required claims
    if (!decoded.sub || !decoded.iss || !decoded.aud) {
      return null;
    }

    // Validate issuer and audience
    if (decoded.iss !== "streampay" || decoded.aud !== "streampay-api") {
      return null;
    }

    return {
      actorId: decoded.actorId || decoded.sub,
      walletAddress: decoded.sub,
      role: decoded.role || "user",
    };
  } catch (error) {
    // Invalid token, expired, or verification failed
    return null;
  }
}
