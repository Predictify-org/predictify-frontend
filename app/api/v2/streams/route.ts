import { NextRequest, NextResponse } from "next/server";
import { errorResponse, ErrorCode } from "@/app/lib/errors";
import { toV2Stream, type StreamV1 } from "@/app/lib/api-version";
import { validateCreateStreamBody } from "@/app/lib/stream-validation";

const IDEMPOTENCY_TTL_MS = 86_400_000; // 24 hours

interface IdempotencyEntry {
  body: string;
  response: unknown;
  expiresAt: number;
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** GET /api/v2/streams — paginated stream list in v2 shape. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

  let streams = Array.from(db.streams.values()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  if (status) streams = streams.filter((s) => s.status === status);

  if (cursor) {
    const cursorId = decodeCursor(cursor);
    const idx = streams.findIndex((s) => s.id === cursorId);
    if (idx >= 0) streams = streams.slice(idx + 1);
  }

  try {
    // TODO: fetch from data layer using token identity
    const v1Streams: StreamV1[] = [];
    const streams = v1Streams.map(toV2Stream);

    return NextResponse.json({ streams }, { status: 200 });
  } catch {
    return errorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      "Failed to retrieve streams.",
      500,
    );
  }
}

/**
 * POST /api/v2/streams
 *
 * Creates a new payment stream.
 * Requires: Authorization: Bearer <token>
 *
 * Breaking changes vs v1:
 *   - Response body uses `allowed_actions`, `created_at`, `updated_at`
 *     instead of `nextAction`, `createdAt`, `updatedAt`.
 *   - `settlement` is always present (null when not yet settled).
 *
 * Idempotency:
 *   - Supports Idempotency-Key header for safe retries.
 *   - Same key + identical body returns the cached 201 response.
 *   - Same key + different body returns 409 Conflict.
 *   - Entries expire after 24 hours (IDEMPOTENCY_TTL_MS).
 */
export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("Idempotency-Key");
  const token = idempotencyKey
    ? idempotencyToken("v2.streams.create", idempotencyKey)
    : null;

  let body: Record<string, unknown>;
  let bodyText: string;
  try {
    bodyText = await request.text();
    body = JSON.parse(bodyText);
  } catch {
    return errorResponse("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }

  if (token) {
    const existing = db.idempotency.get(token) as IdempotencyEntry | undefined;
    if (existing) {
      if (Date.now() > existing.expiresAt) {
        db.idempotency.delete(token);
      } else if (existing.body === bodyText) {
        return NextResponse.json(existing.response, { status: 201 });
      } else {
        return errorResponse(
          "IDEMPOTENCY_CONFLICT",
          "Idempotency key already used for a different request body.",
          409,
        );
      }
    }
  }

  const { recipient, rate, schedule } = body as {
    recipient?: string;
    rate?: string;
    schedule?: string;
  };

  if (!recipient || !rate || !schedule) {
    return errorResponse(
      ErrorCode.STREAM_CREATE_FAILED,
      "Failed to create stream.",
      500,
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

  if (token) {
    db.idempotency.set(token, {
      body: bodyText,
      response: payload,
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    });
  }

  return NextResponse.json(payload, { status: 201 });
}
