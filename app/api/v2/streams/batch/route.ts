import { NextRequest, NextResponse } from "next/server";
import { errorResponse, ErrorCode } from "@/app/lib/errors";
import { getStore, withLock } from "@/app/lib/db";
import { toV2Stream, dbStreamToV1 } from "@/app/lib/api-version";
import type { Stream } from "@/app/types/openapi";

interface BatchUpdateRequest {
  updates: Array<{
    id: string;
    data: Partial<Stream>;
  }>;
}

/**
 * POST /api/v2/streams/batch
 * 
 * Batch update up to 100 streams in a single transaction.
 * Requires: Authorization: Bearer <token>
 * 
 * Body: { "updates": [ { "id": "stream-1", "data": { "status": "paused" } } ] }
 * Response: { "streams": StreamV2[] } (200)
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return errorResponse(ErrorCode.UNAUTHORIZED, "Bearer token required.", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(ErrorCode.BAD_REQUEST, "Request body must be valid JSON.", 400);
  }

  if (!body || typeof body !== "object" || !Array.isArray((body as any).updates)) {
    return errorResponse(ErrorCode.BAD_REQUEST, "Invalid request format. Expected { updates: [] }.", 400);
  }

  const { updates } = body as BatchUpdateRequest;

  if (updates.length === 0) {
    return NextResponse.json({ streams: [] }, { status: 200 });
  }

  if (updates.length > 100) {
    return errorResponse(ErrorCode.BAD_REQUEST, "Batch limit exceeded. Max 100 items allowed.", 400);
  }

  // Basic structural validation for each update item
  for (let i = 0; i < updates.length; i++) {
    const item = updates[i];
    if (!item.id || typeof item.id !== "string") {
      return errorResponse(ErrorCode.BAD_REQUEST, `Invalid update item at index ${i}. Missing 'id'.`, 400);
    }
    if (!item.data || typeof item.data !== "object") {
      return errorResponse(ErrorCode.BAD_REQUEST, `Invalid update item at index ${i}. Missing 'data'.`, 400);
    }
  }

  // Sort unique IDs to prevent deadlocks when acquiring locks sequentially
  const uniqueIds = Array.from(new Set(updates.map((u) => u.id))).sort();

  // Helper to recursively acquire locks
  async function acquireLocksAndExecute(index: number, action: () => Promise<NextResponse>): Promise<NextResponse> {
    if (index >= uniqueIds.length) {
      return action();
    }
    return withLock(uniqueIds[index], () => acquireLocksAndExecute(index + 1, action));
  }

  return acquireLocksAndExecute(0, async () => {
    const { streamRepository } = getStore();
    const errors: Array<{ index: number; id: string; code: string; message: string }> = [];

    // Validation phase (Dry run)
    for (let i = 0; i < updates.length; i++) {
      const { id } = updates[i];
      const stream = streamRepository.streams.get(id);

      if (!stream) {
        errors.push({
          index: i,
          id,
          code: ErrorCode.STREAM_NOT_FOUND,
          message: `Stream '${id}' not found.`,
        });
      }
    }

    // All-or-nothing: if any error is found, roll back (apply no changes) and return 422
    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "One or more stream updates failed validation. No changes were applied.",
            details: errors,
            request_id: req.headers.get("x-request-id") || "unknown",
          },
        },
        { status: 422 }
      );
    }

    // Execution phase
    const updatedStreams = [];
    for (const updateReq of updates) {
      const { id, data } = updateReq;
      const existing = streamRepository.streams.get(id)!;
      const updatedStream = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      
      streamRepository.streams.set(id, updatedStream);
      updatedStreams.push(toV2Stream(dbStreamToV1(updatedStream as Stream)));
    }

    return NextResponse.json({ streams: updatedStreams }, { status: 200 });
  });
}
