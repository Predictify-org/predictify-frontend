import { NextResponse } from "next/server";
import { db, idempotencyToken } from "@/app/lib/db";
import { transition } from "@/app/lib/state-machine";

type Context = { params: Promise<{ id: string }> };

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const idempotencyKey = request.headers.get("Idempotency-Key");
  const token = idempotencyKey ? idempotencyToken(`streams.pause.${id}`, idempotencyKey) : null;

  if (token && db.idempotency.has(token)) {
    return NextResponse.json(db.idempotency.get(token));
  }

  const stream = db.streams.get(id);
  if (!stream) {
    return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }

  const result = transition(stream.status, "pause");
  if (!result.ok) {
    return errorResponse(result.code, result.error, 409);
  }

  stream.status = result.nextStatus;
  stream.nextAction = "start";
  stream.updatedAt = new Date().toISOString();
  db.streams.set(id, stream);

  const payload = { data: stream };
  if (token) db.idempotency.set(token, payload);

  return NextResponse.json(payload);
}
