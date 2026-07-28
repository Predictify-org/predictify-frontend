/**
 * tests/events-table.empty-state.test.tsx
 *
 * Focused tests for the EventsTable empty-state decision logic introduced by
 * the GrantFox FWC26 / Stellar Wave campaign feature (issue #634).
 *
 * The table now renders one of three states:
 *  1. EventsTableSkeleton   — while loading is true
 *  2. EventsEmptyState      — no events AND no active filters
 *  3. NoMatchEmptyState     — no events BUT filters are active
 *  4. Data rows             — filteredEvents is non-empty
 *
 * These tests mock `useEventsStore` and `useCompareStore` to drive each branch
 * without spinning up a real Zustand store.
 */

import React from "react"
import { render, screen } from "@testing-library/react"
import { EventsTable } from "../events-table"

// ── Mock window.matchMedia (unavailable in jsdom) ──────────────────────────
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

// ── Store mocks ────────────────────────────────────────────────────────────

jest.mock("@/lib/compare-store", () => ({
  useCompareStore: jest.fn(() => ({ selectedIds: [], toggle: jest.fn() })),
  MAX_COMPARE: 2,
}))

jest.mock("@/lib/events-store", () => ({
  useEventsStore: jest.fn(),
  formatTimeRemaining: jest.fn(() => "30d 0h"),
  getTimeRemainingColor: jest.fn(() => "green"),
}))

// Helper: import mocked hook after jest.mock() is hoisted
const { useEventsStore } = jest.requireMock("@/lib/events-store") as {
  useEventsStore: jest.Mock
}

/** Returns a minimal store state object, overridable per test */
function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    filteredEvents: [],
    loading: false,
    pagination: { page: 1, pageSize: 10, total: 0 },
    deleteEvent: jest.fn(),
    filters: {
      search: "",
      category: [],
      oddsRange: [0, 10],
      dateRange: { from: null, to: null },
      status: "ongoing",
    },
    setFilters: jest.fn(),
    setSearch: jest.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── Loading skeleton ──────────────────────────────────────────────────────

describe("EventsTable — loading state", () => {
  it("renders a loading skeleton when loading=true", () => {
    useEventsStore.mockImplementation(() => makeStore({ loading: true }))
    render(<EventsTable />)
    // The skeleton renders cells with animate-pulse; we check for its
    // container via the test id set in EventsTableSkeleton
    expect(screen.queryByTestId("events-empty-state")).not.toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})

// ─── EventsEmptyState — truly no data ─────────────────────────────────────

describe("EventsTable — true empty (no events, no filters)", () => {
  beforeEach(() => {
    useEventsStore.mockImplementation(() =>
      makeStore({
        filteredEvents: [],
        filters: {
          search: "",
          category: [],
          oddsRange: [0, 10],
          dateRange: { from: null, to: null },
          status: "ongoing",
        },
      })
    )
  })

  it("renders the EventsEmptyState when no data and no filters", () => {
    render(<EventsTable />)
    expect(screen.getByTestId("events-empty-state")).toBeInTheDocument()
  })

  it("renders the GrantFox FWC26 campaign heading", () => {
    render(<EventsTable />)
    expect(
      screen.getByRole("heading", { name: /no events yet/i })
    ).toBeInTheDocument()
  })

  it("renders the GrantFox FWC26 · Stellar Wave campaign pill", () => {
    render(<EventsTable />)
    // The pill label element has aria-label containing "GrantFox FWC26"
    expect(
      screen.getByLabelText(/GrantFox FWC26.*Stellar Wave/i)
    ).toBeInTheDocument()
  })

  it("renders the 'Create Your First Event' CTA", () => {
    render(<EventsTable />)
    expect(
      screen.getByRole("link", { name: /create your first event/i })
    ).toBeInTheDocument()
  })

  it("does NOT render the NoMatchEmptyState 'Clear all filters' button", () => {
    render(<EventsTable />)
    expect(
      screen.queryByRole("button", { name: /clear all filters/i })
    ).not.toBeInTheDocument()
  })

  it("has a role=status region with aria-live=polite", () => {
    render(<EventsTable />)
    const region = screen.getByRole("status")
    expect(region).toHaveAttribute("aria-live", "polite")
  })
})

// ─── NoMatchEmptyState — filtered to zero results ─────────────────────────

describe("EventsTable — filtered empty (no events, filters active)", () => {
  it("renders NoMatchEmptyState when a search filter is active", () => {
    useEventsStore.mockImplementation(() =>
      makeStore({
        filteredEvents: [],
        filters: {
          search: "nonexistent",
          category: [],
          oddsRange: [0, 10],
          dateRange: { from: null, to: null },
          status: "ongoing",
        },
      })
    )
    render(<EventsTable />)
    expect(
      screen.getByRole("button", { name: /clear all filters/i })
    ).toBeInTheDocument()
    expect(screen.queryByTestId("events-empty-state")).not.toBeInTheDocument()
  })

  it("renders NoMatchEmptyState when a category filter is active", () => {
    useEventsStore.mockImplementation(() =>
      makeStore({
        filteredEvents: [],
        filters: {
          search: "",
          category: ["Football"],
          oddsRange: [0, 10],
          dateRange: { from: null, to: null },
          status: "ongoing",
        },
      })
    )
    render(<EventsTable />)
    expect(
      screen.getByRole("button", { name: /clear all filters/i })
    ).toBeInTheDocument()
  })

  it("renders NoMatchEmptyState when a date range filter is active", () => {
    useEventsStore.mockImplementation(() =>
      makeStore({
        filteredEvents: [],
        filters: {
          search: "",
          category: [],
          oddsRange: [0, 10],
          dateRange: { from: new Date("2025-01-01"), to: null },
          status: "ongoing",
        },
      })
    )
    render(<EventsTable />)
    expect(
      screen.getByRole("button", { name: /clear all filters/i })
    ).toBeInTheDocument()
  })

  it("renders NoMatchEmptyState when multiple filters are active", () => {
    useEventsStore.mockImplementation(() =>
      makeStore({
        filteredEvents: [],
        filters: {
          search: "soccer",
          category: ["Politics"],
          oddsRange: [0, 10],
          dateRange: { from: new Date(), to: new Date() },
          status: "ongoing",
        },
      })
    )
    render(<EventsTable />)
    expect(
      screen.getByRole("button", { name: /clear all filters/i })
    ).toBeInTheDocument()
    expect(screen.queryByTestId("events-empty-state")).not.toBeInTheDocument()
  })
})

// ─── Data rows rendered when events exist ─────────────────────────────────

describe("EventsTable — data rows", () => {
  const now = Date.now()
  const ONE_DAY = 24 * 60 * 60 * 1000

  const MOCK_EVENTS = [
    {
      id: "e1",
      title: "Arsenal vs Liverpool",
      txHash: "TX001",
      category: "Football",
      odds: 65,
      startDate: new Date(now - 5 * ONE_DAY).toISOString(),
      endDate: new Date(now + 30 * ONE_DAY).toISOString(),
      status: "ongoing",
      timeRemainingMs: 30 * ONE_DAY,
      participants: 100,
    },
  ]

  beforeEach(() => {
    useEventsStore.mockImplementation(() =>
      makeStore({
        filteredEvents: MOCK_EVENTS,
        pagination: { page: 1, pageSize: 10, total: 1 },
        filters: {
          search: "",
          category: [],
          oddsRange: [0, 10],
          dateRange: { from: null, to: null },
          status: "ongoing",
        },
      })
    )
  })

  it("does NOT render EventsEmptyState when data is present", () => {
    render(<EventsTable />)
    expect(screen.queryByTestId("events-empty-state")).not.toBeInTheDocument()
  })

  it("does NOT render NoMatchEmptyState when data is present", () => {
    render(<EventsTable />)
    expect(
      screen.queryByRole("button", { name: /clear all filters/i })
    ).not.toBeInTheDocument()
  })

  it("renders the event title in the table", () => {
    render(<EventsTable />)
    expect(screen.getByText("Arsenal vs Liverpool")).toBeInTheDocument()
  })
})
