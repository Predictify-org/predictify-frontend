export interface IndexedEvent {
  id: string;
  type: string;
  ledger: number;
  hash: string;
  prevHash: string;
  data: any;
}

export interface IndexerConfig {
  overlapWindow: number;
  hashWindowSize: number;
}

export interface IndexerMetrics {
  gapsDetected: number;
  reorgsDetected: number;
  eventsProcessed: number;
}

export interface EventFetcher {
  fetchEvents(startLedger: number, endLedger: number): Promise<IndexedEvent[]>;
}

export class Indexer {
  private cursor: number = 0;
  private hashWindow: { ledger: number; hash: string }[] = [];
  public readonly metrics: IndexerMetrics = {
    gapsDetected: 0,
    reorgsDetected: 0,
    eventsProcessed: 0,
  };

  constructor(
    private config: IndexerConfig,
    private fetcher: EventFetcher,
    private storage: { saveEvent: (e: IndexedEvent) => Promise<void>; deleteEventsFromLedger: (l: number) => Promise<void> }
  ) {}

  async processEvent(event: IndexedEvent): Promise<void> {
    if (this.cursor === 0) {
      this.cursor = event.ledger - 1;
    }

    // Gap detection
    if (event.ledger > this.cursor + 1 + this.config.overlapWindow) {
      console.log(JSON.stringify({ type: "gap_detected", ledger: event.ledger, cursor: this.cursor }));
      this.metrics.gapsDetected++;
      // Trigger backfill
      const events = await this.fetcher.fetchEvents(this.cursor + 1, event.ledger - 1);
      for (const e of events) {
        await this.storage.saveEvent(e);
      }
    }

    // Reorg detection
    if (this.hashWindow.length > 0) {
      const last = this.hashWindow[this.hashWindow.length - 1];
      if (event.prevHash !== last.hash) {
        console.log(JSON.stringify({ type: "reorg_detected", ledger: event.ledger, prevHash: event.prevHash, expectedPrevHash: last.hash }));
        this.metrics.reorgsDetected++;
        // Rollback
        await this.storage.deleteEventsFromLedger(last.ledger);
        this.cursor = last.ledger - 1;
        this.hashWindow = this.hashWindow.filter(h => h.ledger <= this.cursor);
      }
    }

    await this.storage.saveEvent(event);
    this.cursor = event.ledger;
    
    // Update hash window
    this.hashWindow.push({ ledger: event.ledger, hash: event.hash });
    if (this.hashWindow.length > this.config.hashWindowSize) {
      this.hashWindow.shift();
    }
    
    this.metrics.eventsProcessed++;
  }
}

import { randomUUID } from 'crypto';
import { trace, context, propagation } from '@opentelemetry/api';
import { 
  BasicTracerProvider, 
  SimpleSpanProcessor, 
  AlwaysOnSampler, 
  AlwaysOffSampler, 
  TraceIdRatioBasedSampler, 
  ParentBasedSampler 
} from '@opentelemetry/sdk-trace-base';
import { getCorrelationContext, updateCorrelationContext } from '@/app/lib/logger';

export let tracerProvider: BasicTracerProvider | undefined;
export const activeSpanProcessors: any[] = [];

const delegatingProcessor = {
  onStart(span: any, ctx: any) {
    for (const p of activeSpanProcessors) {
      if (p.onStart) p.onStart(span, ctx);
    }
  },
  onEnd(span: any) {
    for (const p of activeSpanProcessors) {
      if (p.onEnd) p.onEnd(span);
    }
  },
  forceFlush() {
    return Promise.all(activeSpanProcessors.map(p => p.forceFlush ? p.forceFlush() : Promise.resolve())).then(() => {});
  },
  shutdown() {
    return Promise.all(activeSpanProcessors.map(p => p.shutdown ? p.shutdown() : Promise.resolve())).then(() => {});
  }
};

// Setup provider if not already registered/registered globally
let isSetup = false;
function setupTracing() {
  if (isSetup) {
    return;
  }
  isSetup = true;

  // Configure sampler based on environment variables
  let sampler;
  const otelSampler = process.env.OTEL_TRACES_SAMPLER || 'always_on';
  const otelSamplerArg = process.env.OTEL_TRACES_SAMPLER_ARG;

  if (otelSampler === 'always_on') {
    sampler = new AlwaysOnSampler();
  } else if (otelSampler === 'always_off') {
    sampler = new AlwaysOffSampler();
  } else if (otelSampler === 'traceidratio') {
    const ratio = otelSamplerArg ? parseFloat(otelSamplerArg) : 1.0;
    sampler = new TraceIdRatioBasedSampler(ratio);
  } else if (otelSampler === 'parentbased_always_on') {
    sampler = new ParentBasedSampler({ root: new AlwaysOnSampler() });
  } else if (otelSampler === 'parentbased_always_off') {
    sampler = new ParentBasedSampler({ root: new AlwaysOffSampler() });
  } else if (otelSampler === 'parentbased_traceidratio') {
    const ratio = otelSamplerArg ? parseFloat(otelSamplerArg) : 1.0;
    sampler = new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(ratio) });
  } else {
    sampler = new AlwaysOnSampler();
  }

  const provider = new BasicTracerProvider({
    sampler: sampler,
    spanProcessors: [delegatingProcessor],
  });

  tracerProvider = provider;
  trace.setGlobalTracerProvider(provider);
}

setupTracing();

const tracer = trace.getTracer('streampay-indexer');

export interface HorizonIndexerConfig {
  network: string;
  horizonUrl: string;
  overlapWindow: number; // number of ledgers to overlap during backfill or restart
  stallThresholdMs: number;
}

export interface HorizonEvent {
  id: string;
  type: string;
  ledger: number;
  data: any;
  streamId?: string;
}

export interface CursorState {
  lastLedger: number;
  lastUpdatedAt: number;
}

// In-memory persistent mock for cursor state and deduplication
// In production, this would use a durable DB like PostgreSQL or Redis
export const cursorsDb = new Map<string, CursorState>();
export const processedEventsDb = new Set<string>();

export class HorizonIndexer {
  private network: string;
  private horizonUrl: string;
  private overlapWindow: number;
  private stallThresholdMs: number;
  private isRunning: boolean = false;

  constructor(config: HorizonIndexerConfig) {
    this.network = config.network;
    this.horizonUrl = config.horizonUrl;
    this.overlapWindow = config.overlapWindow;
    this.stallThresholdMs = config.stallThresholdMs;
  }

  public async getCursor(): Promise<number> {
    const state = cursorsDb.get(this.network);
    return state ? state.lastLedger : 0;
  }

  public async saveCursor(ledger: number) {
    await tracer.startActiveSpan('db.write', async (span) => {
      try {
        cursorsDb.set(this.network, { lastLedger: ledger, lastUpdatedAt: Date.now() });
        span.setStatus({ code: 1 }); // OK
      } catch (err) {
        span.setStatus({ code: 2, message: err instanceof Error ? err.message : String(err) });
        if (err instanceof Error) span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public checkStall() {
    const state = cursorsDb.get(this.network);
    if (!state) return;
    if (Date.now() - state.lastUpdatedAt > this.stallThresholdMs) {
      console.error(`[ALERT] Cursor stalled for network ${this.network}. Last update: ${new Date(state.lastUpdatedAt).toISOString()}`);
    }
  }

  public async processEvent(event: HorizonEvent, correlationId: string) {
    // Idempotency check using natural keys for each chain event type
    const eventKey = `${this.network}:${event.id}:${event.type}`;
    if (processedEventsDb.has(eventKey)) {
      return; // Deduplicate
    }

    const currentCorrelation = getCorrelationContext();
    const traceparent = currentCorrelation?.traceparent;
    const parentCtx = traceparent 
      ? propagation.extract(context.active(), { traceparent })
      : context.active();

    await context.with(parentCtx, async () => {
      await tracer.startActiveSpan('event.publish', async (eventSpan) => {
        try {
          // Propagate active trace context to correlation metadata
          const carrier: Record<string, string> = {};
          propagation.inject(context.active(), carrier);
          if (carrier.traceparent) {
            updateCorrelationContext({ traceparent: carrier.traceparent });
          }

          // Simulate event processing logic here (wrapped in db.write span)
          await tracer.startActiveSpan('db.write', async (dbSpan) => {
            try {
              processedEventsDb.add(eventKey);
              dbSpan.setStatus({ code: 1 });
            } catch (err) {
              dbSpan.setStatus({ code: 2, message: err instanceof Error ? err.message : String(err) });
              if (err instanceof Error) dbSpan.recordException(err);
              throw err;
            } finally {
              dbSpan.end();
            }
          });
          
          // Persist the cursor after successfully processing
          await this.saveCursor(event.ledger);
          eventSpan.setStatus({ code: 1 });
        } catch (error) {
          eventSpan.setStatus({ code: 2, message: error instanceof Error ? error.message : "Unknown error" });
          if (error instanceof Error) eventSpan.recordException(error);
          console.error(JSON.stringify({
            level: "error",
            message: "Failed to process event",
            correlation_id: correlationId,
            stream_id: event.streamId,
            event_id: event.id,
            error: error instanceof Error ? error.message : "Unknown error"
          }));
          throw error;
        } finally {
          eventSpan.end();
        }
      });
    });
  }

  public async backfill(targetLedger: number, mockEvents: HorizonEvent[] = []) {
    const currentCursor = await this.getCursor();
    // Safe overlap window on re-scan
    const startLedger = Math.max(0, currentCursor - this.overlapWindow);
    
    console.log(`Starting backfill from ledger ${startLedger} to ${targetLedger}`);
    
    const eventsToProcess = mockEvents.filter(e => e.ledger >= startLedger && e.ledger <= targetLedger);
    
    for (const event of eventsToProcess) {
      const correlationId = randomUUID();
      await this.processEvent(event, correlationId);
    }
  }

  public async startMainLoop(pollInterval: number = 5000, fetchEvents?: (ledger: number) => Promise<HorizonEvent[]>) {
    this.isRunning = true;
    while (this.isRunning) {
      try {
        const cursor = await this.getCursor();
        const nextLedger = cursor + 1;
        
        // Mock fetch from Horizon wrapped in horizon.fetch span
        const events = await tracer.startActiveSpan('horizon.fetch', async (span) => {
          try {
            const res = fetchEvents ? await fetchEvents(nextLedger) : [];
            span.setStatus({ code: 1 });
            return res;
          } catch (err) {
            span.setStatus({ code: 2, message: err instanceof Error ? err.message : String(err) });
            if (err instanceof Error) span.recordException(err);
            throw err;
          } finally {
            span.end();
          }
        });

        for (const event of events) {
          const correlationId = randomUUID();
          await this.processEvent(event, correlationId);
        }
        
        this.checkStall();
      } catch (err) {
        console.error(JSON.stringify({
           level: "error",
           message: "Main loop error",
           correlation_id: randomUUID(),
           error: err instanceof Error ? err.message : String(err)
        }));
      }
      if (!this.isRunning) break;
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  public stop() {
    this.isRunning = false;
  }
}
