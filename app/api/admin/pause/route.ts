/**
 * POST /api/admin/pause
 *
 * Toggle the global pause circuit breaker.
 * Gated by admin auth — only the admin address may call this.
 *
 * Body: { "paused": true | false }
 *
 * When paused=true:  create_stream and withdraw are blocked (503 ContractPaused).
 * When paused=false: circuit breaker lifted, normal operations resume.
 *
 * cancel_stream and settle remain allowed during pause so recipients
 * can always recover vested funds.
 */

import { NextResponse } from "next/server";
import { setPaused, getAdminState } from "@/app/lib/admin-guard";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return err("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }

  const { paused } = body as Record<string, unknown>;
  if (typeof paused !== "boolean") {
    return err("VALIDATION_ERROR", "Body must contain { paused: boolean }", 422);
  }

  const result = setPaused(request, paused);
  if (result instanceof NextResponse) return result;

  recordPrivilegedStreamAuditEvent({
    action: paused ? "admin.pause.activate" : "admin.pause.lift",
    before: { paused: !paused },
    after:  { paused },
    metadata: { pausedAt: result.pausedAt },
    request,
    streamId: "global",
    targetAccount: result.adminAddress,
  });

  return NextResponse.json({ data: result });
}

export async function GET() {
  return NextResponse.json({ data: getAdminState() });
}
