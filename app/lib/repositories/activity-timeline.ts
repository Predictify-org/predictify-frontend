import type { ActivityEvent } from "@/app/types/openapi";

function encodeCompositeCursor(timestamp: string, id: string): string {
  const payload = `${timestamp}|${id}`;
  return Buffer.from(payload).toString("base64");
}

function decodeCompositeCursor(cursor: string): { timestamp: string; id: string } {
  if (!cursor || typeof cursor !== "string") {
    throw new Error("Invalid cursor: must be non-empty string");
  }
  let decoded: string;
  try {
    decoded = Buffer.from(cursor, "base64").toString("utf8");
  } catch {
    throw new Error("Invalid cursor: malformed base64");
  }
  const separatorIndex = decoded.indexOf("|");
  if (separatorIndex === -1) {
    throw new Error("Invalid cursor: malformed composite key");
  }
  return {
    timestamp: decoded.slice(0, separatorIndex),
    id: decoded.slice(separatorIndex + 1),
  };
}

export interface ActivityTimelineEntry {
  id: string;
  type: string;
  streamId?: string;
  timestamp: string;
  description: string;
  projectedAt: string;
}

export interface ActivityTimelineQuery {
  cursor?: string;
  limit: number;
  streamId?: string;
  type?: string;
}

export interface ActivityTimelineQueryResult {
  data: ActivityTimelineEntry[];
  meta: {
    hasNext: boolean;
    nextCursor: string | null;
    total: number;
  };
}

export interface ActivityTimelineStore {
  readonly length: number;
  append(entry: ActivityTimelineEntry): void;
  query(params: ActivityTimelineQuery): ActivityTimelineQueryResult;
  getLagMs(): number;
  backfill(entries: ActivityTimelineEntry[]): void;
  getLatestProjectedTimestamp(): string | null;
  reset(): void;
}

class InMemoryActivityTimelineStore implements ActivityTimelineStore {
  private entries: ActivityTimelineEntry[] = [];

  get length(): number {
    return this.entries.length;
  }

  append(entry: ActivityTimelineEntry): void {
    const insertAt = this.findInsertIndex(entry);
    this.entries.splice(insertAt, 0, entry);
  }

  query(params: ActivityTimelineQuery): ActivityTimelineQueryResult {
    const { cursor, limit, streamId, type } = params;
    let filtered = this.entries;

    if (streamId) {
      filtered = filtered.filter((e) => e.streamId === streamId);
    }
    if (type) {
      filtered = filtered.filter((e) => e.type === type);
    }

    const totalFiltered = filtered.length;

    if (cursor) {
      let cursorTimestamp: string;
      let cursorId: string;
      try {
        const decoded = decodeCompositeCursor(cursor);
        cursorTimestamp = decoded.timestamp;
        cursorId = decoded.id;
      } catch {
        return { data: [], meta: { hasNext: false, nextCursor: null, total: totalFiltered } };
      }
      filtered = filtered.filter((event) => {
        const tsCmp = event.timestamp.localeCompare(cursorTimestamp);
        return tsCmp < 0 || (tsCmp === 0 && event.id.localeCompare(cursorId) < 0);
      });
    }

    const paginated = filtered.slice(0, limit);
    const hasNext = filtered.length > limit;
    const nextCursor =
      hasNext && paginated.length > 0
        ? encodeCompositeCursor(paginated[paginated.length - 1].timestamp, paginated[paginated.length - 1].id)
        : null;

    return {
      data: paginated,
      meta: { hasNext, nextCursor, total: totalFiltered },
    };
  }

  getLagMs(): number {
    if (this.entries.length === 0) return 0;
    const latest = this.entries[0];
    return Date.now() - new Date(latest.timestamp).getTime();
  }

  backfill(entries: ActivityTimelineEntry[]): void {
    const sorted = [...entries].sort((a, b) => {
      const tsCmp = b.timestamp.localeCompare(a.timestamp);
      return tsCmp !== 0 ? tsCmp : b.id.localeCompare(a.id);
    });
    this.entries = sorted;
  }

  getLatestProjectedTimestamp(): string | null {
    if (this.entries.length === 0) return null;
    return this.entries[0].timestamp;
  }

  reset(): void {
    this.entries = [];
  }

  private findInsertIndex(entry: ActivityTimelineEntry): number {
    let low = 0;
    let high = this.entries.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      const existing = this.entries[mid];
      const tsCmp = existing.timestamp.localeCompare(entry.timestamp);
      if (tsCmp < 0 || (tsCmp === 0 && existing.id.localeCompare(entry.id) < 0)) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    return low;
  }
}

export function createActivityTimelineStore(): ActivityTimelineStore {
  return new InMemoryActivityTimelineStore();
}

export function activityEventToTimelineEntry(
  event: ActivityEvent,
  projectedAt?: string,
): ActivityTimelineEntry {
  return {
    id: event.id,
    type: event.type,
    streamId: event.streamId,
    timestamp: event.timestamp,
    description: event.description,
    projectedAt: projectedAt ?? new Date().toISOString(),
  };
}
