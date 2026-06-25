import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { AuditActorRole } from "@/app/types/audit";

// ── Constants ─────────────────────────────────────────────────────────────────

export const INSECURE_DEV_JWT_SECRET = "streampay-dev-secret-do-not-use-in-prod";

/** Token issuer — must match the value used when signing. */
export const JWT_ISSUER   = "streampay";

/** Token audience — must match the value used when signing. */
export const JWT_AUDIENCE = "streampay-api";

/** Only HS256 is accepted. Prevents alg=none and algorithm-confusion attacks. */
const JWT_ALGORITHMS: jwt.Algorithm[] = ["HS256"];

/** JWT lifetime for newly issued tokens. */
export const JWT_EXPIRES_IN = "15m";

// ── Secret resolution ─────────────────────────────────────────────────────────

const MIN_SECRET_LENGTH = 32;

/**
 * Resolve and validate the JWT secret.
 *
 * - In `development` / `test`: falls back to the dev placeholder so local
 *   development works without env setup, but logs a warning.
 * - In all other environments: throws immediately if the secret is absent
 *   or shorter than MIN_SECRET_LENGTH characters.
 *
 * Called once at module load so misconfigured deployments fail at boot.
 */
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const env    = process.env.NODE_ENV ?? "development";
  const isDev  = env === "development" || env === "test";

  if (!secret || secret.length === 0) {
    if (isDev) {
      // Dev-only fallback — never reaches production.
      console.warn(
        "[auth] JWT_SECRET is not set. Using insecure dev placeholder. " +
        "Set JWT_SECRET in production.",
      );
      return INSECURE_DEV_JWT_SECRET;
    }
    throw new Error(
      "[auth] JWT_SECRET environment variable is required in non-development environments.",
    );
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    if (isDev) {
      console.warn(
        `[auth] JWT_SECRET is shorter than ${MIN_SECRET_LENGTH} characters. ` +
        "Use a longer secret in production.",
      );
    } else {
      throw new Error(
        `[auth] JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters ` +
        `in non-development environments (got ${secret.length}).`,
      );
    }
  }

  return secret;
}

/**
 * The resolved JWT secret. Validated at module load — throws in production
 * if the secret is missing or too short.
 */
export const JWT_SECRET: string = resolveJwtSecret();

// ── Role helpers ──────────────────────────────────────────────────────────────

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

/**
 * Attempt to authenticate an incoming request via its `Authorization: Bearer`
 * header.
 *
 * Verifies:
 *   - Signature (HMAC-SHA256 with JWT_SECRET)
 *   - Issuer (`iss === JWT_ISSUER`)
 *   - Audience (`aud === JWT_AUDIENCE`)
 *   - Algorithm allowlist (`algorithms: ["HS256"]`) — rejects alg=none
 *   - Expiry
 *
 * Returns `null` (not an error) on any verification failure so callers can
 * decide whether to return 401 or fall through to another auth method.
 */
export function tryAuthenticateRequest(request: Request): AuthenticatedActor | null {
  const authHeader = request.headers?.get?.("authorization") ?? null;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const verified = jwt.verify(token, JWT_SECRET, {
      issuer:     JWT_ISSUER,
      audience:   JWT_AUDIENCE,
      algorithms: JWT_ALGORITHMS,
    }) as TokenClaims;

    if (!verified.sub) return null;

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
