import { GET } from "./route";
import {
  createInMemoryPersistenceStore,
  decodeCompositeCursor,
  encodeCompositeCursor,
  getStore,
  setStore,
} from "@/app/lib/db";
import type { ActivityEvent } from "@/app/types/openapi";

jest.mock("@/app/lib/logger", () => ({
  getCorrelationContext: jest.fn(() => ({ request_id: "test-req-id" })),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  withCorrelationContext: jest.fn((ctx, fn) => fn()),
}));

const defaultEvents: ActivityEvent[] = [
  { id: "evt-1", type: "wallet.connected", timestamp: "2026-04-28T09:00:00Z", description: "Wallet connected." },
  { id: "evt-2", type: "stream.created", streamId: "stream-ada", timestamp: "2026-04-27T20:00:00Z", description: "Stream created." },
  { id: "evt-3", type: "stream.started", streamId: "stream-ada", timestamp: "2026-04-15T08:00:00Z", description: "Stream started." },
  { id: "evt-4", type: "stream.created", streamId: "stream-kemi", timestamp: "2026-04-10T14:00:00Z", description: "Stream created." },
  { id: "evt-5", type: "stream.created", streamId: "stream-yusuf", timestamp: "2026-04-01T09:05:00Z", description: "Stream created." },
  { id: "evt-6", type: "stream.stopped", streamId: "stream-yusuf", timestamp: "2026-04-01T09:00:00Z", description: "Stream stopped." },
];

function seedActivity(events: ActivityEvent[] = defaultEvents) {
  const store = getStore();
  store.streamRepository.activity.clear();
  for (const event of events) {
    store.streamRepository.activity.set(event.id, { ...event });
  }
}

describe("GET /api/activity", () => {
  beforeEach(() => {
    setStore(createInMemoryPersistenceStore());
    seedActivity();
  });

  describe("pagination", () => {
    it("returns default paginated response with limit 20", async () => {
      const req = new Request("http://localhost/api/activity");
      const res = await GET(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toHaveLength(6);
      expect(body.meta.hasNext).toBe(false);
      expect(body.meta.nextCursor).toBeNull();
      expect(body.meta.total).toBe(6);
    });

    it("respects custom limit parameter", async () => {
      const req = new Request("http://localhost/api/activity?limit=2");
      const res = await GET(req);
      const body = await res.json();

      expect(body.data).toHaveLength(2);
      expect(body.meta.hasNext).toBe(true);
      expect(body.meta.total).toBe(6);
    });

    it("caps limit at 100", async () => {
      const req = new Request("http://localhost/api/activity?limit=500");
      const res = await GET(req);
      const body = await res.json();

      expect(body.data).toHaveLength(6);
    });

    it("returns hasNext false when results fit in single page", async () => {
      const req = new Request("http://localhost/api/activity?limit=10");
      const res = await GET(req);
      const body = await res.json();

      expect(body.meta.hasNext).toBe(false);
      expect(body.meta.nextCursor).toBeNull();
    });
  });

  describe("cursor-based navigation", () => {
    it("paginates forward through all events", async () => {
      const allEvents: ActivityEvent[] = [];
      let cursor: string | null = null;

      for (let i = 0; i < 10; i++) {
        const url = cursor
          ? `http://localhost/api/activity?limit=2&cursor=${encodeURIComponent(cursor)}`
          : "http://localhost/api/activity?limit=2";
        const req = new Request(url);
        const res = await GET(req);
        const body = await res.json();

        allEvents.push(...body.data);
        cursor = body.meta.nextCursor;

        if (!body.meta.hasNext) break;
      }

      expect(allEvents).toHaveLength(6);
      expect(allEvents[0].id).toBe("evt-1");
      expect(allEvents[5].id).toBe("evt-6");
    });

    it("encodes composite cursor with timestamp and id", async () => {
      const req = new Request("http://localhost/api/activity?limit=2");
      const res = await GET(req);
      const body = await res.json();

      expect(body.meta.nextCursor).not.toBeNull();

      const decoded = decodeCompositeCursor(body.meta.nextCursor);
      expect(decoded.timestamp).toBe("2026-04-27T20:00:00Z");
      expect(decoded.id).toBe("evt-2");
    });

    it("returns null cursor when no more pages", async () => {
      const req = new Request("http://localhost/api/activity?limit=10");
      const res = await GET(req);
      const body = await res.json();

      expect(body.meta.nextCursor).toBeNull();
    });

    it("rejects malformed cursor with 422", async () => {
      const req = new Request("http://localhost/api/activity?cursor=not-base64!");
      const res = await GET(req);
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.error.code).toBe("INVALID_CURSOR");
    });

    it("tolerates cursor pointing at non-existent position", async () => {
      const fakeCursor = encodeCompositeCursor("2025-01-01T00:00:00Z", "nonexistent-id");
      const req = new Request(`http://localhost/api/activity?cursor=${encodeURIComponent(fakeCursor)}`);
      const res = await GET(req);
      const body = await res.json();

      expect(body.data).toHaveLength(0);
      expect(body.meta.hasNext).toBe(false);
    });
  });

  describe("stable ordering", () => {
    it("sorts by timestamp descending then id descending", async () => {
      const req = new Request("http://localhost/api/activity");
      const res = await GET(req);
      const body = await res.json();

      for (let i = 1; i < body.data.length; i++) {
        const prev = body.data[i - 1];
        const curr = body.data[i];
        const tsCmp = prev.timestamp.localeCompare(curr.timestamp);
        expect(tsCmp >= 0).toBe(true);
        if (tsCmp === 0) {
          expect(prev.id.localeCompare(curr.id) >= 0).toBe(true);
        }
      }
    });

    it("orders events with same timestamp by id descending", async () => {
      const sameTsEvents: ActivityEvent[] = [
        { id: "b-first", type: "test", timestamp: "2026-04-01T12:00:00Z", description: "B" },
        { id: "a-second", type: "test", timestamp: "2026-04-01T12:00:00Z", description: "A" },
        { id: "c-third", type: "test", timestamp: "2026-04-01T11:00:00Z", description: "C" },
      ];
      seedActivity(sameTsEvents);

      const req = new Request("http://localhost/api/activity");
      const res = await GET(req);
      const body = await res.json();

      expect(body.data[0].id).toBe("b-first");
      expect(body.data[1].id).toBe("a-second");
      expect(body.data[2].id).toBe("c-third");
    });
  });

  describe("filtering", () => {
    it("filters by streamId", async () => {
      const req = new Request("http://localhost/api/activity?streamId=stream-ada");
      const res = await GET(req);
      const body = await res.json();

      expect(body.data).toHaveLength(2);
      expect(body.meta.total).toBe(2);
      expect(body.data.every((e: ActivityEvent) => e.streamId === "stream-ada")).toBe(true);
    });

    it("filters by type", async () => {
      const req = new Request("http://localhost/api/activity?type=stream.created");
      const res = await GET(req);
      const body = await res.json();

      expect(body.data).toHaveLength(3);
      expect(body.meta.total).toBe(3);
      expect(body.data.every((e: ActivityEvent) => e.type === "stream.created")).toBe(true);
    });

    it("combines streamId and type filters", async () => {
      const req = new Request("http://localhost/api/activity?streamId=stream-yusuf&type=stream.created");
      const res = await GET(req);
      const body = await res.json();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe("evt-5");
    });

    it("returns empty data for non-matching streamId", async () => {
      const req = new Request("http://localhost/api/activity?streamId=nonexistent");
      const res = await GET(req);
      const body = await res.json();

      expect(body.data).toHaveLength(0);
      expect(body.meta.total).toBe(0);
    });

    it("returns empty data for non-matching type", async () => {
      const req = new Request("http://localhost/api/activity?type=unknown.type");
      const res = await GET(req);
      const body = await res.json();

      expect(body.data).toHaveLength(0);
      expect(body.meta.total).toBe(0);
    });
  });

  describe("response structure", () => {
    it("includes data, meta, and links in response", async () => {
      const req = new Request("http://localhost/api/activity");
      const res = await GET(req);
      const body = await res.json();

      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("meta");
      expect(body).toHaveProperty("links");
      expect(body.meta).toHaveProperty("hasNext");
      expect(body.meta).toHaveProperty("nextCursor");
      expect(body.meta).toHaveProperty("total");
      expect(body.links).toHaveProperty("self");
    });

    it("links.self points to /api/activity", async () => {
      const req = new Request("http://localhost/api/activity?limit=5");
      const res = await GET(req);
      const body = await res.json();

      expect(body.links.self).toBe("/api/activity?limit=5");
    });
  });

  describe("edge cases", () => {
    it("handles single event correctly", async () => {
      seedActivity([defaultEvents[0]]);
      const req = new Request("http://localhost/api/activity");
      const res = await GET(req);
      const body = await res.json();

      expect(body.data).toHaveLength(1);
      expect(body.meta.hasNext).toBe(false);
    });

    it("handles empty database", async () => {
      seedActivity([]);
      const req = new Request("http://localhost/api/activity");
      const res = await GET(req);
      const body = await res.json();

      expect(body.data).toHaveLength(0);
      expect(body.meta.hasNext).toBe(false);
      expect(body.meta.nextCursor).toBeNull();
      expect(body.meta.total).toBe(0);
    });

    it("handles multiple pages with limit boundary", async () => {
      const manyEvents: ActivityEvent[] = [];
      for (let i = 0; i < 5; i++) {
        const pad = String(i).padStart(2, "0");
        manyEvents.push({
          id: `evt-${pad}`,
          type: "test",
          timestamp: `2026-04-${30 - i}T12:00:00Z`,
          description: `Event ${i}`,
        });
      }
      seedActivity(manyEvents);

      const req = new Request("http://localhost/api/activity?limit=3");
      const res = await GET(req);
      const body1 = await res.json();

      expect(body1.data).toHaveLength(3);
      expect(body1.meta.hasNext).toBe(true);
      expect(body1.meta.nextCursor).not.toBeNull();

      const req2 = new Request(
        `http://localhost/api/activity?limit=3&cursor=${encodeURIComponent(body1.meta.nextCursor)}`,
      );
      const res2 = await GET(req2);
      const body2 = await res2.json();

      expect(body2.data).toHaveLength(2);
      expect(body2.meta.hasNext).toBe(false);
      expect(body2.meta.nextCursor).toBeNull();
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      const req = new Request("http://localhost/api/activity", {
        headers: { "x-forwarded-for": "rate-limit-test-client" },
      });

      let limited = false;
      let retryAfter: string | null = null;

      for (let i = 0; i < 70; i++) {
        const res = await GET(req);
        if (res.status === 429) {
          limited = true;
          retryAfter = res.headers.get("retry-after");
          break;
        }
      }

      expect(limited).toBe(true);
      expect(retryAfter).not.toBeNull();
    });
  });
});
