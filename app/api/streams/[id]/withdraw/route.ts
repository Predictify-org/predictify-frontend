import { NextResponse } from "next/server";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";
import { db, idempotencyToken, withLock } from "@/app/lib/db";
import { getCorrelationContext } from "@/app/lib/logger";
import { enforceStreamRbac } from "@/app/lib/org-policy";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";
import { evaluateWithdrawalState, MIN_CONFIRMATION_DEPTH } from "@/app/lib/withdraw-finality";

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

function getHeader(request: Request, name: string): string | null {
  return request.headers?.get?.(name) ?? null;
}

function getRequestUrl(request: Request, fallbackPath: string): URL {
  try {
    return request.url ? new URL(request.url) : new URL(`http://localhost${fallbackPath}`);
  } catch {
    return new URL(`http://localhost${fallbackPath}`);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url      = getRequestUrl(request, `/api/streams/${id}/withdraw`);
  const limitType = getLimitForRoute("POST", url.pathname);
  const identity  = getClientIdentity(request);
  const rl        = await checkRateLimit(identity, limitType);

  if (!rl.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(rl.retryAfter!);
  }
  recordRequest(url.pathname);

  const idempotencyKey = getHeader(request, "Idempotency-Key");
  const token = idempotencyKey
    ? idempotencyToken(`streams.withdraw.${id}`, idempotencyKey)
    : null;

  if (token && db.idempotency.has(token)) {
    return NextResponse.json(db.idempotency.get(token));
  }

  return withLock(id, async () => {
    if (token && db.idempotency.has(token)) {
      return NextResponse.json(db.idempotency.get(token));
    }

    const stream = db.streams.get(id);
    if (!stream) {
      return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }

    // Mandatory RBAC — missing actor → 403; role insufficient → 403.
    const rbacError = enforceStreamRbac(request, id, "withdraw");
    if (rbacError) return rbacError;

    if (stream.status !== "ended") {
      if (stream.status === "withdrawn") {
        const payload = { data: stream, withdrawal: stream.withdrawal };
        if (token) db.idempotency.set(token, payload);
        return NextResponse.json(payload);
      }
      return createErrorResponse(
        "INVALID_STREAM_STATE",
        "Only ended streams can be withdrawn from",
        409,
      );
    }

    const before = structuredClone(stream);
    const { alert, stream: updated } = await evaluateWithdrawalState(
      stream,
      new Date(),
      fetch,
    );
    db.streams.set(id, updated);

    const payload = {
      alert,
      data:       updated,
      withdrawal: updated.withdrawal,
      /**
       * Expose the required confirmation depth so clients can display
       * a meaningful "waiting for N confirmations" message.
       */
      finality: {
        minConfirmationDepth: MIN_CONFIRMATION_DEPTH,
        state: updated.withdrawal?.state ?? "pending",
      },
    };

    recordPrivilegedStreamAuditEvent({
      action: "stream.withdraw",
      after: updated as unknown as Record<string, unknown>,
      before: before as unknown as Record<string, unknown>,
      metadata: {
        resultingStatus:  updated.status,
        withdrawalState:  updated.withdrawal?.state ?? null,
        failureCode:      updated.withdrawal?.failureCode ?? null,
        minConfirmationDepth: MIN_CONFIRMATION_DEPTH,
      },
      request,
      streamId:      id,
      targetAccount: updated.recipient,
    });

    if (token) db.idempotency.set(token, payload);
    return NextResponse.json(payload);
  });
}
