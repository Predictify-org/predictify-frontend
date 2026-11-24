"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/app/components/EmptyState";
import {
  buildMonthGrid,
  createMarketCalendarEvents,
  groupCalendarEventsByLocalDay,
  listAgendaEvents,
  localDateKey,
  shiftMonth,
  type MarketCalendarEvent,
} from "@/lib/calendar";
import { buildIcs } from "@/lib/ics";
import { useEventsStore } from "@/lib/events-store";

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

type CalendarView = "month" | "agenda";

function downloadIcs(events: MarketCalendarEvent[], filename: string): void {
  const absoluteEvents = events.map((event) => ({
    ...event,
    url: new URL(event.url, window.location.origin).toString(),
  }));
  const content = buildIcs(absoluteEvents, {
    prodId: "-//Predictify//Market Calendar//EN",
  });
  const objectUrl = URL.createObjectURL(
    new Blob([content], { type: "text/calendar;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function eventKindLabel(event: MarketCalendarEvent): string {
  return event.type === "closing" ? "Closes" : "Resolves";
}

function CalendarEventRow({ event }: { event: MarketCalendarEvent }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {eventKindLabel(event)} · {TIME_FORMAT.format(event.date)}
        </p>
        <Link
          href={event.url}
          className="font-medium text-foreground hover:text-[#540D8D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#540D8D]"
        >
          {event.marketTitle}
        </Link>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() =>
          downloadIcs([event], `${event.marketId}-${event.type}.ics`)
        }
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Add to calendar
      </Button>
    </li>
  );
}

export default function MarketCalendarPage() {
  const markets = useEventsStore((state) => state.events);
  const calendarEvents = React.useMemo(
    () => createMarketCalendarEvents(markets),
    [markets],
  );
  const eventsByDay = React.useMemo(
    () => groupCalendarEventsByLocalDay(calendarEvents),
    [calendarEvents],
  );
  const [visibleMonth, setVisibleMonth] = React.useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [focusedDate, setFocusedDate] = React.useState(() => new Date());
  const [selectedDate, setSelectedDate] = React.useState(() => new Date());
  const [view, setView] = React.useState<CalendarView>("month");
  const buttonRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const pendingFocusKey = React.useRef<string | null>(null);

  React.useLayoutEffect(() => {
    if (!pendingFocusKey.current) return;
    buttonRefs.current.get(pendingFocusKey.current)?.focus();
    pendingFocusKey.current = null;
  }, [focusedDate]);

  const monthEvents = React.useMemo(
    () => listAgendaEvents(calendarEvents, visibleMonth),
    [calendarEvents, visibleMonth],
  );
  const agendaByDay = React.useMemo(
    () => groupCalendarEventsByLocalDay(monthEvents),
    [monthEvents],
  );
  const gridDays = React.useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const focusedKey = localDateKey(focusedDate);
  const selectedKey = localDateKey(selectedDate);
  const selectedEvents = eventsByDay.get(selectedKey) ?? [];
  const focusedEvents = eventsByDay.get(focusedKey) ?? [];
  const weekdayLabels = WEEKDAY_LABELS.map((label, index) => ({
    label,
    shortLabel: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
      new Date(2024, 0, 7 + index),
    ),
  }));

  const focusDate = (date: Date) => {
    const key = localDateKey(date);
    pendingFocusKey.current = key;
    setFocusedDate(date);
    setSelectedDate(date);
    if (
      date.getFullYear() !== visibleMonth.getFullYear() ||
      date.getMonth() !== visibleMonth.getMonth()
    ) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const navigateMonth = (amount: number) => {
    const nextFocus = shiftMonth(focusedDate, amount);
    setVisibleMonth(new Date(nextFocus.getFullYear(), nextFocus.getMonth(), 1));
    setFocusedDate(nextFocus);
    setSelectedDate(nextFocus);
  };

  const onDayKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    date: Date,
  ) => {
    let nextDate: Date | null = null;

    switch (event.key) {
      case "ArrowLeft":
        nextDate = new Date(date);
        nextDate.setDate(date.getDate() - 1);
        break;
      case "ArrowRight":
        nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        break;
      case "ArrowUp":
        nextDate = new Date(date);
        nextDate.setDate(date.getDate() - 7);
        break;
      case "ArrowDown":
        nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 7);
        break;
      case "Home":
      case "End": {
        nextDate = new Date(date);
        const offset = date.getDay();
        nextDate.setDate(
          date.getDate() + (event.key === "Home" ? -offset : 6 - offset),
        );
        break;
      }
      case "PageUp":
      case "PageDown":
        nextDate = shiftMonth(date, (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1));
        break;
      default:
        return;
    }

    event.preventDefault();
    focusDate(nextDate);
  };

  const monthName = MONTH_LABEL_FORMAT.format(visibleMonth);
  const hasMonthEvents = monthEvents.length > 0;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/markets"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Markets
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[#540D8D]">
            <CalendarDays className="h-6 w-6" aria-hidden="true" />
            Market deadline calendar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse market closing and resolution dates in your local time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-border p-1" aria-label="Calendar view">
            <Button
              type="button"
              size="sm"
              variant={view === "month" ? "secondary" : "ghost"}
              aria-pressed={view === "month"}
              onClick={() => setView("month")}
            >
              Month
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "agenda" ? "secondary" : "ghost"}
              aria-pressed={view === "agenda"}
              onClick={() => setView("agenda")}
            >
              Agenda
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const today = new Date();
              setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
              setFocusedDate(today);
              setSelectedDate(today);
            }}
          >
            Today
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Previous month"
            onClick={() => navigateMonth(-1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Next month"
            onClick={() => navigateMonth(1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!hasMonthEvents}
            onClick={() =>
              downloadIcs(monthEvents, `predictify-markets-${localDateKey(visibleMonth).slice(0, 7)}.ics`)
            }
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export month
          </Button>
        </div>
      </header>

      <h2 className="text-lg font-semibold" aria-live="polite">{monthName}</h2>

      {view === "month" ? (
        <div className="space-y-5">
          <div
            role="grid"
            aria-label={`${monthName} market deadlines`}
            className="overflow-hidden rounded-xl border border-border/70 bg-card/30"
          >
            <div role="row" className="grid grid-cols-7 border-b border-border/70">
              {weekdayLabels.map(({ label, shortLabel }) => (
                <div
                  key={label}
                  role="columnheader"
                  aria-label={label}
                  className="p-2 text-center text-xs font-medium text-muted-foreground sm:p-3"
                >
                  <span className="sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
              ))}
            </div>
            {Array.from({ length: 6 }, (_, weekIndex) => (
              <div
                key={weekIndex}
                role="row"
                className="grid grid-cols-7 border-b border-border/70 last:border-b-0"
              >
                {gridDays.slice(weekIndex * 7, weekIndex * 7 + 7).map((date) => {
                  const key = localDateKey(date);
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const inMonth = date.getMonth() === visibleMonth.getMonth();
                  const isToday = key === localDateKey(new Date());
                  return (
                    <div
                      key={key}
                      role="gridcell"
                      aria-selected={key === selectedKey}
                      className={`min-h-24 border-r border-border/60 p-1 last:border-r-0 sm:min-h-32 sm:p-2 ${
                        inMonth ? "" : "bg-muted/20 text-muted-foreground"
                      }`}
                    >
                      <button
                        ref={(node) => {
                          if (node) buttonRefs.current.set(key, node);
                          else buttonRefs.current.delete(key);
                        }}
                        type="button"
                        tabIndex={key === focusedKey ? 0 : -1}
                        aria-current={isToday ? "date" : undefined}
                        aria-label={`${DAY_LABEL_FORMAT.format(date)}, ${dayEvents.length} ${dayEvents.length === 1 ? "event" : "events"}`}
                        onFocus={() => setFocusedDate(date)}
                        onClick={() => setSelectedDate(date)}
                        onKeyDown={(event) => onDayKeyDown(event, date)}
                        className={`h-full min-h-20 w-full rounded-md p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#540D8D] sm:min-h-28 sm:p-2 ${
                          key === selectedKey ? "bg-[#540D8D]/10" : "hover:bg-muted/40"
                        }`}
                      >
                        <span className="flex items-center justify-between text-xs font-semibold">
                          {date.getDate()}
                          {dayEvents.length > 0 && (
                            <span className="rounded-full bg-[#540D8D]/10 px-1.5 py-0.5 text-[10px] text-[#540D8D]">
                              {dayEvents.length}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block space-y-1">
                          {dayEvents.slice(0, 2).map((calendarEvent) => (
                            <span
                              key={calendarEvent.id}
                              className={`block truncate rounded px-1 py-0.5 text-[10px] leading-tight ${
                                calendarEvent.type === "closing"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-emerald-100 text-emerald-900"
                              }`}
                            >
                              {eventKindLabel(calendarEvent)}: {calendarEvent.marketTitle}
                            </span>
                          ))}
                          {dayEvents.length > 2 && (
                            <span className="block text-[10px] text-muted-foreground">
                              +{dayEvents.length - 2} more
                            </span>
                          )}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {DAY_LABEL_FORMAT.format(focusedDate)}: {focusedEvents.length}{" "}
            {focusedEvents.length === 1 ? "event" : "events"}
          </p>

          {selectedEvents.length > 0 ? (
            <section aria-labelledby="selected-day-heading" className="space-y-3">
              <h3 id="selected-day-heading" className="text-base font-semibold">
                {DAY_LABEL_FORMAT.format(selectedDate)}
              </h3>
              <ul className="space-y-2">
                {selectedEvents.map((event) => (
                  <CalendarEventRow key={event.id} event={event} />
                ))}
              </ul>
            </section>
          ) : !hasMonthEvents ? (
            <EmptyState
              icon={<CalendarDays className="h-8 w-8" aria-hidden="true" />}
              title="No market deadlines this month"
              description="Try another month to browse scheduled market closes and resolutions."
            />
          ) : null}
        </div>
      ) : hasMonthEvents ? (
        <div className="space-y-6">
          {[...agendaByDay.entries()].map(([key, dayEvents]) => (
            <section key={key} aria-labelledby={`agenda-${key}`}>
              <h3 id={`agenda-${key}`} className="mb-2 font-semibold">
                {DAY_LABEL_FORMAT.format(dayEvents[0].date)}
              </h3>
              <ul className="space-y-2">
                {dayEvents.map((event) => (
                  <CalendarEventRow key={event.id} event={event} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" aria-hidden="true" />}
          title="No market deadlines this month"
          description="Try another month to browse scheduled market closes and resolutions."
        />
      )}
    </main>
  );
}
