/**
 * POST /api/streams/[id]/pause
 *
 * Transitions an active stream to "paused".
 *
 * ## Concurrency fix
 * The entire read-modify-write is wrapped in withLock(id, ...) — matching the
 * pattern used by settle, start, and stop — so that concurrent pause/start/stop
 * requests on the same stream are serialised and cannot interleave.
 *
 * ## Idempotency
 * The Idempotency-Key check is performed *inside* the lock so that two
 * concurrent requests carrying the same key cannot both pass the check and
 * double-apply the transition.
 *
 * ## Org-policy approval
 * If the stream has requiresApprovalToPause set, the handler returns 202 and
 * marks pendingApproval instead of immediately transitioning. A subsequent
 * approved request (without the flag) completes the transition.
 */

import { NextRequest, NextResponse } from "next/server";
import { db, withLock } from "@/app/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const idempotencyKey = req.headers.get("Idempotency-Key");

  // All reads and writes happen inside the lock — no state is touched outside.
  return withLock(id, async () => {
    // ── Idempotency check (inside lock) ──────────────────────────────────────
    // Must be re-evaluated after acquiring the lock. If we checked before the
    // lock, two concurrent requests with the same key could both see "no record"
    // and both proceed to mutate state.
    if (idempotencyKey) {
      const cached = db.idempotencyKeys[idempotencyKey];
      if (cached) {
        return NextResponse.json(cached.body, { status: cached.status });
      }
    }

    // ── Stream existence ──────────────────────────────────────────────────────
    const stream = db.streams[id];
    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    // ── Active → paused transition guard ─────────────────────────────────────
    // Only active streams may be paused. Any other status is a client error.
    if (stream.status !== "active") {
      const body = { error: `Cannot pause a stream in '${stream.status}' status` };
      if (idempotencyKey) {
        db.idempotencyKeys[idempotencyKey] = { status: 409, body };
      }
      return NextResponse.json(body, { status: 409 });
    }

    // ── Org-policy approval flow ──────────────────────────────────────────────
    // If the stream requires org approval before pausing, record the intent and
    // return 202 Accepted. The stream stays active until approval arrives.
    if (stream.requiresApprovalToPause && !stream.pendingApproval) {
      const pending = {
        ...stream,
        pendingApproval: true,
        updatedAt: new Date().toISOString(),
      };
      db.streams[id] = pending;

      const responseBody = { stream: pending, approvalRequired: true };
      if (idempotencyKey) {
        db.idempotencyKeys[idempotencyKey] = { status: 202, body: responseBody };
      }
      return NextResponse.json(responseBody, { status: 202 });
    }

    // ── Apply transition ──────────────────────────────────────────────────────
    const updated = {
      ...stream,
      status: "paused" as const,
      pendingApproval: false,
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
