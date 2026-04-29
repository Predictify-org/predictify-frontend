import { NextResponse } from "next/server";
import { db, idempotencyToken, withLock } from "@/app/lib/db";
import { getStellarSettlementClient } from "@/app/lib/stellar";

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idempotencyKey = request.headers.get("Idempotency-Key") || undefined;

  const result = await StreamService.applyAction(id, "settle", idempotencyKey);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    data: {
      ...result.data,
      settlement: {
        txHash: `fake-tx-${crypto.randomUUID().slice(0, 8)}`,
        settledAt: new Date().toISOString(),
      },
    },
  });
  const idempotencyKey = request.headers.get("Idempotency-Key");

  // 1. Quick idempotency check before locking
  if (idempotencyKey && db.idempotency.has(idempotencyKey)) {
    return NextResponse.json(db.idempotency.get(idempotencyKey));
  }

  // 2. Acquire lock for this stream ID to prevent race conditions
  return await withLock(id, async () => {
    // 3. Double-check idempotency inside the lock
    if (idempotencyKey && db.idempotency.has(idempotencyKey)) {
      return NextResponse.json(db.idempotency.get(idempotencyKey));
    }

    const stream = db.streams.get(id);
    if (!stream) {
      return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }

    // 4. Validate state (Atomic check-and-set)
    // Only active or paused streams can be settled. If it's already ended, this is a 409 or handled by idempotency.
    if (stream.status !== "active" && stream.status !== "paused") {
      return createErrorResponse("INVALID_STREAM_STATE", `Stream is in '${stream.status}' state and cannot be settled.`, 409);
    }

    // 5. Update state
    stream.status = "ended";
    stream.nextAction = "withdraw";
    stream.updatedAt = new Date().toISOString();
    db.streams.set(id, stream);

    const responseData = {
      data: {
        ...stream,
        settlement: {
          txHash: `fake-tx-${crypto.randomUUID().slice(0, 8)}`,
          settledAt: new Date().toISOString(),
        },
      },
    };

    // 6. Store idempotency result
    if (idempotencyKey) {
      db.idempotency.set(idempotencyKey, responseData);
    }

    return NextResponse.json(responseData);
  });
}
