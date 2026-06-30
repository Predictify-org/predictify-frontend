/**
 * GET /api/orgs/[orgId]/audit
 *
 * Returns audit log entries scoped to a specific org.
 * Filters by orgId using the shared auditLogStore.
 *
 * Query params:
 *   limit  - max entries (default 50, max 250)
 *   cursor - pagination cursor
 *   action - filter by action type
 */

import { NextResponse } from "next/server";
import { orgDb } from "@/app/lib/org-db";
import { auditLogStore } from "@/app/lib/audit-log";
import type { AuditActorRole } from "@/app/types/audit";

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;

  if (!orgDb.orgs.has(orgId)) {
    return createErrorResponse("ORG_NOT_FOUND", `Org '${orgId}' not found`, 404);
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? "50");
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 50, 1), 250);
  const action = searchParams.get("action") ?? undefined;
  const role = searchParams.get("role") as AuditActorRole | null;

  const entries = auditLogStore.list({
    orgId,
    action: action ?? null,
    role: role ?? null,
    cursor: searchParams.get("cursor") ?? null,
    limit,
    format: null,
    startDate: null,
    endDate: null,
  });

  return NextResponse.json({
    orgId,
    entries,
    count: entries.length,
    chainIntact: auditLogStore.assertIntegrity(),
  });
}
