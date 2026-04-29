import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { transition } from "@/app/lib/state-machine";

type Context = { params: Promise<{ id: string }> };

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const stream = db.streams.get(id);
  if (!stream) {
    return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }

  const result = transition(stream.status, "start");
  if (!result.ok) {
    return errorResponse(result.code, result.error, 409);
  }

  stream.status = result.nextStatus;
  stream.nextAction = "pause";
  stream.updatedAt = new Date().toISOString();
  db.streams.set(id, stream);

  return NextResponse.json({ data: stream });
}
