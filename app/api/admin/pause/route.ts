/**
 * POST /api/admin/pause
 *
 * Toggle the global pause circuit breaker.
 * Gated by admin.require_auth() — only the admin address may call this.
 *
 * Request body: { "paused": true | false }
 *
 * When paused=true:
 *   - create_stream → 503 ContractPaused
 *   - withdraw      → 503 ContractPaused
 *   - cancel/settle/read ops remain allowed
 *
 * GET /api/admin/pause — returns current pause state (public view / is_paused()).
 */

import { NextResponse } from "next/server";
import { setPaused, getAdminState } from "@/app/lib/admin-guard";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";
import { getCorrelationContext } from "@/app/lib/logger";

function errorResponse(code: string, message: string, status: number) {
  const ctx = getCorrelationContext();
  return NextResponse.json(
    { error: { code, message, request_id: ctx?.request_id } },
    { status },
  );
}

/** GET — public is_paused() view. */
export async function GET() {
  const state = getAdminState();
  return NextResponse.json({
    data: {
      paused:   state.paused,
      pausedAt: state.pausedAt,
    },
  });
}

/** POST — set_paused(paused: bool), admin only. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }

  const { paused } = body as Record<string, unknown>;
  if (typeof paused !== "boolean") {
    return errorResponse("VALIDATION_ERROR", "Body must contain { paused: boolean }", 422);
  }

  const result = setPaused(request, paused);
  if (result instanceof NextResponse) return result;

  // Audit log — privileged admin operation.
  recordPrivilegedStreamAuditEvent({
    action:   paused ? "admin.pause.activate" : "admin.pause.lift",
    before:   { paused: !paused },
    after:    { paused },
    metadata: { pausedAt: result.pausedAt },
    request,
    streamId: "global",
  });

  return NextResponse.json({
    data: {
      paused:   result.paused,
      pausedAt: result.pausedAt,
    },
  });
}
