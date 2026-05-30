import { NextResponse } from "next/server";
import { getStore } from "@/app/lib/db";
import { requireInternalServiceAuth } from "@/app/lib/internal-service-auth";
import { ReconciliationService } from "@/scripts/reconciliation/reconcile";
import { dbClient } from "@/lib/dbClient";
import { DbStream } from "@/scripts/reconciliation/types";

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
  const { streamRepository } = getStore();
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

  // Load and map all database streams from getStore() and dbClient mock
  const dbStreamsList: DbStream[] = [];

  // Add dbClient mock streams
  try {
    const clientStreams = await dbClient.getStreams(100, 0);
    dbStreamsList.push(...clientStreams);
  } catch {
    // Ignore
  }

  // Add store repository streams
  const repoStreams = Array.from(streamRepository.streams.values());
  for (const s of repoStreams) {
    if (!dbStreamsList.some((x) => x.id === s.id)) {
      dbStreamsList.push({
        id: s.id,
        recipient_address: s.recipient || "unknown",
        total_amount: s.vestedAmount || "1000000000",
        released_amount: s.releasedAmount || "0",
        status: s.status.toUpperCase(),
        last_sync_ledger: 0,
      });
    }
  }

  const streamExists = body.streamId 
    ? dbStreamsList.some((x) => x.id === body.streamId)
    : false;

  if (body.streamId && !streamExists) {
    return createErrorResponse("STREAM_NOT_FOUND", `Stream '${body.streamId}' not found.`, 404);
  }

  const streams = body.streamId
    ? (streamRepository.streams.has(body.streamId) ? [streamRepository.streams.get(body.streamId)!] : [])
    : Array.from(streamRepository.streams.values());

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

  // Execute actual reconciliation comparing DB and on-chain
  const reconciliationService = new ReconciliationService({
    tolerance: BigInt(process.env.RECONCILE_TOLERANCE || "0"),
  });

  const report = await reconciliationService.runReconciliation({
    streamId: body.streamId,
    dryRun: body.dryRun ?? false,
    dbStreams: dbStreamsList,
  });

  const discrepancies = report.mismatches.map((m) => ({
    streamId: m.streamId,
    field: m.field,
    dbValue: typeof m.dbValue === "bigint" ? m.dbValue.toString() : m.dbValue,
    onChainValue: typeof m.onChainValue === "bigint" ? m.onChainValue.toString() : m.onChainValue,
  }));

  return NextResponse.json(
    {
      data: {
        acceptedAt: new Date().toISOString(),
        dryRun: body.dryRun ?? false,
        requestedBy: identity.serviceName,
        scope: body.streamId ?? "all-streams",
        summary,
        discrepancies,
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
