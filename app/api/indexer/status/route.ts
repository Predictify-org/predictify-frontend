/**
 * GET /api/indexer/status
 *
 * SSE endpoint that streams live indexer status updates.
 * Emits an "indexer_status" event every 5 seconds with ledger cursor,
 * ingestion lag, and queue depth.
 *
 * Clients should use EventSource:
 *   const es = new EventSource('/api/indexer/status');
 *   es.addEventListener('indexer_status', (e) => console.log(JSON.parse(e.data)));
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface IndexerStatus {
  ledgerCursor: number;
  lagMs: number;
  queueDepth: number;
  syncedAt: string;
}

function getIndexerStatus(): IndexerStatus {
  // In production this would read from the real indexer state store.
  return {
    ledgerCursor: 50_000_000 + Math.floor(Math.random() * 1000),
    lagMs: Math.floor(Math.random() * 3000),
    queueDepth: Math.floor(Math.random() * 50),
    syncedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      // Send initial status immediately.
      send("indexer_status", getIndexerStatus());

      // Then send updates every 5 seconds for up to 30 seconds.
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        try {
          send("indexer_status", getIndexerStatus());
        } catch {
          break;
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
