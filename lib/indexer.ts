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
import { randomUUID } from 'crypto';

export interface IndexerConfig {
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

  constructor(config: IndexerConfig) {
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
    cursorsDb.set(this.network, { lastLedger: ledger, lastUpdatedAt: Date.now() });
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

    try {
      // Simulate event processing logic here
      processedEventsDb.add(eventKey);
      
      // Persist the cursor after successfully processing
      await this.saveCursor(event.ledger);
    } catch (error) {
      console.error(JSON.stringify({
        level: "error",
        message: "Failed to process event",
        correlation_id: correlationId,
        stream_id: event.streamId,
        event_id: event.id,
        error: error instanceof Error ? error.message : "Unknown error"
      }));
      throw error;
    }
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
        
        // Mock fetch from Horizon
        const events = fetchEvents ? await fetchEvents(nextLedger) : [];
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
