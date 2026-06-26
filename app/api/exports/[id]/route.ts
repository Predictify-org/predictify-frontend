import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { tryAuthenticateRequest, JWT_SECRET } from "@/app/lib/auth";
import { getStore } from "@/app/lib/db";

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

/** Verifies the HMAC-SHA256 signature on a download URL. */
function verifySignedUrl(jobId: string, expiresAt: string, sig: string): boolean {
  const payload = `${jobId}:${expiresAt}`;
  const expected = createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch {
    return false;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { exportRepository } = getStore();
  const actor = tryAuthenticateRequest(request);
  if (!actor) {
    return createErrorResponse("UNAUTHORIZED", "Missing or invalid authorization header", 401);
  }

  const { id } = await params;
  const job = exportRepository.jobs.get(id);
  if (!job) {
    return createErrorResponse("EXPORT_NOT_FOUND", `Export job '${id}' not found.`, 404);
  }

  // Ownership check — prevent cross-tenant access
  if (job.ownerId !== actor.walletAddress) {
    return createErrorResponse("EXPORT_NOT_FOUND", `Export job '${id}' not found.`, 404);
  }

  const now = new Date();
  if (now > new Date(job.expiresAt)) {
    exportRepository.jobs.set(id, { ...job, status: "expired" });
    createAuditRecord(id, "export.expired", { expiresAt: job.expiresAt });
    return createErrorResponse("EXPORT_EXPIRED", "This export has expired and is no longer available.", 410);
  }

  const url = new URL(request.url);
  const isDownload = url.searchParams.get("download") === "true" || url.searchParams.get("download") === "1";

  if (isDownload) {
    if (job.status !== "ready" || !job.signedUrl) {
      return createErrorResponse("EXPORT_NOT_READY", "Export is not yet ready for download.", 409);
    }

    const expiresParam = url.searchParams.get("expires");
    const sigParam = url.searchParams.get("sig");

    // Verify HMAC signature and expiry
    if (!expiresParam || !sigParam || !verifySignedUrl(id, expiresParam, sigParam)) {
      return createErrorResponse("EXPORT_URL_INVALID", "Signed URL is invalid.", 403);
    }

    if (now > new Date(expiresParam)) {
      exportRepository.jobs.set(id, { ...job, status: "expired" });
      createAuditRecord(id, "export.expired", { signedUrlExpiresAt: expiresParam });
      return createErrorResponse("EXPORT_URL_EXPIRED", "Signed URL has expired.", 410);
    }

    createAuditRecord(id, "export.downloaded", { requestedAt: now.toISOString() });
    return NextResponse.json({ data: job, links: { self: `/api/exports/${id}?download=true` } });
  }

  return NextResponse.json({ data: job, links: { self: `/api/exports/${id}` } });
}
