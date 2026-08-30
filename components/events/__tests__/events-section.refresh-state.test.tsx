import { fireEvent, render, screen } from "@testing-library/react"

import { EventsSection } from "../events-section"

const mockLoadEvents = jest.fn()
const mockRetryLoadEvents = jest.fn()
let mockEventsState: Record<string, unknown>

jest.mock("@/lib/events-store", () => ({
  useEventsStore: () => mockEventsState,
  getEventCounts: () => ({ ongoing: 0, upcoming: 0, past: 0 }),
}))

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

jest.mock("../events-toolbar", () => ({ EventsToolbar: () => null }))
jest.mock("../events-table", () => ({ EventsTable: () => <div>events table</div> }))
jest.mock("../events-grid", () => ({ EventsGrid: () => <div>events grid</div> }))
jest.mock("../pagination", () => ({ EventsPagination: () => null }))
jest.mock("@/app/components/CompareMarketsModal", () => ({ CompareMarketsModal: () => null }))
jest.mock("@/components/market/CompareSelectionChip", () => ({ CompareSelectionChip: () => null }))

const baseState = {
  events: [],
  filteredEvents: [{ id: "market-1" }],
  filters: { status: "ongoing" },
  setStatus: jest.fn(),
  loadEvents: mockLoadEvents,
  retryLoadEvents: mockRetryLoadEvents,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockEventsState = {
    ...baseState,
    error: "Could not refresh markets. Showing the last available data.",
    canRetry: true,
  }
})

describe("EventsSection refresh state", () => {
  it("keeps stale markets visible and offers a retry for transient failures", () => {
    render(<EventsSection />)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not refresh markets. Showing the last available data.",
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Your current page has been kept in place.")
    expect(screen.getByText("events table")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(mockRetryLoadEvents).toHaveBeenCalledTimes(1)
  })

  it("does not offer a retry for permission failures", () => {
    mockEventsState = {
      ...baseState,
      error: "You do not have permission to refresh these markets.",
      canRetry: false,
    }

    render(<EventsSection />)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "You do not have permission to refresh these markets.",
    )
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument()
  })
})
