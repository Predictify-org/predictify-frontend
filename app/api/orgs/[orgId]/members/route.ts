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

const VALID_ROLES: OrgRole[] = ["owner", "pauser", "settler", "viewer"];

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message, request_id: "mock-request-id" } },
    { status },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const org = orgDb.orgs.get(orgId);

  if (!org) {
    return errorResponse("ORG_NOT_FOUND", `Org '${orgId}' not found.`, 404);
  }

  return NextResponse.json({
    data: org.members,
    meta: { total: org.members.length },
    links: { self: `/api/orgs/${orgId}/members` },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const org = orgDb.orgs.get(orgId);

  if (!org) {
    return errorResponse("ORG_NOT_FOUND", `Org '${orgId}' not found.`, 404);
  }

  // AuthZ: only owners may add members (MVP header-based check)
  const actorAddress = request.headers.get("Actor-Wallet-Address") ?? "";
  const actor = org.members.find((m) => m.walletAddress === actorAddress);
  if (!actor || actor.role !== "owner") {
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

  return NextResponse.json({ data: newMember }, { status: 201 });
}
