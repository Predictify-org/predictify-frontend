import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/app/lib/db";
import { tryAuthenticateRequest } from "@/app/lib/auth";
import { eventBus } from "@/app/lib/event-bus";
import { logger } from "@/app/lib/logger";

/**
 * SSE Endpoint for live stream and settlement status updates.
 * 
 * Protocol:
 * - Client connects via GET /api/streams/events?streamId=... with Bearer token.
 * - Server sends "ping" comments every 30s to keep connection alive.
 * - Server sends JSON data for "stream:updated" and "settle:finished" events.
 * 
 * Security:
 * - JWT Authentication required.
 * - Users can only subscribe to streams they own (recipient or matching email).
 * - 403 returned on unauthorized access or ID guessing.
 */
export async function GET(request: NextRequest) {
  const { streamRepository } = getStore();
  // 1. Authenticate Request
  const actor = tryAuthenticateRequest(request);
  if (!actor) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization" } }, { status: 401 });
  }

  // 2. Validate Stream ID
  const { searchParams } = new URL(request.url);
  const streamId = searchParams.get("streamId");

  if (!streamId) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "streamId parameter is required" } }, { status: 422 });
  }

  const stream = streamRepository.streams.get(streamId);
  if (!stream) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Stream not found" } }, { status: 404 });
  }

  // 3. Authorization Check
  // In this mock, we check if the user's wallet address matches the stream's recipient 
  // or if the user's email (if we had it) matches.
  // For the purpose of this task, we'll fetch the user to check their email too.
  const user = streamRepository.users.get(actor.walletAddress);
  const isOwner = 
    stream.recipient === actor.walletAddress || 
    (user && stream.email === user.email) ||
    actor.role === "admin"; // Admins can see everything

  if (!isOwner) {
    logger.warn("Unauthorized stream event subscription attempt", {
      actorId: actor.actorId,
      streamId,
    });
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "You do not have permission to subscribe to this stream" } }, { status: 403 });
  }

  // 4. Establish SSE Connection
  const encoder = new TextEncoder();

  const stream_response = new ReadableStream({
    start(controller) {
      logger.info("Client connected to stream events", { actorId: actor.actorId, streamId });

      // Keep-alive ping interval (every 30 seconds)
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch (e) {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Event handlers
      const onStreamUpdated = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: stream:updated\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          cleanup();
        }
      };

      const onSettleFinished = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: settle:finished\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          cleanup();
        }
      };

      // Subscribe to event bus
      eventBus.on(`stream:updated:${streamId}`, onStreamUpdated);
      eventBus.on(`settle:finished:${streamId}`, onSettleFinished);

      const cleanup = () => {
        clearInterval(pingInterval);
        eventBus.off(`stream:updated:${streamId}`, onStreamUpdated);
        eventBus.off(`settle:finished:${streamId}`, onSettleFinished);
        try {
          controller.close();
        } catch (e) {
          // Stream might already be closed
        }
        logger.info("Client disconnected from stream events", { actorId: actor.actorId, streamId });
      };

      // Handle stream termination
      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      // Handled via abort signal
    }
  });

  return new Response(stream_response, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
