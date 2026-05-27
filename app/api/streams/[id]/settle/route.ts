/**
 * POST /api/streams/[id]/settle
 *
 * Transitions an active or paused stream to "ended" and records the final
 * balance. Idempotent: repeated requests with the same Idempotency-Key
 * return the cached response without re-applying the transition.
 *
 * Concurrency: the entire read-modify-write is wrapped in withLock(id) so
 * that concurrent settle/pause/start/stop requests on the same stream are
 * serialised.
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
    // Re-check idempotency inside the lock so two concurrent requests with
    // the same key cannot both pass the check and double-apply.
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
        { error: `Cannot settle a stream in '${stream.status}' status` },
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
