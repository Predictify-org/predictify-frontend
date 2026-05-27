import { NextResponse } from "next/server";
import { db, encodeCursor, decodeCursor, idempotencyToken } from "@/app/lib/db";
import { toV2Stream } from "@/app/lib/api-version";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** GET /api/v2/streams — paginated stream list in v2 shape. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

  let streams = Array.from(db.streams.values()).sort((a, b) => {
    const timeCompare = a.createdAt.localeCompare(b.createdAt);
    return timeCompare !== 0 ? timeCompare : a.id.localeCompare(b.id);
  });

  if (status) streams = streams.filter((s) => s.status === status);

  if (cursor) {
    let cursorId: string;
    try {
      cursorId = decodeCursor(cursor);
    } catch {
      return errorResponse("INVALID_CURSOR", "Malformed cursor", 422);
    }
    const idx = streams.findIndex((s) => s.id === cursorId);
    if (idx >= 0) streams = streams.slice(idx + 1);
  }

  const page = streams.slice(0, limit);
  const hasNext = streams.length > limit;
  const nextCursor =
    hasNext && page.length > 0
      ? encodeCursor(page[page.length - 1].id)
      : null;

  return NextResponse.json({
    data: page.map(toV2Stream),
    meta: { hasNext, nextCursor, total: streams.length },
    links: { self: `/api/v2/streams?limit=${limit}` },
  });
}

/**
 * POST /api/v2/streams — create a stream, respond with v2 shape.
 *
 * Breaking changes vs v1:
 *   - Response body uses `allowed_actions`, `created_at`, `updated_at`
 *     instead of `nextAction`, `createdAt`, `updatedAt`.
 *   - `settlement` is always present (null when not yet settled).
 */
export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("Idempotency-Key");
  const token = idempotencyKey
    ? idempotencyToken("v2.streams.create", idempotencyKey)
    : null;

  if (token && db.idempotency.has(token)) {
    return NextResponse.json(db.idempotency.get(token), { status: 201 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }

  const { recipient, rate, schedule } = body as {
    recipient?: string;
    rate?: string;
    schedule?: string;
  };

  if (!recipient || !rate || !schedule) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Missing required fields: recipient, rate, schedule",
      422,
    );
  }

  const id = `stream-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const newStream = {
    id,
    recipient: String(recipient),
    rate: String(rate),
    schedule: String(schedule),
    status: "draft" as const,
    nextAction: "start" as const,
    createdAt: now,
    updatedAt: now,
  };

  db.streams.set(id, newStream);

  const payload = {
    data: toV2Stream(newStream),
    links: { self: `/api/v2/streams/${id}` },
  };

  if (token) db.idempotency.set(token, payload);

  return NextResponse.json(payload, { status: 201 });
}
