import { NextResponse } from "next/server";
import { getStore } from "@/app/lib/db";
import { toV2Stream } from "@/app/lib/api-version";

type Context = { params: Promise<{ id: string }> };

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** GET /api/v2/streams/:id — single stream in v2 shape. */
export async function GET(_request: Request, { params }: Context) {
  const { streamRepository } = getStore();
  const { id } = await params;
  const stream = streamRepository.streams.get(id);
  if (!stream) {
    return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }
  return NextResponse.json({
    data: toV2Stream(stream),
    links: { self: `/api/v2/streams/${id}` },
  });
}

/** DELETE /api/v2/streams/:id */
export async function DELETE(_request: Request, { params }: Context) {
  const { streamRepository } = getStore();
  const { id } = await params;
  const stream = streamRepository.streams.get(id);
  if (!stream) {
    return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }
  if (stream.status === "active" || stream.status === "paused") {
    return errorResponse(
      "STREAM_INACTIVE_STATE",
      "Cannot delete an active or paused stream. Stop it first.",
      409,
    );
  }
  streamRepository.streams.delete(id);
  return new NextResponse(null, { status: 204 });
}
