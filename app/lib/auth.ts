import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { AuditActorRole } from "@/app/types/audit";

export const JWT_SECRET = process.env.JWT_SECRET || "streampay-dev-secret-do-not-use-in-prod";

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

const AUDIT_LOG_EXPORT_ROLES = new Set<AuditActorRole>(["admin", "security", "compliance"]);

export interface AuthenticatedActor {
  actorId: string;
  walletAddress: string;
  role: AuditActorRole;
}

interface TokenClaims {
  sub?: string;
  role?: string;
  actorId?: string;
}

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, request_id: "mock-request-id" } }, { status });
}

function normalizeRole(role: string | undefined): AuditActorRole {
  if (role && VALID_ROLES.has(role as AuditActorRole)) {
    return role as AuditActorRole;
  }
  return "user";
}

export function tryAuthenticateRequest(request: Request): AuthenticatedActor | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  try {
    const verified = jwt.verify(token, JWT_SECRET) as TokenClaims;
    if (!verified.sub) {
      return null;
    }

    return {
      actorId: typeof verified.actorId === "string" && verified.actorId.length > 0 ? verified.actorId : verified.sub,
      walletAddress: verified.sub,
      role: normalizeRole(verified.role),
    };
  } catch {
    return null;
  }
}

export function requireAuditLogAccess(request: Request, access: "read" | "export" = "read") {
  const actor = tryAuthenticateRequest(request);
  if (!actor) {
    return createErrorResponse("UNAUTHORIZED", "Missing or invalid authorization header", 401);
  }

  const allowedRoles = access === "export" ? AUDIT_LOG_EXPORT_ROLES : AUDIT_LOG_READ_ROLES;
  if (!allowedRoles.has(actor.role)) {
    return createErrorResponse("FORBIDDEN", "You do not have permission to access audit logs", 403);
  }

  return actor;
}
