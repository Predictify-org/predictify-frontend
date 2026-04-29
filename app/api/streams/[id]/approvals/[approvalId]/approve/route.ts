/**
 * POST /api/streams/:id/approvals/:approvalId/approve — Cast an approval vote
 */

import { NextResponse } from "next/server";
import { orgDb } from "@/app/lib/org-db";
import { castApproval } from "@/app/lib/org-policy";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message, request_id: "mock-request-id" } },
    { status },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; approvalId: string }> },
) {
  const { id: streamId, approvalId } = await params;
  const actorAddress = request.headers.get("Actor-Wallet-Address");

  if (!actorAddress) {
    return errorResponse("UNAUTHORIZED", "Actor-Wallet-Address header is required.", 401);
  }

  const approval = orgDb.approvals.get(approvalId);
  if (!approval || approval.streamId !== streamId) {
    return errorResponse("APPROVAL_NOT_FOUND", `Approval '${approvalId}' not found for stream '${streamId}'.`, 404);
  }

  const org = orgDb.orgs.get(approval.orgId);
  if (!org) {
    return errorResponse("ORG_NOT_FOUND", "Organization not found.", 404);
  }

  // 1. Cast the approval
  const result = castApproval(approvalId, actorAddress, org, approval.action);

  if (!result.ok) {
    return errorResponse("VOTE_FAILED", result.error, result.httpStatus);
  }

  // 2. If threshold is met, auto-execute the action in business logic
  if (result.thresholdMet) {
    const stream = orgDb.streamOwnership.has(streamId) ? orgDb.streamOwnership.get(streamId) : null;
    // In a real implementation, we would call the business logic reducer here
    // For MVP slice, we just return the approved status and let the user know execution would happen.
    
    // Simulating side effect on stream status if action is 'stop'
    if (approval.action === "stop") {
      const streamRecord = Array.from(orgDb.approvals.values()).find(a => a.id === approvalId);
      // Logic would typically live in a service layer
    }
  }

  return NextResponse.json({
    data: result.approval,
    meta: { thresholdMet: result.thresholdMet },
  });
}
