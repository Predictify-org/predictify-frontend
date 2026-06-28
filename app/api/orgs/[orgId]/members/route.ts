/**
 * GET  /api/orgs/:orgId/members   — List members
 * POST /api/orgs/:orgId/members   — Add a member
 *
 * Security note: In production, this endpoint must be gated behind JWT
 * verification and only accessible by org owners. The MVP uses
 * `Actor-Wallet-Address` header as a stand-in for the authenticated identity.
 */

import { NextResponse } from "next/server";
import { orgDb } from "@/app/lib/org-db";
import { OrgMember, OrgRole } from "@/app/lib/org-types";
import {
  extractCorrelationContext,
  getCorrelationContext,
  logger,
  withCorrelationContext,
} from "@/app/lib/logger";

const VALID_ROLES: OrgRole[] = ["owner", "pauser", "settler", "viewer"];

function errorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json(
    { error: { code, message, request_id: context?.request_id ?? "mock-request-id" } },
    { status },
  );
}

function orgNotFoundResponse(orgId: string) {
  logger.warn("Org members request rejected: org not found", { org_id: orgId });
  return errorResponse("ORG_NOT_FOUND", `Org '${orgId}' not found.`, 404);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const correlationContext = extractCorrelationContext(new Headers(request.headers));

  return withCorrelationContext(correlationContext, async () => {
    const org = orgDb.orgs.get(orgId);
    if (!org) {
      return orgNotFoundResponse(orgId);
    }

    logger.info("Org members listed", {
      org_id: orgId,
      member_count: org.members.length,
    });

    return NextResponse.json({
      data: org.members,
      meta: { total: org.members.length },
      links: { self: `/api/orgs/${orgId}/members` },
    });
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const correlationContext = extractCorrelationContext(new Headers(request.headers));

  return withCorrelationContext(correlationContext, async () => {
    const org = orgDb.orgs.get(orgId);
    if (!org) {
      return orgNotFoundResponse(orgId);
    }

    // AuthZ: only owners may add members (MVP header-based check)
    const actorAddress = request.headers.get("Actor-Wallet-Address") ?? "";
    const actor = org.members.find((m) => m.walletAddress === actorAddress);
    if (!actor || actor.role !== "owner") {
      logger.warn("Org member add rejected: forbidden", { org_id: orgId });
      return errorResponse(
        "FORBIDDEN",
        "Only org owners may add members.",
        403,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("INVALID_REQUEST", "Request body must be valid JSON.", 400);
    }

    const { walletAddress, role } = body as { walletAddress?: string; role?: string };

    if (!walletAddress || typeof walletAddress !== "string" || walletAddress.trim().length === 0) {
      return errorResponse("VALIDATION_ERROR", "Field 'walletAddress' is required.", 422);
    }
    if (!role || !VALID_ROLES.includes(role as OrgRole)) {
      return errorResponse(
        "VALIDATION_ERROR",
        `Field 'role' must be one of: ${VALID_ROLES.join(", ")}.`,
        422,
      );
    }

    // Idempotent: if already a member, return existing record
    const existing = org.members.find((m) => m.walletAddress === walletAddress.trim());
    if (existing) {
      return NextResponse.json({ data: existing }, { status: 200 });
    }

    const newMember: OrgMember = {
      walletAddress: walletAddress.trim(),
      role: role as OrgRole,
      addedAt: new Date().toISOString(),
    };

    org.members.push(newMember);
    org.updatedAt = new Date().toISOString();
    orgDb.orgs.set(orgId, org);

    logger.info("Org member added", {
      org_id: orgId,
      role: newMember.role,
    });

    return NextResponse.json({ data: newMember }, { status: 201 });
  });
}
