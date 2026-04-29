import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, request_id: "mock-request-id" } }, { status });
}

function createAuditRecord(exportId: string, type: "export.requested" | "export.downloaded" | "export.expired", details?: Record<string, unknown>) {
  db.exportAudit.push({
    id: crypto.randomUUID(),
    exportId,
    type,
    timestamp: new Date().toISOString(),
    details,
  });
}

function parseBoolean(value: string | null): boolean {
  return value === "true" || value === "1";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = db.exportJobs.get(id);
  if (!job) {
    return createErrorResponse("EXPORT_NOT_FOUND", `Export job '${id}' not found.`, 404);
  }

  const now = new Date();
  if (now > new Date(job.expiresAt)) {
    db.exportJobs.set(id, { ...job, status: "expired" });
    createAuditRecord(id, "export.expired", { expiresAt: job.expiresAt });
    return createErrorResponse("EXPORT_EXPIRED", "This export has expired and is no longer available.", 410);
  }

  const url = new URL(request.url);
  const isDownload = parseBoolean(url.searchParams.get("download"));

  if (isDownload) {
    if (job.status !== "ready" || !job.signedUrl) {
      return createErrorResponse("EXPORT_NOT_READY", "Export is not yet ready for download.", 409);
    }

    if (!job.signedUrlExpiresAt || now > new Date(job.signedUrlExpiresAt)) {
      db.exportJobs.set(id, { ...job, status: "expired" });
      createAuditRecord(id, "export.expired", { signedUrlExpiresAt: job.signedUrlExpiresAt });
      return createErrorResponse("EXPORT_URL_EXPIRED", "Signed URL has expired.", 410);
    }

    createAuditRecord(id, "export.downloaded", { signedUrl: job.signedUrl, requestedAt: now.toISOString() });
    return NextResponse.json({ data: { ...job, signedUrl: job.signedUrl }, links: { self: `/api/exports/${id}?download=true` } });
  }

  return NextResponse.json({ data: job, links: { self: `/api/exports/${id}` } });
}
