import type { Event } from "@/types/events";

export type MarketCalendarEventType = "closing" | "resolution";

export interface MarketCalendarEvent {
  id: string;
  uid: string;
  marketId: string;
  marketTitle: string;
  type: MarketCalendarEventType;
  date: Date;
  summary: string;
  description: string;
  url: string;
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createMarketCalendarEvents(
  markets: Event[],
): MarketCalendarEvent[] {
  return markets.flatMap((market) => {
    const deadlines: MarketCalendarEvent[] = [
      {
        id: `${market.id}-closing`,
        uid: `${encodeURIComponent(market.id)}-closing@predictify`,
        marketId: market.id,
        marketTitle: market.title,
        type: "closing",
        date: new Date(market.endDate),
        summary: `Market closes: ${market.title}`,
        description: `Closing deadline for the ${market.category} market "${market.title}".`,
        url: `/markets/${encodeURIComponent(market.id)}`,
      },
    ];

    if (market.resolutionDate) {
      deadlines.push({
        id: `${market.id}-resolution`,
        uid: `${encodeURIComponent(market.id)}-resolution@predictify`,
        marketId: market.id,
        marketTitle: market.title,
        type: "resolution",
        date: new Date(market.resolutionDate),
        summary: `Market resolves: ${market.title}`,
        description: `Resolution date for the ${market.category} market "${market.title}".`,
        url: `/markets/${encodeURIComponent(market.id)}`,
      });
    }

    return deadlines;
  });
}

export function groupCalendarEventsByLocalDay(
  events: MarketCalendarEvent[],
): Map<string, MarketCalendarEvent[]> {
  const groups = new Map<string, MarketCalendarEvent[]>();

  for (const event of [...events].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  )) {
    const key = localDateKey(event.date);
    const dayEvents = groups.get(key);
    if (dayEvents) dayEvents.push(event);
    else groups.set(key, [event]);
  }

  return groups;
}

export function buildMonthGrid(month: Date, weekStartsOn = 0): Date[] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (firstDay.getDay() - weekStartsOn + 7) % 7;
  const start = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth(),
    firstDay.getDate() - offset,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function listAgendaEvents(
  events: MarketCalendarEvent[],
  month: Date,
): MarketCalendarEvent[] {
  return events
    .filter(
      ({ date }) =>
        date.getFullYear() === month.getFullYear() &&
        date.getMonth() === month.getMonth(),
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function shiftMonth(date: Date, amount: number): Date {
  const targetMonth = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0,
  ).getDate();

  return new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth(),
    Math.min(date.getDate(), lastDay),
  );
}
