import { NextRequest, NextResponse } from "next/server";
import { db, getStore } from "@/app/lib/db";
import { tryAuthenticateRequest, JWT_SECRET } from "@/app/lib/auth";
import { eventBus } from "@/app/lib/event-bus";
import { logger, getCorrelationContext, extractCorrelationContext, setCorrelationContext, withStreamContext } from "@/app/lib/logger";

type Context = { params: Promise<{ id: string }> };

/**
 * SSE Endpoint for live stream deltas via Server-Sent Events.
 * 
 * Route: GET /api/streams/:id/events
 * 
 * Protocol:
 * - Client connects via GET /api/streams/:id/events with Bearer token.
 * - Server sends "ping" comments every 30s to keep connection alive.
 * - Server sends JSON data for "stream:updated" and "settle:finished" events.
 * 
 * Security:
 * - JWT Authentication required.
 * - Users can only subscribe to streams they own (recipient or matching email).
 * - 403 returned on unauthorized access or ID guessing.
 * 
 * Headers:
 * - Authorization: Bearer <JWT token>
 * - x-correlation-id: Optional correlation ID for tracing
 * - x-tenant-id: Required tenant ID header
 * 
 * Response Headers:
 * - Content-Type: text/event-stream
 * - Cache-Control: no-cache, no-transform
 * - Connection: keep-alive
 * - x-request-id: Request ID for tracing
 * - x-correlation-id: Correlation ID for tracing
 */
export async function GET(
  request: NextRequest,
  { params }: Context
) {
  // Extract and set correlation context from headers
  const correlationContext = extractCorrelationContext(request.headers);
  setCorrelationContext(correlationContext);
  
  const { id: streamId } = await params;
  
  // Add stream ID to correlation context
  withStreamContext(streamId);
  
  // 1. Authenticate Request
  const actor = tryAuthenticateRequest(request);
  if (!actor) {
    logger.warn("SSE connection attempt without valid authentication", {
      streamId,
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });
    return NextResponse.json(
      { 
        error: { 
          code: "UNAUTHORIZED", 
          message: "Missing or invalid authorization header",
          request_id: getCorrelationContext()?.request_id 
        } 
      }, 
      { status: 401 }
    );
  }

  // 2. Validate Stream ID format
  if (!streamId || typeof streamId !== "string" || streamId.trim() === "") {
    logger.warn("Invalid stream ID in SSE request", {
      streamId,
      actorId: actor.actorId,
    });
    return NextResponse.json(
      { 
        error: { 
          code: "VALIDATION_ERROR", 
          message: "Stream ID is required and must be a non-empty string",
          request_id: getCorrelationContext()?.request_id 
        } 
      }, 
      { status: 422 }
    );
  }

  // 3. Validate Tenant ID
  const tenant = request.headers.get("x-tenant-id");
  if (!tenant || tenant.trim() === "") {
    logger.warn("Missing tenant ID in SSE request", {
      streamId,
      actorId: actor.actorId,
    });
    return NextResponse.json(
      { 
        error: { 
          code: "MISSING_TENANT", 
          message: "Tenant ID header (x-tenant-id) is required",
          request_id: getCorrelationContext()?.request_id 
        } 
      }, 
      { status: 400 }
    );
  }

  // 4. Fetch Stream
  const { streamRepository } = getStore();
  const stream = streamRepository.streams.get(streamId);
  
  if (!stream) {
    logger.warn("Stream not found for SSE connection", {
      streamId,
      tenant,
      actorId: actor.actorId,
    });
    return NextResponse.json(
      { 
        error: { 
          code: "NOT_FOUND", 
          message: `Stream '${streamId}' not found`,
          request_id: getCorrelationContext()?.request_id 
        } 
      }, 
      { status: 404 }
    );
  }

  // 5. Authorization Check
  // Users can only subscribe to streams where they are the recipient
  // or if they have admin role
  const isOwner = 
    (stream as any).recipient === actor.walletAddress || 
    (stream as any).email && (db.users.get(actor.walletAddress)?.email === (stream as any).email) ||
    actor.role === "admin";

  if (!isOwner) {
    logger.warn("Unauthorized SSE subscription attempt", {
      actorId: actor.actorId,
      streamId,
      tenant,
      walletAddress: actor.walletAddress,
    });
    return NextResponse.json(
      { 
        error: { 
          code: "FORBIDDEN", 
          message: "You do not have permission to subscribe to this stream",
          request_id: getCorrelationContext()?.request_id 
        } 
      }, 
      { status: 403 }
    );
  }

  // 6. Establish SSE Connection
  const encoder = new TextEncoder();

  logger.info("SSE connection established", {
    actorId: actor.actorId,
    streamId,
    tenant,
    walletAddress: actor.walletAddress,
  });

  const stream_response = new ReadableStream({
    start(controller) {
      // Keep-alive ping interval (every 30 seconds)
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch (e) {
          // Stream closed, cleanup
          clearInterval(pingInterval);
        }
      }, 30000);

      // Event handlers for stream updates
      const onStreamUpdated = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: stream:updated\ndata: ${JSON.stringify(data)}\n\n`));
          logger.debug("SSE: stream:updated event sent", {
            streamId,
            actorId: actor.actorId,
          });
        } catch (e) {
          logger.error("Failed to send stream:updated event", {
            streamId,
            actorId: actor.actorId,
            error: e instanceof Error ? e.message : String(e),
          });
          cleanup();
        }
      };

      const onSettleFinished = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: settle:finished\ndata: ${JSON.stringify(data)}\n\n`));
          logger.debug("SSE: settle:finished event sent", {
            streamId,
            actorId: actor.actorId,
          });
        } catch (e) {
          logger.error("Failed to send settle:finished event", {
            streamId,
            actorId: actor.actorId,
            error: e instanceof Error ? e.message : String(e),
          });
          cleanup();
        }
      };

      // Subscribe to event bus for this specific stream
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
        logger.info("SSE connection closed", {
          actorId: actor.actorId,
          streamId,
          tenant,
        });
      };

      // Handle stream termination on client disconnect
      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      // Handled via abort signal
      logger.info("SSE connection cancelled", {
        streamId,
        actorId: actor.actorId,
      });
    }
  });

  return new Response(stream_response, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Request-ID": getCorrelationContext()?.request_id || "",
      "X-Correlation-ID": getCorrelationContext()?.correlation_id || "",
    },
  });
}
