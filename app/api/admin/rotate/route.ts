/**
 * POST /api/admin/rotate
 *
 * Rotate the admin address. Requires current admin auth.
 * The new admin address must be non-empty — admin can never be zeroed.
 *
 * Body: { "newAdmin": "G..." }
 */

import { NextResponse } from "next/server";
import { setAdmin } from "@/app/lib/admin-guard";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return err("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }

  const { newAdmin } = body as Record<string, unknown>;
  if (typeof newAdmin !== "string" || !newAdmin.trim()) {
    return err("VALIDATION_ERROR", "Body must contain { newAdmin: string }", 422);
  }

  const result = setAdmin(request, newAdmin);
  if (result instanceof NextResponse) return result;

  recordPrivilegedStreamAuditEvent({
    action: "admin.rotate",
    before: {},
    after:  { adminAddress: result.adminAddress },
    metadata: { rotatedAt: result.adminRotatedAt },
    request,
    streamId: "global",
    targetAccount: result.adminAddress,
  });

  return NextResponse.json({ data: result });
}
