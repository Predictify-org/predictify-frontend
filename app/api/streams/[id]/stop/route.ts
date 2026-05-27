/**
 * POST /api/streams/[id]/stop
 *
 * Transitions an active or paused stream to "ended" immediately (no balance
 * settlement — use /settle for that). Idempotent via Idempotency-Key header.
 * Concurrency: serialised under withLock(id).
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
    if (idempotencyKey) {
      const cached = db.idempotencyKeys[idempotencyKey];
      if (cached) {
        return NextResponse.json(cached.body, { status: cached.status });
      }
    }

    const stream = db.streams[id];
    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    if (stream.status !== "active" && stream.status !== "paused") {
      return NextResponse.json(
        { error: `Cannot stop a stream in '${stream.status}' status` },
        { status: 409 },
      );
    }

    const updated = {
      ...stream,
      status: "ended" as const,
      updatedAt: new Date().toISOString(),
    };
    db.streams[id] = updated;

    const responseBody = { stream: updated };
    if (idempotencyKey) {
      db.idempotencyKeys[idempotencyKey] = { status: 200, body: responseBody };
    }

    return NextResponse.json(responseBody);
  });
}
