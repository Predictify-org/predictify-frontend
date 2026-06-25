import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { AuditActorRole } from "@/app/types/audit";
import crypto from "crypto";

// ── Constants ─────────────────────────────────────────────────────────────────

export const INSECURE_DEV_JWT_SECRET = "streampay-dev-secret-do-not-use-in-prod";

/** Token issuer — must match the value used when signing. */
export const JWT_ISSUER   = "streampay";

/** Token audience — must match the value used when signing. */
export const JWT_AUDIENCE = "streampay-api";

/** Allowed verification algorithms. HS256 still supported as fallback. */
const JWT_ALGORITHMS: jwt.Algorithm[] = ["HS256", "RS256"];

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

// ── Key rotation store ──────────────────────────────────────────────────────

export interface KeyEntry {
  kid: string;
  privateKeyPem?: string; // kept only in secure deployments
  publicKeyPem: string;
  createdAt: number; // epoch ms
  retiredAt?: number; // epoch ms when retired
}

/** In-memory keystore. In production, keys should come from a secure KMS. */
const keyStore: KeyEntry[] = [];

/** Rotation overlap window in ms (24 hours). */
export const KEY_OVERLAP_MS = 24 * 60 * 60 * 1000;

/** Add a key to the in-memory store. Does not log private material. */
export function addKey(entry: KeyEntry) {
  // Basic validation
  if (!entry || !entry.kid || !entry.publicKeyPem || !entry.createdAt) {
    throw new Error("invalid key entry");
  }
  // Avoid duplicates
  const existing = keyStore.find(k => k.kid === entry.kid);
  if (existing) {
    // merge retiredAt if provided
    if (entry.retiredAt) existing.retiredAt = entry.retiredAt;
    return;
  }
  keyStore.push({
    kid: entry.kid,
    publicKeyPem: entry.publicKeyPem,
    createdAt: entry.createdAt,
    retiredAt: entry.retiredAt,
  });
}

/** Get public-facing JWKS payload (minimal: kid + public PEM). */
export function getPublicKeys() {
  return keyStore.map(k => ({ kid: k.kid, publicKeyPem: k.publicKeyPem, createdAt: k.createdAt, retiredAt: k.retiredAt }));
}

/** Return the active signing key (the most recently created key that is not retired). */
export function getActiveSigningKey(): KeyEntry | undefined {
  const active = keyStore
    .filter(k => !k.retiredAt)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  return active;
}

/** Resolve a public key by kid, taking overlap window into account. */
export function resolvePublicKeyByKid(kid: string): string | undefined {
  const now = Date.now();
  const key = keyStore.find(k => k.kid === kid);
  if (!key) return undefined;
  if (!key.retiredAt) return key.publicKeyPem;
  // Allow verification within overlap window after retirement
  if (now <= key.retiredAt + KEY_OVERLAP_MS) return key.publicKeyPem;
  return undefined;
}

/** Helper: generate an RSA keypair for tests or development. */
export function generateRsaKeypair(): { privateKeyPem: string; publicKeyPem: string; kid: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const kid = crypto.createHash("sha256").update(publicKeyPem).digest("hex").slice(0, 8);
  return { privateKeyPem, publicKeyPem, kid };
}

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
  // Prefer active RSA signing key if available
  const active = getActiveSigningKey();
  if (active && active.privateKeyPem) {
    return jwt.sign(
      { sub: walletAddress, iss: JWT_ISSUER, aud: JWT_AUDIENCE, ...extra },
      active.privateKeyPem,
      { expiresIn: JWT_EXPIRES_IN, algorithm: "RS256", keyid: active.kid },
    );
  }

  // Fallback to symmetric HMAC signing
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
    // Decode header to determine algorithm/kid without verifying signature
    const decodedHeader = jwt.decode(token, { complete: true }) as { header?: Record<string, unknown> } | null;
    const kid = decodedHeader?.header?.kid as string | undefined;
    const alg = decodedHeader?.header?.alg as string | undefined;

    let verified: TokenClaims;

    // If token uses RSA and we have a matching public key (considering overlap), verify with that
    if (alg && alg.startsWith("RS") && kid) {
      const pub = resolvePublicKeyByKid(kid);
      if (pub) {
        verified = jwt.verify(token, pub, {
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
          algorithms: ["RS256"],
        }) as TokenClaims;
      } else {
        // No usable public key found for this kid
        return null;
      }
    } else {
      // Fallback to HMAC verification using shared secret
      verified = jwt.verify(token, JWT_SECRET, {
        issuer:     JWT_ISSUER,
        audience:   JWT_AUDIENCE,
        algorithms: ["HS256"],
      }) as TokenClaims;
    }

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
