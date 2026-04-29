import { NextResponse } from "next/server";
import { db, withLock } from "@/app/lib/db";
import { transition } from "@/app/lib/state-machine";
import { getStellarSettlementClient } from "@/app/lib/stellar";

type Context = { params: Promise<{ id: string }> };

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const idempotencyKey = request.headers.get("Idempotency-Key");

  if (idempotencyKey && db.idempotency.has(idempotencyKey)) {
    return NextResponse.json(db.idempotency.get(idempotencyKey));
  }

  return withLock(id, async () => {
    if (idempotencyKey && db.idempotency.has(idempotencyKey)) {
      return NextResponse.json(db.idempotency.get(idempotencyKey));
    }

    const stream = db.streams.get(id);
    if (!stream) {
      return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }

    const result = transition(stream.status, "settle");
    if (!result.ok) {
      return errorResponse(result.code, result.error, 409);
    }

    const client = getStellarSettlementClient();
    const receipt = await client.settleStream({ streamId: id });

    stream.status = result.nextStatus;
    stream.nextAction = "withdraw";
    stream.settlementTxHash = receipt.txHash;
    stream.updatedAt = new Date().toISOString();
    db.streams.set(id, stream);

    const responseData = {
      data: { ...stream, settlement: { txHash: receipt.txHash, settledAt: receipt.settledAt } },
    };

    if (idempotencyKey) db.idempotency.set(idempotencyKey, responseData);

    return NextResponse.json(responseData);
  });
}
