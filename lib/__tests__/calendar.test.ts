import {
  buildMonthGrid,
  createMarketCalendarEvents,
  groupCalendarEventsByLocalDay,
  listAgendaEvents,
  localDateKey,
} from "@/lib/calendar";
import type { Event } from "@/types/events";

const market = (overrides: Partial<Event> = {}): Event => ({
  id: "market-1",
  title: "Calendar test market",
  txHash: "hash",
  category: "Crypto",
  odds: 2,
  startDate: "2024-02-01T00:00:00.000Z",
  endDate: "2024-02-29T23:59:00.000Z",
  status: "ongoing",
  participants: 1,
  ...overrides,
});

describe("market calendar helpers", () => {
  it("builds a six-week grid that includes leap day and adjacent-month dates", () => {
    const grid = buildMonthGrid(new Date(2024, 1, 15));

    expect(grid).toHaveLength(42);
    expect(grid.some((date) => localDateKey(date) === "2024-02-29")).toBe(true);
    expect(grid[0].getDay()).toBe(0);
    expect(grid[41].getMonth()).toBe(2);
  });

  it("groups close and explicit resolution deadlines by the user's local day", () => {
    const events = createMarketCalendarEvents([
      market({ resolutionDate: "2024-03-01T04:30:00.000Z" }),
    ]);
    const groups = groupCalendarEventsByLocalDay(events);
    const expectedResolutionDay = localDateKey(events[1].date);

    expect(groups.get(localDateKey(events[0].date))?.[0].type).toBe("closing");
    expect(groups.get(expectedResolutionDay)?.some(({ type }) => type === "resolution")).toBe(true);
  });

  it("keeps a deadline at 23:59 on the correct local day across DST", () => {
    const localDeadline = new Date(2024, 2, 10, 23, 59);
    const [closing] = createMarketCalendarEvents([
      market({ endDate: localDeadline.toISOString() }),
    ]);

    expect(localDateKey(closing.date)).toBe("2024-03-10");
  });

  it("lists only the requested month in chronological order", () => {
    const events = createMarketCalendarEvents([
      market({
        id: "later",
        endDate: "2024-02-29T23:59:00.000Z",
        resolutionDate: "2024-03-01T00:00:00.000Z",
      }),
      market({ id: "earlier", endDate: "2024-02-10T12:00:00.000Z" }),
    ]);
    const february = listAgendaEvents(events, new Date(2024, 1, 1));

    expect(february.map(({ date }) => date.getTime())).toEqual(
      [...february.map(({ date }) => date.getTime())].sort((a, b) => a - b),
    );
    expect(february.every(({ date }) => date.getMonth() === 1)).toBe(true);
  });

  it("returns an empty agenda for a month with no deadlines", () => {
    expect(listAgendaEvents([], new Date(2026, 0, 1))).toEqual([]);
  });
});
