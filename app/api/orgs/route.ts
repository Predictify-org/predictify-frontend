/**
 * POST /api/orgs   — Create a new org
 * GET  /api/orgs   — List all orgs (omits member wallet addresses for privacy)
 */

import { NextResponse } from "next/server";
import { orgDb } from "@/app/lib/org-db";
import { OrgRecord, OrgMember, DEFAULT_STREAM_POLICY } from "@/app/lib/org-types";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message, request_id: "mock-request-id" } },
    { status },
  );
}

export async function GET() {
  const orgs = Array.from(orgDb.orgs.values()).map((org) => ({
    id: org.id,
    name: org.name,
    memberCount: org.members.length,
    policy: org.policy,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  }));

  return NextResponse.json({
    data: orgs,
    meta: { total: orgs.length },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST", "Request body must be valid JSON.", 400);
  }

  const { name, ownerWalletAddress } = body as {
    name?: string;
    ownerWalletAddress?: string;
  };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return errorResponse("VALIDATION_ERROR", "Field 'name' is required.", 422);
  }
  if (
    !ownerWalletAddress ||
    typeof ownerWalletAddress !== "string" ||
    ownerWalletAddress.trim().length === 0
  ) {
    return errorResponse("VALIDATION_ERROR", "Field 'ownerWalletAddress' is required.", 422);
  }

  const id = `org-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const owner: OrgMember = {
    walletAddress: ownerWalletAddress.trim(),
    role: "owner",
    addedAt: now,
  };

  const newOrg: OrgRecord = {
    id,
    name: name.trim(),
    members: [owner],
    policy: { ...DEFAULT_STREAM_POLICY },
    createdAt: now,
    updatedAt: now,
  };

  orgDb.orgs.set(id, newOrg);

  return NextResponse.json(
    { data: newOrg, links: { self: `/api/orgs/${id}` } },
    { status: 201 },
  );
}
