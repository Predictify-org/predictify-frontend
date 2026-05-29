/**
 * GET /api/orgs/:orgId — Get org details (members, policy)
 */

import { NextResponse } from "next/server";
import { orgDb } from "@/app/lib/org-db";

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

  // Determine which streams this org owns
  const ownedStreams: string[] = [];
  for (const [streamId, owner] of orgDb.streamOwnership.entries()) {
    if (owner === orgId) ownedStreams.push(streamId);
  }

  return NextResponse.json({
    data: { ...org, ownedStreams },
    links: { self: `/api/orgs/${orgId}` },
  });
}
