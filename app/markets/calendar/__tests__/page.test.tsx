import { fireEvent, render, screen, within } from "@testing-library/react";
import MarketCalendarPage from "@/app/markets/calendar/page";
import { useEventsStore } from "@/lib/events-store";
import type { Event } from "@/types/events";

const calendarMarket: Event = {
  id: "calendar-market",
  title: "February market",
  txHash: "hash",
  category: "Crypto",
  odds: 2,
  startDate: "2026-02-01T00:00:00.000Z",
  endDate: "2026-02-02T12:00:00.000Z",
  status: "ongoing",
  participants: 1,
};

describe("MarketCalendarPage", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 1, 1, 12));
    useEventsStore.setState({ events: [calendarMarket] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders a six-week grid and moves focus with arrow keys", () => {
    render(<MarketCalendarPage />);
    const grid = screen.getByRole("grid");
    const rows = within(grid).getAllByRole("row");
    const today = grid.querySelector('[aria-current="date"]');

    expect(rows).toHaveLength(7);
    expect(today).not.toBeNull();
    expect(today).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(today as HTMLElement, { key: "ArrowRight" });

    expect(document.activeElement).toHaveAttribute("aria-label", expect.stringContaining("1 event"));
    expect(screen.getByText(/: 1 event$/)).toBeInTheDocument();
  });

  it("switches to a chronological agenda with per-event calendar actions", () => {
    render(<MarketCalendarPage />);
    fireEvent.click(screen.getByRole("button", { name: "Agenda" }));

    expect(screen.getByText("February market")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to calendar" })).toBeInTheDocument();
  });
});
