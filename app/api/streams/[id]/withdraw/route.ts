import { NextResponse } from "next/server";
import { StreamService } from "@/app/lib/stream-service";
import { NextResponse, NextRequest } from "next/server";
import { db, withLock } from "@/app/lib/db";
import { evaluateWithdrawalState } from "@/app/lib/withdraw-finality";

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idempotencyKey = request.headers.get("Idempotency-Key");

  // 1. Quick idempotency check before locking
  if (idempotencyKey && db.idempotency.has(idempotencyKey)) {
    return NextResponse.json(db.idempotency.get(idempotencyKey));
  }

  // 2. Acquire lock for this stream ID
  return await withLock(id, async () => {
    // 3. Double-check idempotency inside the lock
    if (idempotencyKey && db.idempotency.has(idempotencyKey)) {
      return NextResponse.json(db.idempotency.get(idempotencyKey));
    }

    const stream = db.streams.get(id);
    if (!stream) {
      return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }

    // 4. Validate state
    if (stream.status !== "ended") {
      return createErrorResponse("INVALID_STREAM_STATE", `Only ended streams can be withdrawn from. Current status: ${stream.status}`, 409);
    }

    // 5. Update state
    stream.status = "withdrawn";
    stream.nextAction = undefined;
    stream.updatedAt = new Date().toISOString();
    db.streams.set(id, stream);

    const responseData = { data: stream };

    // 6. Store idempotency result
    if (idempotencyKey) {
      db.idempotency.set(idempotencyKey, responseData);
    }

    return NextResponse.json(responseData);
  });
}
