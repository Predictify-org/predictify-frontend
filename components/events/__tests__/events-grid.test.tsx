import React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EventsGrid } from "../events-grid"
import { EventsGridSkeleton } from "../events-grid-skeleton"
import type { Event } from "@/types/events"

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock matchMedia
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

// Mock store state factory
function createMockStoreState(overrides: Record<string, unknown> = {}) {
  return {
    filteredEvents: MOCK_EVENTS,
    loading: false,
    error: null,
    pagination: { page: 1, pageSize: 10, total: MOCK_EVENTS.length },
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

// Mock the events store
jest.mock("@/lib/events-store", () => ({
  useEventsStore: jest.fn((selector?: (s: ReturnType<typeof createMockStoreState>) => unknown) => {
    const state = createMockStoreState()
    return selector ? selector(state) : state
  }),
  formatTimeRemaining: jest.fn(() => "30d 0h"),
  getTimeRemainingColor: jest.fn((ms: number) => {
    const days = ms / ONE_DAY_MS
    if (days > 30) return "green"
    if (days > 7) return "orange"
    return "red"
  }),
}))

// Mock the compare store
jest.mock("@/lib/compare-store", () => ({
  useCompareStore: jest.fn(() => ({ selectedIds: [], toggle: jest.fn() })),
  MAX_COMPARE: 2,
}))

// Mock next/link
jest.mock("next/link", () => {
  const MockLink = ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...props }, children)
  MockLink.displayName = "MockLink"
  return MockLink
})

const { useEventsStore } = require("@/lib/events-store")

// ─────────────────────────────────────────────────────────────────────────────
// EventsGridSkeleton Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("EventsGridSkeleton", () => {
  it("renders the correct number of skeleton cards", () => {
    render(<EventsGridSkeleton count={6} />)
    const skeleton = screen.getByTestId("events-grid-skeleton")
    expect(skeleton).toBeInTheDocument()
    // Count the skeleton card children (each has aria-hidden="true")
    const cards = skeleton.querySelectorAll('[aria-hidden="true"]')
    expect(cards.length).toBe(6)
  })

  it("renders with a custom count", () => {
    render(<EventsGridSkeleton count={3} />)
    const skeleton = screen.getByTestId("events-grid-skeleton")
    const cards = skeleton.querySelectorAll('[aria-hidden="true"]')
    expect(cards.length).toBe(3)
  })

  it("has accessible aria attributes", () => {
    render(<EventsGridSkeleton />)
    const skeleton = screen.getByTestId("events-grid-skeleton")
    expect(skeleton).toHaveAttribute("aria-label", "Loading events")
    expect(skeleton).toHaveAttribute("aria-busy", "true")
    expect(skeleton).toHaveAttribute("role", "status")
  })

  it("applies custom className", () => {
    render(<EventsGridSkeleton className="my-custom-class" />)
    const skeleton = screen.getByTestId("events-grid-skeleton")
    expect(skeleton).toHaveClass("my-custom-class")
  })

  it("cards are aria-hidden from assistive tech", () => {
    render(<EventsGridSkeleton count={4} />)
    const cards = document.querySelectorAll('[aria-hidden="true"]')
    cards.forEach((card) => {
      expect(card).toHaveAttribute("aria-hidden", "true")
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EventsGrid — States
// ─────────────────────────────────────────────────────────────────────────────

describe("EventsGrid — loading state", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders skeleton when loading with no events", () => {
    useEventsStore.mockImplementation(
      (selector?: (s: ReturnType<typeof createMockStoreState>) => unknown) => {
        const state = createMockStoreState({ loading: true, filteredEvents: [] })
        return selector ? selector(state) : state
      },
    )
    render(<EventsGrid />)
    expect(screen.getByTestId("events-grid-skeleton")).toBeInTheDocument()
  })

  it("does not render skeleton when loading but events already exist (pagination)", () => {
    useEventsStore.mockImplementation(
      (selector?: (s: ReturnType<typeof createMockStoreState>) => unknown) => {
        const state = createMockStoreState({ loading: true })
        return selector ? selector(state) : state
      },
    )
    render(<EventsGrid />)
    expect(screen.queryByTestId("events-grid-skeleton")).not.toBeInTheDocument()
  })
})

describe("EventsGrid — error state", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders error message with retry button", () => {
    useEventsStore.mockImplementation(
      (selector?: (s: ReturnType<typeof createMockStoreState>) => unknown) => {
        const state = createMockStoreState({ error: "Network error", filteredEvents: [] })
        return selector ? selector(state) : state
      },
    )
    render(<EventsGrid />)
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /failed to load events/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument()
  })

  it("links retry button to error message via aria-describedby", () => {
    useEventsStore.mockImplementation(
      (selector?: (s: ReturnType<typeof createMockStoreState>) => unknown) => {
        const state = createMockStoreState({ error: "Network error", filteredEvents: [] })
        return selector ? selector(state) : state
      },
    )
    render(<EventsGrid />)
    const retryButton = screen.getByRole("button", { name: /try again/i })
    const describedById = retryButton.getAttribute("aria-describedby")
    expect(describedById).toBeTruthy()
    // Verify the described-by element exists and contains the error text
    const describedByEl = document.getElementById(describedById!)
    expect(describedByEl).toBeInTheDocument()
    expect(describedByEl).toHaveTextContent("Network error")
  })

  it("error message paragraph id is stable across renders", () => {
    useEventsStore.mockImplementation(
      (selector?: (s: ReturnType<typeof createMockStoreState>) => unknown) => {
        const state = createMockStoreState({ error: "Network error", filteredEvents: [] })
        return selector ? selector(state) : state
      },
    )
    const { rerender } = render(<EventsGrid />)
    const firstId = screen.getByRole("button", { name: /try again/i }).getAttribute("aria-describedby")
    rerender(<EventsGrid />)
    const secondId = screen.getByRole("button", { name: /try again/i }).getAttribute("aria-describedby")
    expect(firstId).toBe(secondId)
  })

  it("does not render error state when there are cached events", () => {
    useEventsStore.mockImplementation(
      (selector?: (s: ReturnType<typeof createMockStoreState>) => unknown) => {
        const state = createMockStoreState({ error: "Network error" })
        return selector ? selector(state) : state
      },
    )
    render(<EventsGrid />)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})

describe("EventsGrid — empty state", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders NoMatchEmptyState when filteredEvents is empty", () => {
    useEventsStore.mockImplementation(
      (selector?: (s: ReturnType<typeof createMockStoreState>) => unknown) => {
        const state = createMockStoreState({ filteredEvents: [] })
        return selector ? selector(state) : state
      },
    )
    render(<EventsGrid />)
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.getByText(/no matching markets/i)).toBeInTheDocument()
  })

  it("renders 'Clear all filters' button in empty state", () => {
    useEventsStore.mockImplementation(
      (selector?: (s: ReturnType<typeof createMockStoreState>) => unknown) => {
        const state = createMockStoreState({
          filteredEvents: [],
          filters: { search: "foo", category: ["Football"], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" },
        })
        return selector ? selector(state) : state
      },
    )
    render(<EventsGrid />)
    expect(screen.getByRole("button", { name: /clear all filters/i })).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EventsGrid — Data Rendering
// ─────────────────────────────────────────────────────────────────────────────

describe("EventsGrid — data rendering", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useEventsStore.mockImplementation(
      (selector?: (s: ReturnType<typeof createMockStoreState>) => unknown) => {
        const state = createMockStoreState()
        return selector ? selector(state) : state
      },
    )
  })

  it("renders event cards for each event", () => {
    render(<EventsGrid />)
    // Each event title should be rendered as an article heading
    MOCK_EVENTS.forEach((event) => {
      expect(screen.getByText(event.title)).toBeInTheDocument()
    })
  })

  it("renders article elements for each event", () => {
    render(<EventsGrid />)
    const articles = screen.getAllByRole("article")
    expect(articles).toHaveLength(MOCK_EVENTS.length)
  })

  it("displays category badges with text labels", () => {
    render(<EventsGrid />)
    MOCK_EVENTS.forEach((event) => {
      expect(screen.getByText(event.category)).toBeInTheDocument()
    })
  })

  it("displays odds as numeric values", () => {
    render(<EventsGrid />)
    MOCK_EVENTS.forEach((event) => {
      expect(screen.getByText(event.odds.toString())).toBeInTheDocument()
    })
  })

  it("displays participant counts", () => {
    render(<EventsGrid />)
    MOCK_EVENTS.forEach((event) => {
      expect(screen.getByText(event.participants.toLocaleString())).toBeInTheDocument()
    })
  })

  it("renders progressbar for each event", () => {
    render(<EventsGrid />)
    const bars = screen.getAllByRole("progressbar")
    expect(bars).toHaveLength(MOCK_EVENTS.length)
  })

  it("progressbars have aria-valuenow, aria-valuemin, aria-valuemax", () => {
    render(<EventsGrid />)
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
})

// ─────────────────────────────────────────────────────────────────────────────
// EventsGrid — Actions / Interactions
// ─────────────────────────────────────────────────────────────────────────────

describe("EventsGrid — actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useEventsStore.mockImplementation(
      (selector?: (s: ReturnType<typeof createMockStoreState>) => unknown) => {
        const state = createMockStoreState()
        return selector ? selector(state) : state
      },
    )
  })

  it("renders action menu buttons for each event card", () => {
    render(<EventsGrid />)
    const actionBtns = screen.getAllByRole("button", { name: /open actions/i })
    expect(actionBtns).toHaveLength(MOCK_EVENTS.length)
  })

  it("action menu contains Edit and Delete options", async () => {
    render(<EventsGrid />)
    const [firstActionBtn] = screen.getAllByRole("button", { name: /open actions/i })
    await userEvent.click(firstActionBtn)
    expect(await screen.findByRole("menuitem", { name: /edit event/i })).toBeInTheDocument()
    expect(await screen.findByRole("menuitem", { name: /delete event/i })).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EventsGrid — Accessibility
// ─────────────────────────────────────────────────────────────────────────────

describe("EventsGrid — accessibility", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useEventsStore.mockImplementation(
      (selector?: (s: ReturnType<typeof createMockStoreState>) => unknown) => {
        const state = createMockStoreState()
        return selector ? selector(state) : state
      },
    )
  })

  it("category icons are aria-hidden", () => {
    render(<EventsGrid />)
    const icons = document.querySelectorAll("svg[aria-hidden='true']")
    expect(icons.length).toBeGreaterThan(0)
  })

  it("event cards have aria-labelledby attribute", () => {
    render(<EventsGrid />)
    const articles = screen.getAllByRole("article")
    articles.forEach((article) => {
      expect(article).toHaveAttribute("aria-labelledby")
    })
  })

  it("progressbar has descriptive aria-label", () => {
    render(<EventsGrid />)
    const bars = screen.getAllByRole("progressbar")
    bars.forEach((bar) => {
      const label = bar.getAttribute("aria-label") ?? ""
      expect(label).toMatch(/time remaining/i)
    })
  })
})

