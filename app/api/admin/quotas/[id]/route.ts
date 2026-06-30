/**
 * GET    /api/admin/quotas/:id  — read one quota (admin only)
 * PUT    /api/admin/quotas/:id  — fully replace a quota (admin only)
 * DELETE /api/admin/quotas/:id  — remove a quota (admin only)
 *
 * Body (PUT):
 *   {
 *     "scope":                   "org" | "user",
 *     "subject":                 "G...",
 *     "maxActiveStreams":         number,   // optional, 0 = unlimited
 *     "maxMonthlyVolumeStroops": number    // optional, 0 = unlimited
 *   }
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-guard";
import { getQuota, replaceQuota, deleteQuota, QuotaInput } from "@/app/lib/quotas";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";

const VALID_SCOPES = new Set(["org", "user"]);

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await context.params;
  const quota = getQuota(id);
  if (!quota) return err("NOT_FOUND", `Quota '${id}' not found`, 404);

  return NextResponse.json({ data: quota });
}

export async function PUT(request: Request, context: RouteContext) {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }

  const { scope, subject, maxActiveStreams, maxMonthlyVolumeStroops } =
    body as Record<string, unknown>;

  if (!VALID_SCOPES.has(scope as string)) {
    return err(
      "VALIDATION_ERROR",
      'Body must contain { scope: "org" | "user" }',
      422,
    );
  }
  if (typeof subject !== "string" || !subject.trim()) {
    return err(
      "VALIDATION_ERROR",
      "Body must contain { subject: string }",
      422,
    );
  }
  if (maxActiveStreams !== undefined && (typeof maxActiveStreams !== "number" || maxActiveStreams < 0)) {
    return err(
      "VALIDATION_ERROR",
      "maxActiveStreams must be a non-negative number",
      422,
    );
  }
  if (
    maxMonthlyVolumeStroops !== undefined &&
    (typeof maxMonthlyVolumeStroops !== "number" || maxMonthlyVolumeStroops < 0)
  ) {
    return err(
      "VALIDATION_ERROR",
      "maxMonthlyVolumeStroops must be a non-negative number",
      422,
    );
  }

  const input: QuotaInput = {
    scope: scope as "org" | "user",
    subject: subject as string,
    maxActiveStreams:         maxActiveStreams as number | undefined,
    maxMonthlyVolumeStroops: maxMonthlyVolumeStroops as number | undefined,
  };

  const updated = replaceQuota(id, input);
  if (!updated) return err("NOT_FOUND", `Quota '${id}' not found`, 404);

  recordPrivilegedStreamAuditEvent({
    action: "admin.quota.update",
    before: {},
    after:  { quotaId: updated.id, scope: updated.scope, subject: updated.subject },
    metadata: { updatedAt: updated.updatedAt },
    request,
    streamId: "global",
    targetAccount: updated.subject,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(request: Request, context: RouteContext) {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await context.params;
  const existed = deleteQuota(id);
  if (!existed) return err("NOT_FOUND", `Quota '${id}' not found`, 404);

  recordPrivilegedStreamAuditEvent({
    action: "admin.quota.delete",
    before: { quotaId: id },
    after:  {},
    metadata: { deletedAt: new Date().toISOString() },
    request,
    streamId: "global",
    targetAccount: id,
  });

  return new Response(null, { status: 204 });
}
