// spike/temporal/workflow-logic.test.ts
// Tests for pure workflow logic (no Temporal SDK, no network).

import {
  nextTickAt,
  missedTicks,
  isExpired,
  tickId,
  sleepDurationMs,
  type StreamConfig,
} from "./workflow-logic";

// Fixed reference timestamp: 2026-01-15T12:30:45.000Z
const T = new Date("2026-01-15T12:30:45.000Z").getTime();

// ── nextTickAt ────────────────────────────────────────────────────────────────

describe("nextTickAt", () => {
  describe("hourly", () => {
    it("advances to the next UTC hour boundary", () => {
      const next = nextTickAt(T, "hourly");
      const d = new Date(next);
      expect(d.getUTCMinutes()).toBe(0);
      expect(d.getUTCSeconds()).toBe(0);
      expect(d.getUTCMilliseconds()).toBe(0);
      expect(d.getUTCHours()).toBe(13); // 12:30 → 13:00
    });

    it("advances by exactly one hour when already on the boundary", () => {
      const boundary = new Date("2026-01-15T12:00:00.000Z").getTime();
      const next = nextTickAt(boundary, "hourly");
      expect(next - boundary).toBe(60 * 60 * 1000);
    });

    it("produces monotonically increasing ticks", () => {
      let cursor = T;
      for (let i = 0; i < 5; i++) {
        const next = nextTickAt(cursor, "hourly");
        expect(next).toBeGreaterThan(cursor);
        cursor = next;
      }
    });
  });

  describe("daily", () => {
    it("advances to the next UTC midnight", () => {
      const next = nextTickAt(T, "daily");
      const d = new Date(next);
      expect(d.getUTCHours()).toBe(0);
      expect(d.getUTCMinutes()).toBe(0);
      expect(d.getUTCDate()).toBe(16); // Jan 15 → Jan 16
    });

    it("advances by exactly one day when already at midnight", () => {
      const midnight = new Date("2026-01-15T00:00:00.000Z").getTime();
      const next = nextTickAt(midnight, "daily");
      expect(next - midnight).toBe(24 * 60 * 60 * 1000);
    });

    it("handles month boundary (Jan 31 → Feb 1)", () => {
      const jan31 = new Date("2026-01-31T06:00:00.000Z").getTime();
      const next = nextTickAt(jan31, "daily");
      const d = new Date(next);
      expect(d.getUTCMonth()).toBe(1); // February
      expect(d.getUTCDate()).toBe(1);
    });
  });

  describe("monthly", () => {
    it("advances to the first of the next UTC month", () => {
      const next = nextTickAt(T, "monthly");
      const d = new Date(next);
      expect(d.getUTCDate()).toBe(1);
      expect(d.getUTCMonth()).toBe(1); // February
      expect(d.getUTCHours()).toBe(0);
    });

    it("handles December → January year rollover", () => {
      const dec = new Date("2026-12-15T00:00:00.000Z").getTime();
      const next = nextTickAt(dec, "monthly");
      const d = new Date(next);
      expect(d.getUTCFullYear()).toBe(2027);
      expect(d.getUTCMonth()).toBe(0); // January
      expect(d.getUTCDate()).toBe(1);
    });

    it("advances by exactly one month when already on the first", () => {
      const first = new Date("2026-01-01T00:00:00.000Z").getTime();
      const next = nextTickAt(first, "monthly");
      const d = new Date(next);
      expect(d.getUTCMonth()).toBe(1);
      expect(d.getUTCDate()).toBe(1);
    });
  });
});

// ── missedTicks ───────────────────────────────────────────────────────────────

describe("missedTicks", () => {
  it("returns empty array when no ticks fall in the range", () => {
    const from = new Date("2026-01-15T12:00:00.000Z").getTime();
    const to = new Date("2026-01-15T12:30:00.000Z").getTime(); // less than 1 hour later
    expect(missedTicks(from, to, "hourly")).toHaveLength(0);
  });

  it("returns exactly the ticks that fall within [from+1tick, to]", () => {
    const from = new Date("2026-01-15T10:00:00.000Z").getTime();
    const to = new Date("2026-01-15T13:00:00.000Z").getTime();
    const ticks = missedTicks(from, to, "hourly");
    expect(ticks).toHaveLength(3); // 11:00, 12:00, 13:00
  });

  it("includes the boundary tick when to equals a tick timestamp", () => {
    const from = new Date("2026-01-15T10:00:00.000Z").getTime();
    const boundary = new Date("2026-01-15T11:00:00.000Z").getTime();
    const ticks = missedTicks(from, boundary, "hourly");
    expect(ticks).toContain(boundary);
  });

  it("returns ticks in ascending order", () => {
    const from = new Date("2026-01-15T08:00:00.000Z").getTime();
    const to = new Date("2026-01-15T12:00:00.000Z").getTime();
    const ticks = missedTicks(from, to, "hourly");
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
    }
  });

  it("works for daily cadence across a week", () => {
    const from = new Date("2026-01-01T00:00:00.000Z").getTime();
    const to = new Date("2026-01-08T00:00:00.000Z").getTime();
    const ticks = missedTicks(from, to, "daily");
    expect(ticks).toHaveLength(7); // Jan 2–8
  });

  it("works for monthly cadence across a quarter", () => {
    const from = new Date("2026-01-01T00:00:00.000Z").getTime();
    const to = new Date("2026-04-01T00:00:00.000Z").getTime();
    const ticks = missedTicks(from, to, "monthly");
    expect(ticks).toHaveLength(3); // Feb 1, Mar 1, Apr 1
  });
});

// ── isExpired ─────────────────────────────────────────────────────────────────

describe("isExpired", () => {
  const config: StreamConfig = {
    streamId: "s1",
    cadence: "daily",
    startedAt: T,
    endsAt: T + 7 * 24 * 60 * 60 * 1000, // 7 days later
  };

  it("returns false before endsAt", () => {
    expect(isExpired(config, T + 1000)).toBe(false);
  });

  it("returns true at exactly endsAt", () => {
    expect(isExpired(config, config.endsAt)).toBe(true);
  });

  it("returns true after endsAt", () => {
    expect(isExpired(config, config.endsAt + 1)).toBe(true);
  });
});

// ── tickId ────────────────────────────────────────────────────────────────────

describe("tickId", () => {
  it("formats as streamId:sequence", () => {
    expect(tickId("stream-abc", 0)).toBe("stream-abc:0");
    expect(tickId("stream-abc", 42)).toBe("stream-abc:42");
  });

  it("produces unique IDs for different sequences", () => {
    const ids = new Set([0, 1, 2, 99].map((n) => tickId("s1", n)));
    expect(ids.size).toBe(4);
  });

  it("produces unique IDs for different stream IDs", () => {
    const ids = new Set(["s1", "s2", "s3"].map((id) => tickId(id, 0)));
    expect(ids.size).toBe(3);
  });
});

// ── sleepDurationMs ───────────────────────────────────────────────────────────

describe("sleepDurationMs", () => {
  it("returns positive ms when next tick is in the future", () => {
    const now = T;
    const next = T + 5000;
    expect(sleepDurationMs(now, next)).toBe(5000);
  });

  it("returns 0 when next tick is in the past (catch-up)", () => {
    const now = T + 10000;
    const next = T;
    expect(sleepDurationMs(now, next)).toBe(0);
  });

  it("returns 0 when now equals next tick", () => {
    expect(sleepDurationMs(T, T)).toBe(0);
  });
});
