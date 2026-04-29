import { NextResponse } from "next/server";
import { db, ExportJob, ExportJobStatus } from "@/app/lib/db";

const EXPORT_RETENTION_DAYS = 7;
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
const EXPORT_PROCESS_DELAY_MS = 50;

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

function escapeCsvField(value: string | undefined): string {
  const safe = String(value ?? "").replace(/"/g, '""');
  return `"${safe}"`;
}

function createSignedUrl(jobId: string, expiresAt: string) {
  const token = Buffer.from(`${jobId}:${expiresAt}`).toString("base64url");
  const safeId = encodeURIComponent(jobId);
  return `https://streampay-exports.example.com/exports/${safeId}.csv?token=${encodeURIComponent(token)}&expires=${encodeURIComponent(expiresAt)}`;
}

async function generateExportArtifact(jobId: string) {
  const job = db.exportJobs.get(jobId);
  if (!job) {
    return;
  }

  const streamRows: string[] = [];
  const eventRows: string[] = [];
  const streams = Array.from(db.streams.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const events = Array.from(db.activity.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  for (const stream of streams) {
    streamRows.push([
      "stream",
      stream.id,
      stream.recipient,
      stream.rate,
      stream.schedule,
      stream.status,
      "",
      "",
      "",
    ]
      .map(escapeCsvField)
      .join(","));
  }

  for (const event of events) {
    eventRows.push([
      "activity",
      event.streamId ?? "",
      "",
      "",
      "",
      "",
      event.type,
      event.timestamp,
      event.description,
    ]
      .map(escapeCsvField)
      .join(","));
  }

  const allRows = [
    "record_type,stream_id,recipient,rate,schedule,status,event_type,event_timestamp,description",
    ...streamRows,
    ...eventRows,
  ];

  const signedUrlExpiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();
  const signedUrl = createSignedUrl(jobId, signedUrlExpiresAt);

  db.exportJobs.set(jobId, {
    ...job,
    status: "ready",
    signedUrl,
    signedUrlExpiresAt,
    rows: Math.max(0, allRows.length - 1),
  });

  // This example uses an external signed URL placeholder. In production, the CSV would be uploaded to S3 and retained for a short lifecycle.
  createAuditRecord(jobId, "export.requested", { rows: allRows.length - 1, url: signedUrl });
}

function scheduleExportJob(jobId: string) {
  if (db.exportProcessing.has(jobId)) {
    return;
  }

  const jobPromise = new Promise<void>((resolve) => {
    setTimeout(async () => {
      try {
        await generateExportArtifact(jobId);
      } catch {
        const job = db.exportJobs.get(jobId);
        if (job) {
          db.exportJobs.set(jobId, { ...job, status: "failed" });
        }
      } finally {
        db.exportProcessing.delete(jobId);
        resolve();
      }
    }, EXPORT_PROCESS_DELAY_MS);
  });

  db.exportProcessing.set(jobId, jobPromise);
}

export async function POST() {
  const id = crypto.randomUUID();
  const requestedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const job: ExportJob = {
    id,
    requestedAt,
    status: "pending",
    expiresAt,
    fileName: `streampay-export-${requestedAt.slice(0, 10)}.csv`,
    rows: 0,
  };

  db.exportJobs.set(id, job);
  createAuditRecord(id, "export.requested", { requestedAt, retentionDays: EXPORT_RETENTION_DAYS });
  scheduleExportJob(id);

  return NextResponse.json({ data: job, links: { self: `/api/exports/${id}` } }, { status: 201 });
}
