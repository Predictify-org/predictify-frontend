import { createHmac } from "crypto";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { ExportJob, getStore } from "@/app/lib/db";

const JWT_SECRET = process.env.JWT_SECRET ?? "streampay-dev-secret-do-not-use-in-prod";

function tryAuthenticateRequest(request: Request): { walletAddress: string } | null {
  const authHeader = request.headers.get?.("authorization") ?? null;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const verified = jwt.verify(authHeader.slice(7), JWT_SECRET, {
      algorithms: ["HS256"],
    }) as { sub?: string };
    return verified.sub ? { walletAddress: verified.sub } : null;
  } catch {
    return null;
  }
}

const EXPORT_RETENTION_DAYS = 7;
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
const EXPORT_PROCESS_DELAY_MS = 50;

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, request_id: "mock-request-id" } }, { status });
}

function createAuditRecord(exportId: string, type: "export.requested" | "export.downloaded" | "export.expired", details?: Record<string, unknown>) {
  getStore().exportRepository.audit.push({
    id: crypto.randomUUID(),
    exportId,
    type,
    timestamp: new Date().toISOString(),
    details,
  });
}

/** Creates an HMAC-SHA256 signed download URL scoped to this server. */
function createSignedUrl(jobId: string, expiresAt: string): string {
  const payload = `${jobId}:${expiresAt}`;
  const sig = createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
  const safeId = encodeURIComponent(jobId);
  return `/api/exports/${safeId}?download=true&expires=${encodeURIComponent(expiresAt)}&sig=${sig}`;
}

async function generateExportArtifact(jobId: string) {
  const { exportRepository, streamRepository } = getStore();
  const job = exportRepository.jobs.get(jobId);
  if (!job) return;

  // Count rows scoped to the job owner (no CSV buffering)
  const streamCount = Array.from(streamRepository.streams.values())
    .filter((s) => (s as { ownerId?: string }).ownerId === job.ownerId).length;

  const eventCount = Array.from(streamRepository.activity.values())
    .filter((e) => (e as { ownerId?: string }).ownerId === job.ownerId).length;

  const signedUrlExpiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();
  const signedUrl = createSignedUrl(jobId, signedUrlExpiresAt);

  exportRepository.jobs.set(jobId, {
    ...job,
    status: "ready",
    signedUrl,
    signedUrlExpiresAt,
    rows: streamCount + eventCount,
  });

  createAuditRecord(jobId, "export.requested", { rows: streamCount + eventCount });
}

function scheduleExportJob(jobId: string) {
  const { exportRepository } = getStore();
  if (exportRepository.processing.has(jobId)) return;

  const jobPromise = new Promise<void>((resolve) => {
    setTimeout(async () => {
      try {
        await generateExportArtifact(jobId);
      } catch {
        const failedJob = exportRepository.jobs.get(jobId);
        if (failedJob) exportRepository.jobs.set(jobId, { ...failedJob, status: "failed" });
      } finally {
        exportRepository.processing.delete(jobId);
        resolve();
      }
    }, EXPORT_PROCESS_DELAY_MS);
  });

  exportRepository.processing.set(jobId, jobPromise);
}

export async function POST(request: Request) {
  const { exportRepository } = getStore();
  const actor = tryAuthenticateRequest(request);
  if (!actor) {
    return createErrorResponse("UNAUTHORIZED", "Missing or invalid authorization header", 401);
  }

  const id = crypto.randomUUID();
  const requestedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const job: ExportJob = {
    id,
    ownerId: actor.walletAddress,
    requestedAt,
    status: "pending",
    expiresAt,
    fileName: `streampay-export-${requestedAt.slice(0, 10)}.ndjson`,
    rows: 0,
  };

  exportRepository.jobs.set(id, job);
  createAuditRecord(id, "export.requested", { requestedAt, retentionDays: EXPORT_RETENTION_DAYS });
  scheduleExportJob(id);

  return NextResponse.json({ data: job, links: { self: `/api/exports/${id}` } }, { status: 201 });
}
