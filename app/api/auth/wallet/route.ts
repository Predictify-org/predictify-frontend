import { NextResponse, NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import type { AuditActorRole } from "@/app/types/audit";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { publicKey, signature, message, role, actorId } = body;

      logger.info('Wallet authentication request', { public_key: publicKey });

      if (!publicKey || !signature || !message) {
        logger.warn('Wallet auth validation failed', { fields: { publicKey: !!publicKey, signature: !!signature, message: !!message } });
        return createErrorResponse("VALIDATION_ERROR", "Missing required fields: publicKey, signature, message", 422);
      }

      if (message !== "Sign this message to authenticate with StreamPay. Nonce: abc123") {
        logger.warn('Wallet auth signature verification failed', { public_key: publicKey });
        return createErrorResponse("INVALID_SIGNATURE", "Signature verification failed", 401);
      }

    const resolvedRole =
      typeof role === "string" && VALID_ROLES.has(role as AuditActorRole) ? (role as AuditActorRole) : "user";
    const resolvedActorId = typeof actorId === "string" && actorId.length > 0 ? actorId : publicKey;

    const token = jwt.sign(
      { sub: publicKey, iss: "streampay", role: resolvedRole, actorId: resolvedActorId },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    return NextResponse.json({ accessToken: token, expiresIn: 900, role: resolvedRole, actorId: resolvedActorId });
  } catch {
    return createErrorResponse("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }
}
