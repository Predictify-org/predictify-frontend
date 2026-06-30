import { NextResponse } from "next/server";
import { db, withLock } from "@/app/lib/db";
import { withIdempotency, withdrawStore } from "@/app/lib/idempotency";
import { getCorrelationContext, logger } from "@/app/lib/logger";
import { checkStreamOrgPolicy } from "@/app/lib/org-policy";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";
import { evaluateWithdrawalState } from "@/app/lib/withdraw-finality";
import { maybeFeeBump } from "@/lib/feeBump";

type Context = { params: Promise<{ id: string }> };

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

function getHeader(request: Request, name: string): string | null {
  return request.headers?.get?.(name) ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const actorAddress = getHeader(request, "Actor-Wallet-Address");

  // IDEMPOTENCY: Withdraw is non-idempotent by nature — this wrapper ensures retries return the original response without re-executing the withdrawal
  return withIdempotency(request, "withdraw", withdrawStore, async () => {
    return withLock(id, async () => {
      const stream = db.streams.get(id);
      if (!stream) {
        return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
      }

      const policyResult = actorAddress
        ? checkStreamOrgPolicy(id, actorAddress, "withdraw")
        : null;
      if (policyResult) {
        if (!policyResult.allowed) {
          return createErrorResponse(policyResult.code, policyResult.message, policyResult.httpStatus);
        }
        if (policyResult.requiresApproval) {
          return createErrorResponse(
            "APPROVAL_REQUIRED",
            "This action requires multi-sig approval. Please initiate an approval request.",
            409
          );
        }
      }

      if (stream.status !== "ended") {
        if (stream.status === "withdrawn") {
          const payload = { data: stream, withdrawal: stream.withdrawal };
          return NextResponse.json(payload);
        }
        return createErrorResponse("INVALID_STREAM_STATE", "Only ended streams can be withdrawn from", 409);
      }

      const before = structuredClone(stream);
      let evaluationResult = await evaluateWithdrawalState(stream, new Date(), fetch);

      // ── Fee-bump: if the withdrawal failed due to insufficient fees,
      //    automatically attempt a fee-bump resubmission ─────────────────
      const { result: finalResult, feeBump } = await maybeFeeBump(
        { stream: evaluationResult.stream, alert: evaluationResult.alert },
        fetch,
      );

      if (feeBump.bumped) {
        logger.info("Fee-bump transaction submitted successfully", {
          streamId: id,
          newTxHash: feeBump.newTxHash,
        });
      } else if (feeBump.error) {
        logger.warn("Fee-bump attempt failed", {
          streamId: id,
          error: feeBump.error,
        });
      }

      const updated = finalResult.stream;
      db.streams.set(id, updated);

      const payload = {
        alert: finalResult.alert,
        data: updated,
        withdrawal: updated.withdrawal,
        ...(feeBump.bumped ? { feeBump: { bumped: true, newTxHash: feeBump.newTxHash } } : {}),
      };

      recordPrivilegedStreamAuditEvent({
        action: "stream.withdraw",
        after: updated as any,
        before: before as any,
        metadata: {
          resultingStatus: updated.status,
          withdrawalState: updated.withdrawal?.state ?? null,
        },
        request,
        streamId: id,
        targetAccount: updated.recipient,
      });

      logger.info("Stream withdrawn successfully", {
        streamId: id,
        action: "withdraw",
        status: "success",
      });

      return NextResponse.json(payload);
    });
  });
}
