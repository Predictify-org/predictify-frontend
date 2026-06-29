/**
 * GET /api/audit/export
 *
 * Streams the audit log as NDJSON (Newline Delimited JSON).
 * Each line is a JSON-serialised AuditExportRow.
 *
 * Access: admin and compliance roles only (same as the export gate on
 * the main /api/audit route).
 *
 * Query parameters (all optional):
 *   action    – filter by audit action (e.g. "stream.settle")
 *   actorId   – filter by actor ID
 *   targetId  – filter by target ID
 *   requestId – filter by originating request ID
 *   role      – filter by actor role
 *   q         – free-text search across serialised entry
 *   limit     – max rows to stream (1–250, default 250)
 */

import { requireAuditLogAccess } from "@/app/lib/auth";
import { AUDIT_LOG_RETENTION_DAYS, auditLogStore } from "@/app/lib/audit-log";
import type { AuditActorRole, AuditListFilters } from "@/app/types/audit";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message, request_id: randomUUID() } },
    { status },
  );
}

function parseLimit(value: string | null, defaultValue = 250): number {
  const parsed = Number.parseInt(value ?? String(defaultValue), 10);
  if (!Number.isFinite(parsed)) return defaultValue;
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

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  // Require export-level access (admin / compliance).
  const actor = requireAuditLogAccess(request, "export");
  if (actor instanceof NextResponse) {
    return actor;
  }

  const filters = buildFilters(request);

  // Build the NDJSON body by iterating the export rows lazily.
  const rows = auditLogStore.exportRows(filters);
  const chainIntact = auditLogStore.assertIntegrity();

  // Stream the rows as NDJSON via a ReadableStream so that large exports do
  // not need to be buffered entirely in memory before the first byte is sent.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const row of rows) {
        controller.enqueue(encoder.encode(JSON.stringify(row) + "\n"));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      // Clients can verify tamper-evident chain integrity from this header.
      "x-audit-chain-intact": String(chainIntact),
      "x-audit-retention-days": String(AUDIT_LOG_RETENTION_DAYS),
      // Prevent proxies from buffering the stream.
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
    },
    status: 200,
  });
}

// Mutations are never allowed on the audit log.
export async function POST() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "Audit log is read-only", 405);
}

export async function PUT() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "Audit log is read-only", 405);
}

export async function PATCH() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "Audit log is read-only", 405);
}

export async function DELETE() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "Audit log is read-only", 405);
}
