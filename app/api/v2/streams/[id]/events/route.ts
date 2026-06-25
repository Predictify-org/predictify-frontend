import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/app/lib/db";
import { eventBus } from "@/app/lib/event-bus";
import { logger } from "@/app/lib/logger";
import { errorResponse, ErrorCode } from "@/app/lib/errors";

/**
 * GET /api/v2/streams/[id]/events
 *
 * Server-Sent Events endpoint for per-stream lifecycle updates.
 *
 * Protocol
 * ────────
 * - Client connects with `Authorization: Bearer <token>`.
 * - Server sends a `: keep-alive` comment every 15 s.
 * - Server forwards two event types:
 *     event: stream:updated   — any state mutation on this stream
 *     event: settle:finished  — stream fully settled
 * - On `Connection: close` / client disconnect the abort signal fires,
 *   listeners are removed, and the stream is closed.
 *
 * Security
 * ────────
 * - Bearer token required (401 without it).
 * - Stream must exist (404).
 * - Caller must be the stream sender or recipient (403).
 * - No persistent storage write; read-only subscription.
 *
 * Backpressure
 * ────────────
 * Each enqueue is wrapped in a try/catch. If the underlying
 * ReadableStream controller is already closed (client gone), we call
 * cleanup() immediately rather than letting errors accumulate.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse(ErrorCode.UNAUTHORIZED, "Bearer token required.", 401);
  }

  // Decode the JWT sub claim without full verification so the route
  // stays dependency-light. The middleware layer handles signature
  // verification before requests reach here.
  let walletAddress: string | null = null;
  try {
    const payload = JSON.parse(
      Buffer.from(authHeader.slice(7).split(".")[1], "base64url").toString(),
    ) as { sub?: string };
    walletAddress = payload.sub ?? null;
  } catch {
    return errorResponse(ErrorCode.UNAUTHORIZED, "Malformed bearer token.", 401);
  }

  if (!walletAddress) {
    return errorResponse(ErrorCode.UNAUTHORIZED, "Token missing sub claim.", 401);
  }

  // ── 2. Resolve stream ────────────────────────────────────────────────────
  const { id } = await params;
  const { streamRepository } = getStore();
  const stream = streamRepository.streams.get(id);

  if (!stream) {
    return errorResponse(ErrorCode.STREAM_NOT_FOUND, `Stream '${id}' not found.`, 404);
  }

  // ── 3. Authorise ─────────────────────────────────────────────────────────
  // Only the stream's sender or recipient may subscribe.
  const isSender    = (stream as any).sender    === walletAddress;
  const isRecipient = (stream as any).recipient === walletAddress;

  if (!isSender && !isRecipient) {
    logger.warn("Unauthorised SSE subscription attempt", {
      streamId: id,
      walletAddress,
    });
    return errorResponse(
      ErrorCode.FORBIDDEN,
      "You do not have permission to subscribe to this stream.",
      403,
    );
  }

  // ── 4. SSE stream ────────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const body = new ReadableStream({
    start(controller) {
      logger.info("SSE client connected", { streamId: id, walletAddress });

      // ── helpers ──────────────────────────────────────────────────────────

      /** Enqueue raw SSE bytes; call cleanup on write error (client gone). */
      function enqueue(chunk: string) {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      }

      /** Remove all listeners and close the controller. */
      function cleanup() {
        clearInterval(keepAlive);
        eventBus.off(`stream:updated:${id}`,  onUpdated);
        eventBus.off(`settle:finished:${id}`, onSettled);
        request.signal.removeEventListener("abort", cleanup);
        try { controller.close(); } catch { /* already closed */ }
        logger.info("SSE client disconnected", { streamId: id, walletAddress });
      }

      // ── keep-alive (15 s comment) ─────────────────────────────────────
      const keepAlive = setInterval(
        () => enqueue(": keep-alive\n\n"),
        15_000,
      );

      // ── event handlers ────────────────────────────────────────────────
      function onUpdated(data: unknown) {
        enqueue(`event: stream:updated\ndata: ${JSON.stringify(data)}\n\n`);
      }

      function onSettled(data: unknown) {
        enqueue(`event: settle:finished\ndata: ${JSON.stringify(data)}\n\n`);
      }

      eventBus.on(`stream:updated:${id}`,  onUpdated);
      eventBus.on(`settle:finished:${id}`, onSettled);

      // ── disconnect ────────────────────────────────────────────────────
      // Fires when the client closes the connection or the server sends
      // Connection: close. We rely on the AbortSignal rather than a
      // `cancel()` hook because Next.js/Node.js streams surface
      // client disconnects through the request signal.
      request.signal.addEventListener("abort", cleanup, { once: true });
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      // Prevent buffering by proxies / CDN edges.
      "X-Accel-Buffering": "no",
    },
  });
}
