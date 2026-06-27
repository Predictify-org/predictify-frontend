import React from "react"
import { render, screen, within, fireEvent, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EventsTable } from "../events-table"
import type { Event } from "@/types/events"

// Mock window.matchMedia (not available in jsdom)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// ── Stable time helpers so progress bars render deterministically ──────────
jest.mock("@/lib/events-store", () => ({
  useEventsStore: jest.fn((selector?: (s: ReturnType<typeof mockStoreState>) => unknown) =>
    selector ? selector(mockStoreState()) : mockStoreState()
  ),
  formatTimeRemaining: jest.fn(() => "30d 0h"),
  getTimeRemainingColor: jest.fn(() => "green"),
}))

jest.mock("@/lib/compare-store", () => ({
  useCompareStore: jest.fn(() => ({ selectedIds: [], toggle: jest.fn() })),
  MAX_COMPARE: 2,
}))

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const now = Date.now()

const MOCK_EVENTS: Event[] = [
  {
    id: "e1",
    title: "Will Team A win the championship?",
    txHash: "TX001",
    category: "Football",
    odds: 65,
    startDate: new Date(now - 30 * ONE_DAY_MS).toISOString(),
    endDate: new Date(now + 30 * ONE_DAY_MS).toISOString(),
    status: "ongoing",
    timeRemainingMs: 30 * ONE_DAY_MS,
    participants: 1200,
  },
  {
    id: "e2",
    title: "Next election outcome",
    txHash: "TX002",
    category: "Politics",
    odds: 48,
    startDate: new Date(now - 10 * ONE_DAY_MS).toISOString(),
    endDate: new Date(now + 60 * ONE_DAY_MS).toISOString(),
    status: "ongoing",
    timeRemainingMs: 60 * ONE_DAY_MS,
    participants: 530,
  },
  {
    id: "e3",
    title: "BTC above $100k?",
    txHash: "TX003",
    category: "Crypto",
    odds: 72,
    startDate: new Date(now - 5 * ONE_DAY_MS).toISOString(),
    endDate: new Date(now + 3 * ONE_DAY_MS).toISOString(),
    status: "ongoing",
    timeRemainingMs: 3 * ONE_DAY_MS,
    participants: 8900,
  },
  {
    id: "e4",
    title: "TSLA stock above $500?",
    txHash: "TX004",
    category: "Stocks",
    odds: 33,
    startDate: new Date(now - 2 * ONE_DAY_MS).toISOString(),
    endDate: new Date(now + 45 * ONE_DAY_MS).toISOString(),
    status: "ongoing",
    timeRemainingMs: 45 * ONE_DAY_MS,
    participants: 320,
  },
]

function mockStoreState() {
  return {
    filteredEvents: MOCK_EVENTS,
    loading: false,
    pagination: { page: 1, pageSize: 10, total: MOCK_EVENTS.length },
    deleteEvent: jest.fn(),
  }
}

// Re-mock for each test so state is fresh
beforeEach(() => {
  const { useEventsStore } = require("@/lib/events-store")
  useEventsStore.mockImplementation((selector?: (s: ReturnType<typeof mockStoreState>) => unknown) =>
    selector ? selector(mockStoreState()) : mockStoreState()
  )
})

// ─────────────────────────────────────────────────────────────────────────────
describe("EventsTable — accessibility", () => {
  it("renders a <table> with a caption / accessible column headers", () => {
    render(<EventsTable />)
    expect(screen.getByRole("table")).toBeInTheDocument()
    // Column headers via role=columnheader
    const cols = screen.getAllByRole("columnheader")
    const colNames = cols.map((c) => c.textContent?.trim())
    expect(colNames).toEqual(
      expect.arrayContaining(["Event Title", "Category", "Odds", "End Date", "Time Remaining", "Participants", "Actions"])
    )
  })

  it("renders one row per event plus the header row", () => {
    render(<EventsTable />)
    const rows = screen.getAllByRole("row")
    // 1 header row + MOCK_EVENTS.length data rows
    expect(rows).toHaveLength(MOCK_EVENTS.length + 1)
  })

  describe("Category badges — not color alone", () => {
    it.each([
      ["Football", "Football"],
      ["Politics", "Politics"],
      ["Crypto", "Crypto"],
      ["Stocks", "Stocks"],
    ])("badge for %s category includes a visible icon and text label", (category) => {
      render(<EventsTable />)
      // Find the badge by its text content; confirm the icon is present (aria-hidden svg)
      const badge = screen.getByText(category)
      expect(badge).toBeInTheDocument()
      // The badge's parent contains an svg (the icon)
      const badgeEl = badge.closest(".inline-flex, span, div") ?? badge.parentElement
      const svg = badgeEl?.querySelector("svg")
      expect(svg).not.toBeNull()
      // Icon should be aria-hidden so screen readers rely on the text label
      expect(svg).toHaveAttribute("aria-hidden", "true")
    })
  })

  describe("TimeRemainingProgress — progressbar semantics", () => {
    it("renders a progressbar role for each event with timeRemainingMs", () => {
      render(<EventsTable />)
      const bars = screen.getAllByRole("progressbar")
      // All 4 mock events have timeRemainingMs
      expect(bars).toHaveLength(MOCK_EVENTS.length)
    })

    it("progressbar has aria-valuemin, aria-valuemax, aria-valuenow", () => {
      render(<EventsTable />)
      const bars = screen.getAllByRole("progressbar")
      bars.forEach((bar) => {
        expect(bar).toHaveAttribute("aria-valuemin", "0")
        expect(bar).toHaveAttribute("aria-valuemax", "100")
        expect(bar).toHaveAttribute("aria-valuenow")
        const now = Number(bar.getAttribute("aria-valuenow"))
        expect(now).toBeGreaterThanOrEqual(0)
        expect(now).toBeLessThanOrEqual(100)
      })
    })

    it("progressbar aria-label includes time and urgency level", () => {
      render(<EventsTable />)
      const bars = screen.getAllByRole("progressbar")
      bars.forEach((bar) => {
        const label = bar.getAttribute("aria-label") ?? ""
        expect(label).toMatch(/time remaining/i)
        expect(label).toMatch(/urgency/i)
      })
    })

    it("urgency is conveyed textually via sr-only span, not color alone", () => {
      render(<EventsTable />)
      // sr-only spans announce urgency to screen readers
      const srOnlySpans = document.querySelectorAll(".sr-only")
      const urgencySpans = Array.from(srOnlySpans).filter((el) =>
        /urgency/i.test(el.textContent ?? "")
      )
      expect(urgencySpans.length).toBeGreaterThan(0)
    })
  })

  describe("Actions dropdown — accessible controls", () => {
    it("actions trigger button has an accessible label via sr-only text", () => {
      render(<EventsTable />)
      const actionBtns = screen.getAllByRole("button", { name: /open actions menu/i })
      expect(actionBtns.length).toBeGreaterThan(0)
    })

    it("actions menu contains Edit and Delete options", async () => {
      render(<EventsTable />)
      const [firstActionBtn] = screen.getAllByRole("button", { name: /open actions menu/i })
      await userEvent.click(firstActionBtn)
      expect(await screen.findByRole("menuitem", { name: /edit event/i })).toBeInTheDocument()
      expect(await screen.findByRole("menuitem", { name: /delete event/i })).toBeInTheDocument()
    })
  })

  describe("Empty state", () => {
    it("renders an informative empty-state message when no events", () => {
      const { useEventsStore } = require("@/lib/events-store")
      const emptyState = { ...mockStoreState(), filteredEvents: [] }
      useEventsStore.mockImplementation(
        (selector?: (s: typeof emptyState) => unknown) =>
          selector ? selector(emptyState) : emptyState
      )
      render(<EventsTable />)
      expect(screen.getByText(/no events found/i)).toBeInTheDocument()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("EventsTable — HoverTooltip on event title", () => {
  beforeEach(() => {
    const { useEventsStore } = require("@/lib/events-store")
    useEventsStore.mockImplementation((selector?: (s: ReturnType<typeof mockStoreState>) => unknown) =>
      selector ? selector(mockStoreState()) : mockStoreState()
    )
  })

  it("event title cell has cursor-help indicating tooltip availability", () => {
    render(<EventsTable />)
    const titleEl = screen.getByText("Will Team A win the championship?")
    // Traverse up to the wrapper div that has cursor-help
    const wrapper = titleEl.closest(".cursor-help")
    expect(wrapper).toBeInTheDocument()
  })

  it("tooltip is not visible before hover", () => {
    render(<EventsTable />)
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
  })

  it("tooltip appears with key event data on mouseenter after delay", async () => {
    jest.useFakeTimers()
    render(<EventsTable />)
    const titleEl = screen.getByText("Will Team A win the championship?")
    const triggerSpan = titleEl.closest("span[aria-describedby]") as HTMLElement
    expect(triggerSpan).toBeInTheDocument()

    fireEvent.mouseEnter(triggerSpan)
    // Tooltip should not be visible before delay
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()

    // Advance past the 300ms hoverDelay
    act(() => { jest.advanceTimersByTime(350) })

    const tooltip = screen.getByRole("tooltip")
    expect(tooltip).toBeInTheDocument()
    expect(tooltip).toHaveTextContent(/Category/i)
    expect(tooltip).toHaveTextContent(/Football/i)
    expect(tooltip).toHaveTextContent(/Participants/i)

    jest.useRealTimers()
  })

  it("tooltip disappears on mouseleave", () => {
    jest.useFakeTimers()
    render(<EventsTable />)
    const titleEl = screen.getByText("Will Team A win the championship?")
    const triggerSpan = titleEl.closest("span[aria-describedby]") as HTMLElement

    fireEvent.mouseEnter(triggerSpan)
    act(() => { jest.advanceTimersByTime(350) })
    expect(screen.getByRole("tooltip")).toBeInTheDocument()

    fireEvent.mouseLeave(triggerSpan)
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()

    jest.useRealTimers()
  })

  it("tooltip is linked via aria-describedby for accessibility", () => {
    jest.useFakeTimers()
    render(<EventsTable />)
    const titleEl = screen.getByText("Will Team A win the championship?")
    const triggerSpan = titleEl.closest("span[aria-describedby]") as HTMLElement

    fireEvent.mouseEnter(triggerSpan)
    act(() => { jest.advanceTimersByTime(350) })

    const tooltip = screen.getByRole("tooltip")
    const tooltipId = tooltip.getAttribute("id")
    expect(triggerSpan.getAttribute("aria-describedby")).toBe(tooltipId)

    jest.useRealTimers()
  })

  it("tooltip appears on focus (keyboard navigation)", () => {
    render(<EventsTable />)
    const titleEl = screen.getByText("Will Team A win the championship?")
    const triggerSpan = titleEl.closest("span[aria-describedby]") as HTMLElement

    fireEvent.focus(triggerSpan)
    expect(screen.getByRole("tooltip")).toBeInTheDocument()

    fireEvent.blur(triggerSpan)
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
  })
})
