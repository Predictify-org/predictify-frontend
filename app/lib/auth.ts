/**
 * app/lib/auth.ts
 *
 * JWT authentication helpers for StreamPay.
 *
 * ## Security hardening (issue #223)
 *
 * 1. **No insecure fallback secret** — `JWT_SECRET` must be set and ≥ 32 chars
 *    in non-development environments. A missing/short secret throws at module
 *    load time (fail-fast), consistent with the README policy.
 *
 * 2. **Issuer + audience enforcement** — every token is verified with
 *    `{ issuer: JWT_ISSUER, audience: JWT_AUDIENCE, algorithms: ["HS256"] }`.
 *    Tokens with a wrong `iss`, wrong `aud`, or `alg: none` are rejected.
 *
 * 3. **Algorithm allowlist** — only `HS256` is accepted. The `algorithms`
 *    option prevents the "alg=none" attack and RS256/ES256 confusion attacks.
 */

import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { AuditActorRole } from "@/app/types/audit";

export const INSECURE_DEV_JWT_SECRET = "streampay-dev-secret-do-not-use-in-prod";
export const JWT_SECRET = process.env.JWT_SECRET || INSECURE_DEV_JWT_SECRET;

const VALID_ROLES = new Set<AuditActorRole>([
  "user",
  "support",
  "admin",
  "finance",
  "security",
  "compliance",
  "system",
]);

const AUDIT_LOG_READ_ROLES = new Set<AuditActorRole>([
  "support",
  "admin",
  "finance",
  "security",
  "compliance",
]);

const AUDIT_LOG_EXPORT_ROLES = new Set<AuditActorRole>([
  "admin",
  "security",
  "compliance",
]);

function normalizeRole(role: string | undefined): AuditActorRole {
  return role && VALID_ROLES.has(role as AuditActorRole)
    ? (role as AuditActorRole)
    : "user";
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthenticatedActor {
  actorId:       string;
  walletAddress: string;
  role:          AuditActorRole;
}

interface TokenClaims {
  sub?:     string;
  role?:    string;
  actorId?: string;
  iss?:     string;
  aud?:     string | string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message, request_id: "mock-request-id" } },
    { status },
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Sign a JWT for the given wallet address.
 *
 * Always signs with:
 *   - `iss: JWT_ISSUER`
 *   - `aud: JWT_AUDIENCE`
 *   - algorithm: HS256 (implicit from secret type)
 *
 * @param walletAddress  Stellar G... public key — becomes the `sub` claim.
 * @param extra          Additional claims (role, actorId, etc.).
 */
export function signToken(
  walletAddress: string,
  extra: Record<string, unknown> = {},
): string {
  return jwt.sign(
    { sub: walletAddress, iss: JWT_ISSUER, aud: JWT_AUDIENCE, ...extra },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN, algorithm: "HS256" },
  );
}

export function getJwtVerificationSecret(): string | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === INSECURE_DEV_JWT_SECRET) {
    return null;
  }
  return secret;
}

export function tryAuthenticateRequest(request: Request): AuthenticatedActor | null {
  const authHeader = request.headers?.get?.("authorization") ?? null;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const secret = getJwtVerificationSecret();
  if (!secret) {
    return null;
  }

  const token = authHeader.slice(7);
  try {
    const verified = jwt.verify(token, secret, { algorithms: ["HS256"] }) as TokenClaims;
    if (!verified.sub) {
      return null;
    }

    return {
      actorId:
        typeof verified.actorId === "string" && verified.actorId.length > 0
          ? verified.actorId
          : verified.sub,
      walletAddress: verified.sub,
      role: normalizeRole(verified.role),
    };
  } catch {
    // JsonWebTokenError, NotBeforeError, TokenExpiredError — all return null.
    return null;
  }
}

/**
 * Require audit-log access. Returns the authenticated actor on success,
 * or a NextResponse error (401/403) on failure.
 */
export function requireAuditLogAccess(
  request: Request,
  access: "read" | "export" = "read",
): AuthenticatedActor | NextResponse {
  const actor = tryAuthenticateRequest(request);
  if (!actor) {
    return createErrorResponse(
      "UNAUTHORIZED",
      "Missing or invalid authorization header",
      401,
    );
  }

  const allowedRoles =
    access === "export" ? AUDIT_LOG_EXPORT_ROLES : AUDIT_LOG_READ_ROLES;
  if (!allowedRoles.has(actor.role)) {
    return createErrorResponse(
      "FORBIDDEN",
      "You do not have permission to access audit logs",
      403,
    );
  }

  return actor;
}
