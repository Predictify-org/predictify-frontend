/**
 * POST /api/streams/[id]/settle
 *
 * Transitions an active or paused stream to "ended" and records the final
 * balance. Idempotent: repeated requests with the same Idempotency-Key
 * return the cached response without re-applying the transition.
 *
 * Concurrency: the entire read-modify-write is wrapped in withLock(id) so
 * that concurrent settle/pause/start/stop requests on the same stream are
 * serialised.
 */

import { NextRequest, NextResponse } from "next/server";
import { db, withLock } from "@/app/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const idempotencyKey = req.headers.get("Idempotency-Key");

  return withLock(id, async () => {
    // Re-check idempotency inside the lock so two concurrent requests with
    // the same key cannot both pass the check and double-apply.
    if (idempotencyKey) {
      const cached = db.idempotencyKeys[idempotencyKey];
      if (cached) {
        return NextResponse.json(cached.body, { status: cached.status });
      }
    }

    const stream = db.streams[id];
    if (!stream) {
      return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }

    const actorAddress = getHeader(request, "Actor-Wallet-Address");
    const policyResult = actorAddress ? checkStreamOrgPolicy(id, actorAddress, "settle") : null;
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
    }

    if (stream.status !== "active" && stream.status !== "paused") {
      return errorResponse("INVALID_STREAM_STATE", "Only active or paused streams can be settled", 409);
    }

    const updated = {
      ...stream,
      status: "ended" as const,
      updatedAt: new Date().toISOString(),
    };
    db.streams[id] = updated;

    try {
      const settlement = await getStellarSettlementClient().settleStream({ streamId: id });
      recordPrivilegedStreamAuditEvent({
        action: "stream.settle",
        after: updatedStream as any,
        before: before as any,
        metadata: {
          settlementTxHash: settlement.txHash,
        },
        request,
        streamId: id,
        targetAccount: updatedStream.recipient,
      });

      const payload = { data: { ...updatedStream, settlement } };
      if (token) {
        db.idempotency.set(token, payload);
      }

      return NextResponse.json(payload);
    } catch {
      return errorResponse("SETTLEMENT_FAILED", "Failed to settle stream on Stellar/Soroban", 502);
    }

    return NextResponse.json(responseBody);
  });
}
