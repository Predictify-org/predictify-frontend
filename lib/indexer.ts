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
  private activeStream: { close: () => void } | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private backoffDelayMs: number = 1000;
  private maxBackoffDelayMs: number = 30000;
  private isFallbackPolling: boolean = false;
  private consecutiveFailures: number = 0;
  private maxConsecutiveFailuresBeforeFallback: number = 3;

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
    this.backoffDelayMs = 1000;

    if (fetchEvents) {
      // If a mock fetch function is provided (e.g. in tests), run simple polling loop
      this.runMockPollingLoop(pollInterval, fetchEvents);
      return;
    }

    this.startStreamingLoop(pollInterval);
  }

  private async runMockPollingLoop(pollInterval: number, fetchEvents: (ledger: number) => Promise<HorizonEvent[]>) {
    while (this.isRunning) {
      try {
        const cursor = await this.getCursor();
        const nextLedger = cursor + 1;
        const events = await fetchEvents(nextLedger);
        for (const event of events) {
          const correlationId = randomUUID();
          await this.processEvent(event, correlationId);
        }
        this.checkStall();
      } catch (err) {
        console.error(JSON.stringify({
           level: "error",
           message: "Mock main loop error",
           correlation_id: randomUUID(),
           error: err instanceof Error ? err.message : String(err)
        }));
      }
      if (!this.isRunning) break;
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  private startStreamingLoop(pollInterval: number) {
    this.consecutiveFailures = 0;
    this.connectStreaming(pollInterval);
  }

  private async connectStreaming(pollInterval: number) {
    if (!this.isRunning) return;

    if (this.activeStream) {
      this.activeStream.close();
      this.activeStream = null;
    }

    try {
      const cursor = await this.getCursor();
      console.log(`[INDEXER] Attempting to connect SSE stream from cursor ${cursor} for network ${this.network}`);

      this.activeStream = this.connectSse(
        cursor,
        async (event) => {
          this.consecutiveFailures = 0;
          this.backoffDelayMs = 1000;

          if (this.isFallbackPolling) {
            console.log(`[INDEXER] SSE stream recovered. Disabling polling fallback.`);
            this.isFallbackPolling = false;
            if (this.pollTimer) {
              clearTimeout(this.pollTimer);
              this.pollTimer = null;
            }
          }

          const correlationId = randomUUID();
          await this.processEvent(event, correlationId);
          this.checkStall();
        },
        (err) => {
          console.error(`[INDEXER] Stream error for network ${this.network}:`, err.message);
          this.handleStreamDisconnect(pollInterval);
        }
      );
    } catch (err: any) {
      console.error(`[INDEXER] Failed to initiate stream connection:`, err.message);
      this.handleStreamDisconnect(pollInterval);
    }
  }

  private handleStreamDisconnect(pollInterval: number) {
    if (!this.isRunning) return;

    this.consecutiveFailures++;
    console.warn(`[INDEXER] Connection failed. Consecutive failures: ${this.consecutiveFailures}/${this.maxConsecutiveFailuresBeforeFallback}`);

    if (this.consecutiveFailures >= this.maxConsecutiveFailuresBeforeFallback) {
      if (!this.isFallbackPolling) {
        this.runPollingFallback(pollInterval);
      }
    }

    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connectStreaming(pollInterval);
    }, this.backoffDelayMs);

    this.backoffDelayMs = Math.min(this.backoffDelayMs * 2, this.maxBackoffDelayMs);
  }

  private connectSse(cursor: number, onEvent: (event: HorizonEvent) => Promise<void>, onError: (err: Error) => void): { close: () => void } {
    const url = new URL(`${this.horizonUrl}/ledgers?cursor=${cursor}&order=asc&limit=10`);
    const options = {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
      }
    };

    const client = url.protocol === 'https:' ? require('https') : require('http');

    let isClosed = false;
    let keepAliveTimer: NodeJS.Timeout | null = null;

    const resetKeepAlive = () => {
      if (keepAliveTimer) clearTimeout(keepAliveTimer);
      // Horizon sends keep-alive comments starting with ":" every ~30 seconds.
      // We expect a heartbeat/event within 45 seconds.
      keepAliveTimer = setTimeout(() => {
        if (!isClosed) {
          req.destroy(new Error('Heartbeat timeout - no data received in 45 seconds'));
        }
      }, 45000);
    };

    const req = client.request(url, options, (res: any) => {
      resetKeepAlive();

      let buffer = '';

      res.on('data', (chunk: Buffer) => {
        resetKeepAlive();
        buffer += chunk.toString();

        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const message = buffer.substring(0, boundary);
          buffer = buffer.substring(boundary + 2);
          this.parseAndProcessSseMessage(message, onEvent);
          boundary = buffer.indexOf('\n\n');
        }
      });

      res.on('end', () => {
        if (keepAliveTimer) clearTimeout(keepAliveTimer);
        if (!isClosed) {
          onError(new Error('Stream ended by server'));
        }
      });
    });

    req.on('error', (err: any) => {
      if (keepAliveTimer) clearTimeout(keepAliveTimer);
      if (!isClosed) {
        onError(err);
      }
    });

    req.end();
    resetKeepAlive();

    return {
      close: () => {
        isClosed = true;
        if (keepAliveTimer) clearTimeout(keepAliveTimer);
        req.destroy();
      }
    };
  }

  private parseAndProcessSseMessage(message: string, onEvent: (event: HorizonEvent) => Promise<void>) {
    const lines = message.split('\n');
    let eventData = '';
    let eventType = 'message';
    let eventId = '';

    for (const line of lines) {
      if (line.startsWith(':')) {
        continue;
      }
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const field = line.substring(0, colonIdx).trim();
      let value = line.substring(colonIdx + 1);
      if (value.startsWith(' ')) {
        value = value.substring(1);
      }

      if (field === 'data') {
        eventData += value;
      } else if (field === 'event') {
        eventType = value;
      } else if (field === 'id') {
        eventId = value;
      }
    }

    if (eventData) {
      try {
        const parsed = JSON.parse(eventData);
        const event: HorizonEvent = {
          id: eventId || parsed.id || parsed.paging_token || String(Date.now()),
          type: eventType,
          ledger: parsed.sequence || parsed.ledger || Number(parsed.ledger_sequence) || 0,
          data: parsed,
          streamId: parsed.id
        };
        if (event.ledger > 0) {
          onEvent(event).catch(err => {
            console.error('Error handling SSE event:', err);
          });
        }
      } catch (e) {
        // Ignore unparseable JSON
      }
    }
  }

  private async runPollingFallback(pollInterval: number) {
    if (this.isFallbackPolling) return;
    this.isFallbackPolling = true;
    console.warn(`[INDEXER] Falling back to polling mode for network ${this.network}`);

    while (this.isRunning && this.isFallbackPolling) {
      try {
        const cursor = await this.getCursor();
        const url = `${this.horizonUrl}/ledgers?cursor=${cursor}&order=asc&limit=10`;
        const responseText = await this.httpGet(url);
        const parsed = JSON.parse(responseText);

        const records = parsed._embedded?.records || [];
        for (const record of records) {
          const event: HorizonEvent = {
            id: record.id || record.paging_token,
            type: "ledger",
            ledger: record.sequence || Number(record.ledger_sequence) || 0,
            data: record,
            streamId: record.id
          };

          if (event.ledger > 0) {
            const correlationId = randomUUID();
            await this.processEvent(event, correlationId);
          }
        }

        this.checkStall();
        this.backoffDelayMs = 1000;
      } catch (err) {
        console.error(JSON.stringify({
          level: "error",
          message: "Polling fallback error",
          correlation_id: randomUUID(),
          error: err instanceof Error ? err.message : String(err)
        }));
        await new Promise(resolve => setTimeout(resolve, this.backoffDelayMs));
        this.backoffDelayMs = Math.min(this.backoffDelayMs * 2, this.maxBackoffDelayMs);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  private httpGet(urlString: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(urlString);
      const client = url.protocol === 'https:' ? require('https') : require('http');
      const req = client.get(url, (res: any) => {
        let data = '';
        res.on('data', (chunk: Buffer) => data += chunk.toString());
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP status ${res.statusCode}`));
          }
        });
      });
      req.on('error', (err: any) => reject(err));
      req.end();
    });
  }

  public stop() {
    this.isRunning = false;
    this.isFallbackPolling = false;
    if (this.activeStream) {
      this.activeStream.close();
      this.activeStream = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
