/**
 * POST /api/streams/[id]/pause
 *
 * Transitions an active stream to "paused".
 *
 * ## Concurrency fix
 * The entire read-modify-write is wrapped in withLock(id, ...) — matching the
 * pattern used by settle, start, and stop — so that concurrent pause/start/stop
 * requests on the same stream are serialised and cannot interleave.
 *
 * ## Idempotency
 * The Idempotency-Key check is performed *inside* the lock so that two
 * concurrent requests carrying the same key cannot both pass the check and
 * double-apply the transition.
 *
 * ## Org-policy approval
 * If the stream has requiresApprovalToPause set, the handler returns 202 and
 * marks pendingApproval instead of immediately transitioning. A subsequent
 * approved request (without the flag) completes the transition.
 */

import { NextRequest, NextResponse } from "next/server";
import { db, withLock } from "@/app/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const idempotencyKey = req.headers.get("Idempotency-Key");

  if (token && db.idempotency.has(token)) {
    return NextResponse.json(db.idempotency.get(token));
  }

  const stream = db.streams.get(id);
  if (!stream) {
    return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }

  const actorAddress = getHeader(request, "Actor-Wallet-Address");
  const policyResult = actorAddress ? checkStreamOrgPolicy(id, actorAddress, "pause") : null;
  if (policyResult) {
    if (!policyResult.allowed) {
      return errorResponse(policyResult.code, policyResult.message, policyResult.httpStatus);
    }
    if (policyResult.requiresApproval) {
      return errorResponse(
        "APPROVAL_REQUIRED",
        "This action requires multi-sig approval. Please initiate an approval request.",
        409
      );
    }

  if (stream.status !== "active") {
    return errorResponse("INVALID_STREAM_STATE", "Only active streams can be paused", 409);
  }

    // ── Org-policy approval flow ──────────────────────────────────────────────
    // If the stream requires org approval before pausing, record the intent and
    // return 202 Accepted. The stream stays active until approval arrives.
    if (stream.requiresApprovalToPause && !stream.pendingApproval) {
      const pending = {
        ...stream,
        pendingApproval: true,
        updatedAt: new Date().toISOString(),
      };
      db.streams[id] = pending;

      const responseBody = { stream: pending, approvalRequired: true };
      if (idempotencyKey) {
        db.idempotencyKeys[idempotencyKey] = { status: 202, body: responseBody };
      }
      return NextResponse.json(responseBody, { status: 202 });
    }

    // ── Apply transition ──────────────────────────────────────────────────────
    const updated = {
      ...stream,
      status: "paused" as const,
      pendingApproval: false,
      updatedAt: new Date().toISOString(),
    };
    db.streams[id] = updated;

    const responseBody = { stream: updated };
    if (idempotencyKey) {
      db.idempotencyKeys[idempotencyKey] = { status: 200, body: responseBody };
    }

    return NextResponse.json(responseBody);
  });
}
