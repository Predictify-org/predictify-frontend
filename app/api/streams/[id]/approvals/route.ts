/**
 * GET  /api/streams/:id/approvals   — List pending approvals for a stream
 * POST /api/streams/:id/approvals   — Initiate an approval (settle/stop)
 *
 * This route bridges the gap between stream actions and the multi-sig policy.
 */

import { NextResponse } from "next/server";
import { orgDb, getActiveApprovalsForStream } from "@/app/lib/org-db";
import { checkStreamOrgPolicy, initiateApproval } from "@/app/lib/org-policy";
import { ApprovalAction } from "@/app/lib/org-types";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message, request_id: "mock-request-id" } },
    { status },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: streamId } = await params;
  const approvals = getActiveApprovalsForStream(streamId);

  return NextResponse.json({
    data: approvals,
    meta: { total: approvals.length },
    links: { self: `/api/streams/${streamId}/approvals` },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: streamId } = await params;
  const actorAddress = request.headers.get("Actor-Wallet-Address");

  if (!actorAddress) {
    return errorResponse("UNAUTHORIZED", "Actor-Wallet-Address header is required.", 401);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST", "Request body must be valid JSON.", 400);
  }

  const { action } = body as { action?: string };
  const validActions: ApprovalAction[] = ["settle", "stop"];

  if (!action || !validActions.includes(action as ApprovalAction)) {
    return errorResponse(
      "VALIDATION_ERROR",
      `Field 'action' must be one of: ${validActions.join(", ")}.`,
      422,
    );
  }

  // 1. Resolve org and check policy
  const policyResult = checkStreamOrgPolicy(streamId, actorAddress, action as any);

  if (!policyResult) {
    return errorResponse("STREAM_NOT_ORG_OWNED", "Stream is individually owned and does not support approvals.", 400);
  }

  if (!policyResult.allowed) {
    return errorResponse(policyResult.code, policyResult.message, policyResult.httpStatus);
  }

  if (!policyResult.requiresApproval) {
    return errorResponse("APPROVAL_NOT_REQUIRED", `Action '${action}' does not require multi-sig for this org.`, 400);
  }

  // 2. Initiate approval
  const orgId = orgDb.streamOwnership.get(streamId)!;
  const org = orgDb.orgs.get(orgId)!;

  const result = initiateApproval(
    streamId,
    orgId,
    action as ApprovalAction,
    actorAddress,
    org.policy.requireApprovals,
  );

  if (!result.ok) {
    return errorResponse("INITIATION_FAILED", result.error, result.httpStatus);
  }

  return NextResponse.json({ data: result.approval }, { status: 201 });
}
