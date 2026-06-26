/**
 * API route for managing a single stream:
 *
 * - `GET /api/v2/streams/[id]`
 * - `PATCH /api/v2/streams/[id]`
 *
 * This file implements the PATCH handler with strict Zod validation
 * for partial updates.
 */

import { NextResponse } from "next/server";
import { getStore } from "@/app/lib/db";
import { errorResponse } from "@/app/lib/errors";
import { Stream } from "@/app/types/openapi";
import { validatePatchStreamBody } from "@/app/lib/stream-validation";

/**
 * Fetches a stream by ID or returns a 404 error response.
 * This helper reduces code duplication between GET and PATCH handlers.
 */
function findStreamOrError(id: string): { stream: Stream } | NextResponse {
  const { streams } = getStore();
  const stream = streams.get(id);

  if (!stream) {
    return errorResponse("NOT_FOUND", "Stream not found.", 404);
  }
  return { stream };
}

/**
 * GET a single stream by its ID.
 * (Mock implementation for route structure)
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const result = findStreamOrError(params.id);
  if (result instanceof NextResponse) return result;

  return NextResponse.json({ data: result.stream });
}

/**
 * PATCH a stream to apply partial updates.
 *
 * Validates the request body against a strict Zod schema, allowing only
 * `description`, `webhook_url`, and `tags` to be updated.
 *
 * Returns 400 for invalid JSON or if unknown fields are present.
 * Returns 422 if validation fails for known fields.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const result = findStreamOrError(params.id);
  if (result instanceof NextResponse) return result;
  const { stream } = result;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST", "Request body must be valid JSON.", 400);
  }

  const errors = validatePatchStreamBody(body);
  if (errors.length > 0) {
    // If the error is due to unrecognized keys, return a 400 as per spec.
    const isStrictnessError = errors.some(e => e.code === 'UNRECOGNIZED_KEYS');
    const status = isStrictnessError ? 400 : 422;
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid fields provided.", details: errors } }, { status });
  }

  const updatedStream = { ...stream, ...(body as Partial<Stream>), updatedAt: new Date().toISOString() };
  getStore().streams.set(params.id, updatedStream);

  return NextResponse.json({ data: updatedStream });
}