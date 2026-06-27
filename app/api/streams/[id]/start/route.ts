import { NextResponse } from "next/server";
import {
  checkIdempotency,
  computeFingerprint,
  db,
  idempotencyToken,
  setIdempotency,
  withLock,
} from "@/app/lib/db";
import { getCorrelationContext, logger } from "@/app/lib/logger";
import { checkStreamOrgPolicy } from "@/app/lib/org-policy";

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

  const idempotencyKey = getHeader(request, "Idempotency-Key");
  const token = idempotencyKey
    ? idempotencyToken(`streams.start.${id}`, idempotencyKey)
    : null;

  const fingerprint = computeFingerprint("POST", `/api/streams/${id}/start`, null);

  if (token) {
    const cached = checkIdempotency(db.idempotency, token, fingerprint);
    if (cached) {
      if (!cached.ok) {
        return NextResponse.json(
          { error: { code: "IDEMPOTENCY_CONFLICT", message: "Idempotency key has been used with a different request." } },
          { status: 409 },
        );
      }
      return NextResponse.json(cached.body, { status: cached.status });
    }
  }

  return withLock(id, async () => {
    if (token) {
      const cached = checkIdempotency(db.idempotency, token, fingerprint);
      if (cached) {
        if (!cached.ok) {
          return NextResponse.json(
            { error: { code: "IDEMPOTENCY_CONFLICT", message: "Idempotency key has been used with a different request." } },
            { status: 409 },
          );
        }
        return NextResponse.json(cached.body, { status: cached.status });
      }
    }

    const stream = db.streams.get(id);
    if (!stream) {
      return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }

    // Allow both draft→active (initial start) and paused→active (resume).
    // Any other status is an illegal transition.
    if (stream.status !== "draft" && stream.status !== "paused") {
      return createErrorResponse(
        "INVALID_STREAM_STATE",
        `Cannot start a stream in '${stream.status}' status. Stream must be draft or paused.`,
        409,
      );
    }

    const isResume = stream.status === "paused";

    const actorAddress = getHeader(request, "Actor-Wallet-Address");
    // Use "start" for initial activation; "resume" maps to "start" in the org policy
    const orgAction = "start" as const;
    const policyResult = actorAddress
      ? checkStreamOrgPolicy(id, actorAddress, orgAction)
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

    const updatedStream = {
      ...stream,
      nextAction: "pause" as const,
      // Clear pausedAt when resuming — the field only tracks when the stream
      // entered paused state and is meaningless once it is active again.
      // Cleared here to prevent stale timestamps appearing in API responses.
      pausedAt: undefined as string | undefined,
      status: "active" as const,
      updatedAt: new Date().toISOString(),
    };
    db.streams.set(id, updatedStream);

    const payload = { data: updatedStream };
    if (token) {
      setIdempotency(db.idempotency, token, fingerprint, 200, payload);
    }

    logger.info(isResume ? "Stream resumed successfully" : "Stream started successfully", {
      streamId: id,
      action: isResume ? "resume" : "start",
      status: "success",
    });

    return NextResponse.json(payload);
  });
}
