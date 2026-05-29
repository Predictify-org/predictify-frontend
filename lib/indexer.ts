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
