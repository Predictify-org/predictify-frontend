/**
 * POST /api/admin/upgrade
 *
 * Manage the two-step upgrade timelock system:
 *  - action: "schedule" | "cancel" | "execute"
 *
 * Body:
 *   - schedule: { action: "schedule", data: string }
 *   - cancel: { action: "cancel" }
 *   - execute: { action: "execute" }
 *
 * All actions require admin authentication.
 */

import { NextResponse } from "next/server";
import {
  scheduleUpgrade,
  cancelUpgrade,
  executeUpgrade,
  getAdminState,
} from "@/app/lib/admin-guard";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return err("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }

  const { action, data } = body as Record<string, unknown>;

  if (typeof action !== "string") {
    return err("VALIDATION_ERROR", "Body must contain { action: 'schedule' | 'cancel' | 'execute' }", 422);
  }

  let result;
  let auditAction: string;

  switch (action) {
    case "schedule":
      if (typeof data !== "string") {
        return err("VALIDATION_ERROR", "Schedule action requires { data: string }", 422);
      }
      result = scheduleUpgrade(request, data);
      auditAction = "admin.upgrade.schedule";
      break;

    case "cancel":
      result = cancelUpgrade(request);
      auditAction = "admin.upgrade.cancel";
      break;

    case "execute":
      result = executeUpgrade(request);
      auditAction = "admin.upgrade.execute";
      break;

    default:
      return err("VALIDATION_ERROR", `Unknown action '${action}'. Must be 'schedule', 'cancel', or 'execute'.", 422);
  }

  if (result instanceof NextResponse) return result;

  recordPrivilegedStreamAuditEvent({
    action: auditAction,
    before: getAdminState(),
    after: result,
    metadata: { action },
    request,
    streamId: "global",
    targetAccount: result.adminAddress,
  });

  return NextResponse.json({ data: result });
}

export async function GET() {
  return NextResponse.json({ data: getAdminState() });
}
