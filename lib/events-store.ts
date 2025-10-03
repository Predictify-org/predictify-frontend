import { create } from "zustand"
import type { Event, EventFilters, EventSort, PaginationState } from "@/types/events"

// Mock data matching the designs
const mockEvents: Event[] = [
  {
    id: "1",
    title: "Arsenal vs Liverpool",
    txHash: "TXN12345",
    category: "Football",
    odds: 7.0,
    startDate: "2025-04-12T14:00:00Z",
    endDate: "2025-12-12T16:00:00Z",
    status: "ongoing",
    timeRemaining: "90:09:32:55",
    timeRemainingMs: 90 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000 + 32 * 60 * 1000 + 55 * 1000,
  },
  {
    id: "2",
    title: "Trump vs Kamala",
    txHash: "TXN12345",
    category: "Politics",
    odds: 7.0,
    startDate: "2025-04-12T14:00:00Z",
    endDate: "2025-12-12T16:00:00Z",
    status: "ongoing",
    timeRemaining: "29:09:32:55",
    timeRemainingMs: 29 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000 + 32 * 60 * 1000 + 55 * 1000,
  },
  {
    id: "3",
    title: "Bitcoin Price",
    txHash: "TXN12345",
    category: "Crypto",
    odds: 7.0,
    startDate: "2025-04-12T14:00:00Z",
    endDate: "2025-12-12T16:00:00Z",
    status: "ongoing",
    timeRemaining: "00:01:32:55",
    timeRemainingMs: 1 * 60 * 60 * 1000 + 32 * 60 * 1000 + 55 * 1000,
  },
  {
    id: "4",
    title: "Tesla Stocks",
    txHash: "TXN12345",
    category: "Stocks",
    odds: 7.0,
    startDate: "2025-04-12T14:00:00Z",
    endDate: "2025-12-12T16:00:00Z",
    status: "ongoing",
    timeRemaining: "00:00:32:55",
    timeRemainingMs: 32 * 60 * 1000 + 55 * 1000,
  },
  {
    id: "5",
    title: "Manchester United vs Chelsea",
    txHash: "TXN12346",
    category: "Football",
    odds: 5.5,
    startDate: "2025-04-15T15:00:00Z",
    endDate: "2025-12-15T17:00:00Z",
    status: "ongoing",
    timeRemaining: "45:12:15:30",
    timeRemainingMs: 45 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000 + 15 * 60 * 1000 + 30 * 1000,
  },
  {
    id: "6",
    title: "Ethereum Price Prediction",
    txHash: "TXN12347",
    category: "Crypto",
    odds: 8.2,
    startDate: "2025-04-20T10:00:00Z",
    endDate: "2025-12-20T10:00:00Z",
    status: "ongoing",
    timeRemaining: "60:05:45:20",
    timeRemainingMs: 60 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000 + 45 * 60 * 1000 + 20 * 1000,
  },
  {
    id: "7",
    title: "Apple Stock Performance",
    txHash: "TXN12348",
    category: "Stocks",
    odds: 6.8,
    startDate: "2025-04-25T09:30:00Z",
    endDate: "2025-12-25T16:00:00Z",
    status: "ongoing",
    timeRemaining: "75:06:30:45",
    timeRemainingMs: 75 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000 + 30 * 60 * 1000 + 45 * 1000,
  },
  {
    id: "8",
    title: "Biden vs DeSantis",
    txHash: "TXN12349",
    category: "Politics",
    odds: 4.5,
    startDate: "2025-05-01T12:00:00Z",
    endDate: "2025-12-31T23:59:00Z",
    status: "ongoing",
    timeRemaining: "120:11:59:15",
    timeRemainingMs: 120 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000 + 59 * 60 * 1000 + 15 * 1000,
  },
  {
    id: "9",
    title: "Real Madrid vs Barcelona",
    txHash: "TXN12350",
    category: "Football",
    odds: 9.1,
    startDate: "2025-05-05T20:00:00Z",
    endDate: "2025-12-05T22:00:00Z",
    status: "ongoing",
    timeRemaining: "35:02:00:00",
    timeRemainingMs: 35 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
  },
  {
    id: "10",
    title: "Dogecoin Price Target",
    txHash: "TXN12351",
    category: "Crypto",
    odds: 3.7,
    startDate: "2025-05-10T08:00:00Z",
    endDate: "2025-12-10T08:00:00Z",
    status: "ongoing",
    timeRemaining: "15:00:00:00",
    timeRemainingMs: 15 * 24 * 60 * 60 * 1000,
  },
  {
    id: "11",
    title: "Google Stock Split",
    txHash: "TXN12352",
    category: "Stocks",
    odds: 7.3,
    startDate: "2025-05-15T10:00:00Z",
    endDate: "2025-12-15T16:00:00Z",
    status: "ongoing",
    timeRemaining: "25:06:00:00",
    timeRemainingMs: 25 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000,
  },
  {
    id: "12",
    title: "Climate Change Summit",
    txHash: "TXN12353",
    category: "Politics",
    odds: 5.9,
    startDate: "2025-05-20T14:00:00Z",
    endDate: "2025-12-20T18:00:00Z",
    status: "ongoing",
    timeRemaining: "55:04:00:00",
    timeRemainingMs: 55 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000,
  },
  {
    id: "13",
    title: "World Cup Final",
    txHash: "TXN12354",
    category: "Football",
    odds: 8.5,
    startDate: "2025-06-01T19:00:00Z",
    endDate: "2026-01-01T21:00:00Z",
    status: "upcoming",
    timeRemaining: "180:19:00:00",
    timeRemainingMs: 180 * 24 * 60 * 60 * 1000 + 19 * 60 * 60 * 1000,
  },
  {
    id: "14",
    title: "Presidential Election",
    txHash: "TXN12355",
    category: "Politics",
    odds: 6.2,
    startDate: "2025-06-15T08:00:00Z",
    endDate: "2026-01-15T20:00:00Z",
    status: "upcoming",
    timeRemaining: "200:12:00:00",
    timeRemainingMs: 200 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000,
  },
  {
    id: "15",
    title: "Super Bowl 2024",
    txHash: "TXN12356",
    category: "Football",
    odds: 4.8,
    startDate: "2024-02-11T18:30:00Z",
    endDate: "2024-02-11T22:00:00Z",
    status: "past",
    timeRemaining: "00:00:00:00",
    timeRemainingMs: 0,
  },
  {
    id: "16",
    title: "Bitcoin Halving 2024",
    txHash: "TXN12357",
    category: "Crypto",
    odds: 9.5,
    startDate: "2024-04-20T00:00:00Z",
    endDate: "2024-04-20T23:59:00Z",
    status: "past",
    timeRemaining: "00:00:00:00",
    timeRemainingMs: 0,
  },
]

interface EventsStore {
  // Data
  events: Event[]
  filteredEvents: Event[]
  loading: boolean
  error: string | null

  // Filters and sorting
  filters: EventFilters
  sort: EventSort
  pagination: PaginationState

  // Actions
  setFilters: (filters: Partial<EventFilters>) => void
  setSort: (sort: EventSort) => void
  setPagination: (newPagination: Partial<PaginationState>) => void
  setSearch: (search: string) => void
  setDateRange: (from: Date | null, to: Date | null) => void
  setStatus: (status: "ongoing" | "upcoming" | "past") => void
  applyFilters: () => void
  loadEvents: () => Promise<void>
}

export const useEventsStore = create<EventsStore>((set, get) => ({
  // Initial state
  events: mockEvents,
  filteredEvents: mockEvents.filter((e) => e.status === "ongoing"),
  loading: false,
  error: null,

  filters: {
    search: "",
    category: [],
    oddsRange: [0, 10],
    dateRange: {
      from: new Date("2025-03-29"),
      to: new Date("2025-12-29"),
    },
    status: "ongoing",
  },

  sort: {
    field: "title",
    direction: "asc",
  },

  pagination: {
    page: 1,
    pageSize: 5, // Reduced page size to better show pagination
    total: 0,
  },

  // Actions
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }))
    get().applyFilters()
  },

  setSort: (sort) => {
    set({ sort })
    get().applyFilters()
  },

  setPagination: (newPagination) => {
    set((state) => ({
      pagination: { ...state.pagination, ...newPagination },
    }))
  },

  setSearch: (search) => {
    set((state) => ({
      filters: { ...state.filters, search },
    }))
    get().applyFilters()
  },

  setDateRange: (from, to) => {
    set((state) => ({
      filters: {
        ...state.filters,
        dateRange: { from, to },
      },
    }))
    get().applyFilters()
  },

  setStatus: (status) => {
    set((state) => ({
      filters: { ...state.filters, status },
      pagination: { ...state.pagination, page: 1 },
    }))
    get().applyFilters()
  },

  applyFilters: () => {
    const { events, filters, sort } = get()

    // Filter events
    const filtered = events.filter((event) => {
      // Status filter
      if (event.status !== filters.status) return false

      // Search filter
      if (filters.search && !event.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }

      // Category filter
      if (filters.category.length > 0 && !filters.category.includes(event.category)) {
        return false
      }

      // Odds range filter
      if (event.odds < filters.oddsRange[0] || event.odds > filters.oddsRange[1]) {
        return false
      }

      // Date range filter
      if (filters.dateRange.from || filters.dateRange.to) {
        const eventDate = new Date(event.endDate)
        if (filters.dateRange.from && eventDate < filters.dateRange.from) return false
        if (filters.dateRange.to && eventDate > filters.dateRange.to) return false
      }

      return true
    })

    // Sort events
    filtered.sort((a, b) => {
      let aValue: any = a[sort.field]
      let bValue: any = b[sort.field]

      if (sort.field === "timeRemaining") {
        aValue = a.timeRemainingMs || 0
        bValue = b.timeRemainingMs || 0
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sort.direction === "asc" ? -1 : 1
      if (aValue > bValue) return sort.direction === "asc" ? 1 : -1
      return 0
    })

    set((state) => ({
      filteredEvents: filtered,
      pagination: {
        ...state.pagination,
        total: filtered.length,
      },
    }))
  },

  loadEvents: async () => {
    set({ loading: true, error: null })
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      set({ loading: false })
      get().applyFilters()
    } catch (error) {
      set({ loading: false, error: "Failed to load events" })
    }
  },
}))

// Helper function to get event counts by status
export const getEventCounts = (events: Event[]) => {
  return {
    ongoing: events.filter((e) => e.status === "ongoing").length,
    upcoming: events.filter((e) => e.status === "upcoming").length,
    past: events.filter((e) => e.status === "past").length,
  }
}

// Helper function to format time remaining
export const formatTimeRemaining = (timeRemainingMs: number) => {
  const days = Math.floor(timeRemainingMs / (24 * 60 * 60 * 1000))
  const hours = Math.floor((timeRemainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  const minutes = Math.floor((timeRemainingMs % (60 * 60 * 1000)) / (60 * 1000))
  const seconds = Math.floor((timeRemainingMs % (60 * 1000)) / 1000)

  return `${days.toString().padStart(2, "0")}:${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

// Helper function to get time remaining color
export const getTimeRemainingColor = (timeRemainingMs: number) => {
  const days = timeRemainingMs / (24 * 60 * 60 * 1000)

  if (days > 30) return "green"
  if (days > 7) return "orange"
  return "red"
}
