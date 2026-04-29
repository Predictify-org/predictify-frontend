import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { requireInternalServiceAuth } from "@/app/lib/internal-service-auth";

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        request_id: "mock-request-id",
      },
    },
    { status }
  );
}

export async function POST(request: Request) {
  const identity = await requireInternalServiceAuth(request, {
    allowedServices: ["ops-automation", "reconciliation-worker"],
    concealFailure: true,
  });

  if (identity instanceof NextResponse) {
    return identity;
  }

  let body: { dryRun?: boolean; streamId?: string } = {};
  try {
    const rawBody = await request.clone().text();
    if (rawBody.length > 0) {
      body = JSON.parse(rawBody) as { dryRun?: boolean; streamId?: string };
    }
  } catch {
    return createErrorResponse("INVALID_REQUEST", "Request body must be valid JSON.", 400);
  }

  if (body.streamId && !db.streams.has(body.streamId)) {
    return createErrorResponse("STREAM_NOT_FOUND", `Stream '${body.streamId}' not found.`, 404);
  }

  const streams = body.streamId
    ? [db.streams.get(body.streamId)!]
    : Array.from(db.streams.values());

  const summary = streams.reduce(
    (accumulator, stream) => {
      accumulator.totalStreams += 1;
      if (stream.status === "active") {
        accumulator.activeStreams += 1;
      }
      if (stream.status === "ended") {
        accumulator.endedStreams += 1;
      }
      if (stream.withdrawal?.state === "failed") {
        accumulator.failedWithdrawals += 1;
      }
      return accumulator;
    },
    {
      activeStreams: 0,
      endedStreams: 0,
      failedWithdrawals: 0,
      totalStreams: 0,
    }
  );

  return NextResponse.json(
    {
      data: {
        acceptedAt: new Date().toISOString(),
        dryRun: body.dryRun ?? false,
        requestedBy: identity.serviceName,
        scope: body.streamId ?? "all-streams",
        summary,
      },
      meta: {
        auth: {
          keyId: identity.keyId,
          timestamp: identity.timestamp,
        },
      },
    },
    { status: 202 }
  );
}
