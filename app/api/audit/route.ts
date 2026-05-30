import { NextResponse } from "next/server";
import { requireAuditLogAccess } from "@/app/lib/auth";
import { AUDIT_LOG_RETENTION_DAYS, auditLogStore } from "@/app/lib/audit-log";
import type { AuditActorRole, AuditListFilters } from "@/app/types/audit";

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, request_id: "mock-request-id" } }, { status });
}

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "50", 10);
  if (!Number.isFinite(parsed)) {
    return 50;
  }
  return Math.min(Math.max(parsed, 1), 250);
}

function buildFilters(request: Request): AuditListFilters {
  const { searchParams } = new URL(request.url);
  return {
    action: searchParams.get("action"),
    actorId: searchParams.get("actorId"),
    limit: parseLimit(searchParams.get("limit")),
    q: searchParams.get("q"),
    requestId: searchParams.get("requestId"),
    role: searchParams.get("role") as AuditActorRole | null,
    targetId: searchParams.get("targetId"),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const exportFormat = searchParams.get("export");
  const actor = requireAuditLogAccess(request, exportFormat === "ndjson" ? "export" : "read");

  if (actor instanceof NextResponse) {
    return actor;
  }

  const filters = buildFilters(request);
  if (exportFormat && exportFormat !== "ndjson") {
    return createErrorResponse("INVALID_EXPORT_FORMAT", "Only export=ndjson is supported", 422);
  }

  if (exportFormat === "ndjson") {
    const rows = auditLogStore.exportRows(filters);
    const body = rows.map((row) => JSON.stringify(row)).join("\n");
    return new Response(body, {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "x-audit-chain-intact": String(auditLogStore.assertIntegrity()),
        "x-audit-retention-days": String(AUDIT_LOG_RETENTION_DAYS),
      },
      status: 200,
    });
  }

  const entries = auditLogStore.list(filters);
  return NextResponse.json({
    access: {
      actorId: actor.actorId,
      role: actor.role,
    },
    data: entries,
    links: {
      self: "/api/audit",
    },
    meta: {
      chainIntact: auditLogStore.assertIntegrity(),
      retentionDays: AUDIT_LOG_RETENTION_DAYS,
      total: entries.length,
    },
  });
}

export async function POST() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "Audit log is append-only and cannot be created via API", 405);
}

export async function PUT() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "Audit log is append-only and cannot be updated", 405);
}

export async function PATCH() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "Audit log is append-only and cannot be updated", 405);
}

export async function DELETE() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "Audit log is append-only and cannot be deleted", 405);
}
