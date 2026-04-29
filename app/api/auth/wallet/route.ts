import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getClientIdentity, checkRateLimit, rateLimitResponse } from "@/app/lib/rate-limit";
import { recordThrottle, recordRequest } from "@/app/lib/rate-limit-metrics";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { logger, getCorrelationContext } from "@/app/lib/logger";
import { auditLogStore, buildRequestId } from "@/app/lib/audit-log";
import {
  issueWalletLinkChallenge,
  verifyWalletLinkChallenge,
  isValidStellarPublicKey,
  WalletLinkError,
} from "@/app/lib/wallet-link";
import type { AuditActorRole, AuditMetadataValue } from "@/app/types/audit";

const JWT_SECRET = process.env.JWT_SECRET || "streampay-dev-secret-do-not-use-in-prod";
const VALID_ROLES = new Set<AuditActorRole>([
  "user",
  "support",
  "admin",
  "finance",
  "security",
  "compliance",
  "system",
]);

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

function resolveRole(role: unknown): AuditActorRole {
  return typeof role === "string" && VALID_ROLES.has(role as AuditActorRole)
    ? (role as AuditActorRole)
    : "user";
}

function resolveActorId(actorId: unknown, publicKey: string): string {
  return typeof actorId === "string" && actorId.length > 0 ? actorId : publicKey;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitType = getLimitForRoute("GET", url.pathname);
  const identity = getClientIdentity(request);
  const result = await checkRateLimit(identity, limitType);

  if (!result.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(result.retryAfter!);
  }
  recordRequest(url.pathname);

  const publicKey = url.searchParams.get("publicKey");
  if (!publicKey || !isValidStellarPublicKey(publicKey)) {
    logger.warn("Wallet challenge request failed", { public_key: publicKey });
    return createErrorResponse("VALIDATION_ERROR", "Valid publicKey query parameter is required", 422);
  }

  try {
    const challenge = issueWalletLinkChallenge(publicKey);
    logger.info("Wallet challenge issued", { public_key: publicKey, nonce: challenge.nonce });
    return NextResponse.json({ data: challenge });
  } catch (error) {
    if (error instanceof WalletLinkError) {
      return createErrorResponse(error.code, error.message, error.status);
    }
    logger.error("Unexpected wallet challenge error", { error });
    return createErrorResponse("INTERNAL_ERROR", "Unable to issue wallet challenge", 500);
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const limitType = getLimitForRoute("POST", url.pathname);
  const identity = getClientIdentity(request);
  const result = await checkRateLimit(identity, limitType);

  if (!result.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(result.retryAfter!);
  }
  recordRequest(url.pathname);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }

  const {
    publicKey,
    signature,
    message,
    nonce,
    role,
    actorId,
  } = body as Record<string, unknown>;

  if (!publicKey || !signature || !message || !nonce) {
    logger.warn("Wallet verification request failed", {
      public_key: publicKey,
      hasSignature: Boolean(signature),
      hasMessage: Boolean(message),
      hasNonce: Boolean(nonce),
    });
    return createErrorResponse(
      "VALIDATION_ERROR",
      "Missing required fields: publicKey, nonce, signature, message",
      422
    );
  }

  if (typeof publicKey !== "string" || !isValidStellarPublicKey(publicKey)) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid Stellar public key", 422);
  }

  try {
    verifyWalletLinkChallenge({
      publicKey,
      nonce: String(nonce),
      message: String(message),
      signature: String(signature),
    });
  } catch (error) {
    if (error instanceof WalletLinkError) {
      logger.warn("Wallet verification failed", {
        public_key: publicKey,
        nonce: String(nonce),
        code: error.code,
      });
      return createErrorResponse(error.code, error.message, error.status);
    }
    logger.error("Unexpected wallet verification error", { error });
    return createErrorResponse("INTERNAL_ERROR", "Unable to verify wallet challenge", 500);
  }

  const resolvedRole = resolveRole(role);
  const resolvedActorId = resolveActorId(actorId, publicKey);
  const token = jwt.sign(
    { sub: publicKey, iss: "streampay", role: resolvedRole, actorId: resolvedActorId },
    JWT_SECRET,
    { expiresIn: "15m" }
  );

  auditLogStore.append({
    action: "wallet.link",
    actor: { id: resolvedActorId, role: resolvedRole },
    after: { walletAddress: publicKey },
    requestId: buildRequestId(request),
    target: { type: "account", id: publicKey, account: publicKey },
    metadata: { nonce: String(nonce) } as Record<string, AuditMetadataValue>,
  });

  logger.info("Wallet linked successfully", { public_key: publicKey, actor_id: resolvedActorId });

  return NextResponse.json({ accessToken: token, expiresIn: 900, role: resolvedRole, actorId: resolvedActorId });
}
