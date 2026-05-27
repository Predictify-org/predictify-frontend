/**
 * POST /api/admin/rotate
 *
 * Rotate the admin address.
 * Gated by the current admin's auth — only the current admin may rotate.
 * The new admin address must be non-empty (admin can never be zeroed).
 *
 * Request body: { "newAdmin": "G..." }
 *
 * Mirrors set_admin(env, new_admin: Address) in the Soroban contract.
 */

import { NextResponse } from "next/server";
import { setAdmin, getAdminState } from "@/app/lib/admin-guard";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";
import { getCorrelationContext } from "@/app/lib/logger";

function errorResponse(code: string, message: string, status: number) {
  const ctx = getCorrelationContext();
  return NextResponse.json(
    { error: { code, message, request_id: ctx?.request_id } },
    { status },
  );
}

/** GET — returns current admin address (for observability). */
export async function GET() {
  const state = getAdminState();
  return NextResponse.json({
    data: {
      adminAddress:   state.adminAddress,
      adminRotatedAt: state.adminRotatedAt,
    },
  });
}

/** POST — set_admin(new_admin), current admin only. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }

  const { newAdmin } = body as Record<string, unknown>;
  if (typeof newAdmin !== "string" || !newAdmin.trim()) {
    return errorResponse("VALIDATION_ERROR", "Body must contain { newAdmin: string }", 422);
  }

  const prevAdmin = getAdminState().adminAddress;
  const result    = setAdmin(request, newAdmin);
  if (result instanceof NextResponse) return result;

  // Audit log — privileged admin rotation.
  recordPrivilegedStreamAuditEvent({
    action:   "admin.rotate",
    before:   { adminAddress: prevAdmin },
    after:    { adminAddress: result.adminAddress },
    metadata: { adminRotatedAt: result.adminRotatedAt },
    request,
    streamId: "global",
  });

  return NextResponse.json({
    data: {
      adminAddress:   result.adminAddress,
      adminRotatedAt: result.adminRotatedAt,
    },
  });
}
