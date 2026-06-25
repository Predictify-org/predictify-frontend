import { createHmac, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { getStore } from "@/app/lib/db";
import { acquireExportSlot, releaseExportSlot } from "@/app/lib/export-concurrency";

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
  const { exportRepository, streamRepository } = getStore();
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

    // Concurrency cap — per-tenant
    if (!acquireExportSlot(actor.walletAddress)) {
      return createErrorResponse("TOO_MANY_EXPORTS", "Too many concurrent exports. Please wait and try again.", 429);
    }

    createAuditRecord(id, "export.downloaded", { requestedAt: now.toISOString() });

    // Scope streams and activity to the job owner
    const streams = Array.from(streamRepository.streams.values())
      .filter((s) => (s as { ownerId?: string }).ownerId === job.ownerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const events = Array.from(streamRepository.activity.values())
      .filter((e) => (e as { ownerId?: string }).ownerId === job.ownerId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const encoder = new TextEncoder();
    let slotReleased = false;

    function releaseSlot() {
      if (!slotReleased) {
        slotReleased = true;
        releaseExportSlot(actor.walletAddress);
      }
    }

    function* generateLines(): Generator<string> {
      yield JSON.stringify({
        type: "export.meta",
        exportId: id,
        exportedAt: now.toISOString(),
        ownerId: actor.walletAddress,
        streamCount: streams.length,
        eventCount: events.length,
      }) + "\n";

      for (const stream of streams) {
        const { ownerId: _, ...safe } = stream as Record<string, unknown>;
        yield JSON.stringify({ recordType: "stream", ...safe }) + "\n";
      }

      for (const event of events) {
        const { ownerId: _, ...safe } = event as Record<string, unknown>;
        yield JSON.stringify({ recordType: "activity", ...safe }) + "\n";
      }

      yield JSON.stringify({
        type: "export.summary",
        streams: streams.length,
        events: events.length,
        exportedAt: now.toISOString(),
      }) + "\n";
    }

    const gen = generateLines();

    const ndjsonStream = new ReadableStream({
      pull(controller) {
        try {
          const { value, done } = gen.next();
          if (done) {
            releaseSlot();
            controller.close();
          } else {
            controller.enqueue(encoder.encode(value));
          }
        } catch (error) {
          releaseSlot();
          controller.error(error);
        }
      },
      cancel() {
        releaseSlot();
      },
    });

    return new Response(ndjsonStream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson",
        "Content-Disposition": `attachment; filename="${job.fileName}"`,
      },
    });
  }

  return NextResponse.json({ data: job, links: { self: `/api/exports/${id}` } });
}
