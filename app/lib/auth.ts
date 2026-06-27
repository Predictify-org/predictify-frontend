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
import type { AuditActorRole } from "@/app/types/audit";

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
 * Attempts to authenticate a request from its Bearer JWT.
 *
 * In the MVP the JWT is verified against `process.env.JWT_SECRET`.
 * Returns `null` when no valid token is present — callers must treat
 * this as "unauthenticated" and fall back to header-based identity.
 *
 * Shape matches what `audit-log.ts` and `org-policy.ts` expect:
 *   { walletAddress, actorId, role }
 */
export function tryAuthenticateRequest(
  request: Request,
): { walletAddress: string; actorId: string; role: AuditActorRole } | null {
  try {
    const authHeader = request.headers?.get?.("Authorization") ?? null;
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7).trim();
    if (!token) return null;

    // Dynamic import keeps jsonwebtoken out of the critical bundle path.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jwt = require("jsonwebtoken") as typeof import("jsonwebtoken");
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const payload = jwt.verify(token, secret) as Record<string, unknown>;

    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const actorId = typeof payload.actorId === "string" ? payload.actorId : (sub ?? null);
    const role = typeof payload.role === "string" ? payload.role : "user";

    if (!sub) return null;

    return {
      actorId: actorId ?? sub,
      role: role as AuditActorRole,
      walletAddress: sub,
    };
  } catch {
    // Invalid / expired JWT — treat as unauthenticated
    return null;
  }
}
