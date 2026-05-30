import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { logger } from "@/app/lib/logger";
import { getCorrelationContext } from "@/app/lib/correlation-middleware";
import { redact } from "@/app/lib/privacy";

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, request_id: "mock-request-id" } }, { status });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const correlationId = getCorrelationContext()?.correlationId || "unknown";
  
  const stream = db.streams.get(id);
  if (!stream) {
    logger.warn("Stream not found for stop action", { correlationId, streamId: id });
    return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }
  if (stream.status !== "active" && stream.status !== "draft") {
    logger.warn("Invalid stream state for stop action", { correlationId, streamId: id, status: stream.status });
    return createErrorResponse("INVALID_STREAM_STATE", "Only active or draft streams can be stopped", 409);
  }
  stream.status = "ended";
  stream.nextAction = "withdraw";
  stream.updatedAt = new Date().toISOString();
  db.streams.set(id, stream);
  
  logger.info("Stream stopped successfully", { 
    correlationId, 
    streamId: id, 
    action: "stop", 
    status: "success", 
    stream: redact(stream) 
  });
  
  return NextResponse.json({ data: stream });
}
