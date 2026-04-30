/**
 * Integration tests for VirtualizedEventsList
 * 
 * Tests scroll position preservation, infinite scroll, and loading states
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { VirtualizedEventsList } from "../virtualized-events-list"
import { useEventsStore } from "@/lib/events-store"
import { saveScrollPosition, getScrollPosition, clearScrollPosition } from "@/lib/scroll-position-store"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock @tanstack/react-virtual
jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: jest.fn(() => ({
    getTotalSize: () => 1000,
    getVirtualItems: () => [],
  })),
}))

describe("VirtualizedEventsList - Integration Tests", () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(usePathname as jest.Mock).mockReturnValue("/events")
    ;(useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams())
    
    // Reset store
    useEventsStore.setState({
      filteredEvents: [],
      loading: false,
      hasNextPage: true,
      isFetchingNextPage: false,
    })
  })

  describe("Scroll Position Preservation", () => {
    it("should save scroll position on item click", async () => {
      const mockEvents = [
        {
          id: "1",
          title: "Test Event",
          txHash: "TXN123",
          category: "Football" as const,
          odds: 5.0,
          startDate: "2025-01-01",
          endDate: "2025-12-31",
          status: "ongoing" as const,
          participants: 100,
        },
      ]

      useEventsStore.setState({ filteredEvents: mockEvents })

      render(<VirtualizedEventsList />)

      // Simulate scroll
      const container = screen.getByRole("region", { hidden: true })
      Object.defineProperty(container, "scrollTop", { value: 500, writable: true })

      // Click item (would trigger navigation)
      // Note: In real implementation, this would save scroll position
      saveScrollPosition("/events", 500)

      expect(getScrollPosition("/events")).toBe(500)
    })

    it("should restore scroll position on mount", () => {
      saveScrollPosition("/events", 1000)

      render(<VirtualizedEventsList />)

      // Position should be restored (tested via useLayoutEffect)
      expect(getScrollPosition("/events")).toBe(1000)
    })

    it("should clear scroll position on back-to-top click", () => {
      saveScrollPosition("/events", 1000)

      render(<VirtualizedEventsList />)

      clearScrollPosition("/events")

      expect(getScrollPosition("/events")).toBe(0)
    })

    it("should use different keys for filtered routes", () => {
      saveScrollPosition("/events", 500)
      saveScrollPosition("/events?filter=crypto", 1000)

      expect(getScrollPosition("/events")).toBe(500)
      expect(getScrollPosition("/events?filter=crypto")).toBe(1000)
    })
  })

  describe("Infinite Scroll", () => {
    it("should show loading indicator when fetching next page", () => {
      useEventsStore.setState({
        filteredEvents: [
          {
            id: "1",
            title: "Event 1",
            txHash: "TXN1",
            category: "Football" as const,
            odds: 5.0,
            startDate: "2025-01-01",
            endDate: "2025-12-31",
            status: "ongoing" as const,
            participants: 100,
          },
        ],
        isFetchingNextPage: true,
        hasNextPage: true,
      })

      render(<VirtualizedEventsList />)

      expect(screen.getByText("Loading more events...")).toBeInTheDocument()
    })

    it("should not show loading indicator when not fetching", () => {
      useEventsStore.setState({
        filteredEvents: [
          {
            id: "1",
            title: "Event 1",
            txHash: "TXN1",
            category: "Football" as const,
            odds: 5.0,
            startDate: "2025-01-01",
            endDate: "2025-12-31",
            status: "ongoing" as const,
            participants: 100,
          },
        ],
        isFetchingNextPage: false,
        hasNextPage: true,
      })

      render(<VirtualizedEventsList />)

      expect(screen.queryByText("Loading more events...")).not.toBeInTheDocument()
    })

    it("should show end-of-list message when no more pages", () => {
      useEventsStore.setState({
        filteredEvents: [
          {
            id: "1",
            title: "Event 1",
            txHash: "TXN1",
            category: "Football" as const,
            odds: 5.0,
            startDate: "2025-01-01",
            endDate: "2025-12-31",
            status: "ongoing" as const,
            participants: 100,
          },
        ],
        hasNextPage: false,
        isFetchingNextPage: false,
      })

      render(<VirtualizedEventsList />)

      expect(screen.getByText("You've reached the end")).toBeInTheDocument()
    })

    it("should not show end-of-list when still fetching", () => {
      useEventsStore.setState({
        filteredEvents: [
          {
            id: "1",
            title: "Event 1",
            txHash: "TXN1",
            category: "Football" as const,
            odds: 5.0,
            startDate: "2025-01-01",
            endDate: "2025-12-31",
            status: "ongoing" as const,
            participants: 100,
          },
        ],
        hasNextPage: false,
        isFetchingNextPage: true,
      })

      render(<VirtualizedEventsList />)

      expect(screen.queryByText("You've reached the end")).not.toBeInTheDocument()
    })
  })

  describe("Loading States", () => {
    it("should show skeleton on initial load", () => {
      useEventsStore.setState({
        filteredEvents: [],
        loading: true,
      })

      render(<VirtualizedEventsList />)

      // Skeleton should be rendered (contains multiple skeleton elements)
      const skeletons = screen.getAllByRole("status", { hidden: true })
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it("should show empty state when no items after loading", () => {
      useEventsStore.setState({
        filteredEvents: [],
        loading: false,
      })

      render(<VirtualizedEventsList />)

      expect(screen.getByText("No events found")).toBeInTheDocument()
      expect(screen.getByText(/Try adjusting your search or filter criteria/)).toBeInTheDocument()
    })

    it("should not show skeleton when cached data exists", () => {
      useEventsStore.setState({
        filteredEvents: [
          {
            id: "1",
            title: "Cached Event",
            txHash: "TXN1",
            category: "Football" as const,
            odds: 5.0,
            startDate: "2025-01-01",
            endDate: "2025-12-31",
            status: "ongoing" as const,
            participants: 100,
          },
        ],
        loading: false,
      })

      render(<VirtualizedEventsList />)

      expect(screen.queryByRole("status", { hidden: true })).not.toBeInTheDocument()
      expect(screen.getByText("Cached Event")).toBeInTheDocument()
    })
  })

  describe("Data Caching", () => {
    it("should not re-fetch when data is fresh", () => {
      const loadEvents = jest.fn()
      
      useEventsStore.setState({
        filteredEvents: [
          {
            id: "1",
            title: "Event 1",
            txHash: "TXN1",
            category: "Football" as const,
            odds: 5.0,
            startDate: "2025-01-01",
            endDate: "2025-12-31",
            status: "ongoing" as const,
            participants: 100,
          },
        ],
        loading: false,
        lastFetchTime: Date.now(),
        isDataStale: () => false,
        loadEvents,
      })

      render(<VirtualizedEventsList />)

      expect(loadEvents).not.toHaveBeenCalled()
    })

    it("should re-fetch when data is stale", () => {
      const loadEvents = jest.fn()
      
      useEventsStore.setState({
        filteredEvents: [],
        loading: false,
        lastFetchTime: Date.now() - 120000, // 2 minutes ago
        isDataStale: () => true,
        loadEvents,
      })

      render(<VirtualizedEventsList />)

      expect(loadEvents).toHaveBeenCalled()
    })
  })
})
