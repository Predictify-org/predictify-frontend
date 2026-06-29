/**
 * GET  /api/admin/quotas  — list all org/user quotas (admin only)
 * POST /api/admin/quotas  — create / upsert a quota (admin only)
 *
 * Body (POST):
 *   {
 *     "scope":                   "org" | "user",
 *     "subject":                 "G...",
 *     "maxActiveStreams":         number,   // optional, 0 = unlimited
 *     "maxMonthlyVolumeStroops": number    // optional, 0 = unlimited
 *   }
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-guard";
import { listQuotas, upsertQuota, QuotaInput } from "@/app/lib/quotas";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";

const VALID_SCOPES = new Set(["org", "user"]);

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  return NextResponse.json({ data: listQuotas() });
}

export async function POST(request: Request) {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

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

  const quota = upsertQuota(input);

  recordPrivilegedStreamAuditEvent({
    action: "admin.quota.upsert",
    before: {},
    after:  { quotaId: quota.id, scope: quota.scope, subject: quota.subject },
    metadata: { createdAt: quota.createdAt },
    request,
    streamId: "global",
    targetAccount: quota.subject,
  });

  return NextResponse.json({ data: quota }, { status: 201 });
}
