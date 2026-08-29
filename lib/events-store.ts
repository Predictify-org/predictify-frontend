import { create } from "zustand"
import type { Event, EventFilters, EventSort, PaginationState } from "@/types/events"

// Mock data matching the designs
// MODIFIED: Added `participants` field to each event
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
    participants: 1245,
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
    participants: 5432,
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
    participants: 876,
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
    participants: 654,
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
    participants: 2341,
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
    participants: 1102,
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
    participants: 789,
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
    participants: 3210,
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
    participants: 4567,
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
    participants: 543,
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
    participants: 918,
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
    participants: 1678,
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
    participants: 312,
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
    participants: 456,
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
    participants: 8901,
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
    participants: 6743,
  },
]

export type EventsFetcher = () => Promise<Event[]>
export type EventsLoadErrorKind = "invalid" | "network" | "permission"

interface EventsStore {
  // Data
  events: Event[]
  filteredEvents: Event[]
  loading: boolean
  error: string | null
  loadErrorKind: EventsLoadErrorKind | null
  canRetry: boolean

  // Filters and sorting
  filters: EventFilters
  sort: EventSort
  pagination: PaginationState

  // Filter-cursor synchronization
  /** Version counter for filters (incremented on any filter change) */
  filterVersion: number
  /** Last known filter version applied to current results */
  appliedFilterVersion: number

  // Infinite scroll state
  hasNextPage: boolean
  isFetchingNextPage: boolean
  lastFetchTime: number | null
  nextPageRequestId: number
  loadRequestId: number

  // Actions
  setFilters: (filters: Partial<EventFilters>) => void
  setSort: (sort: EventSort) => void
  setPagination: (newPagination: Partial<PaginationState>) => void
  setSearch: (search: string) => void
  setDateRange: (from: Date | null, to: Date | null) => void
  setStatus: (status: "ongoing" | "upcoming" | "past") => void
  applyFilters: (anchorId?: string | null) => void
  loadEvents: (fetcher?: EventsFetcher) => Promise<void>
  retryLoadEvents: () => Promise<void>
  /** Atomically reconcile a live snapshot while keeping the current page anchored. */
  applyLiveEvents: (events: Event[]) => boolean
  /** NEW: Delete an event by its id */
  deleteEvent: (id: string) => void
  /** NEW: Load next page for infinite scroll */
  loadNextPage: () => Promise<void>
  /** NEW: Check if data is stale and needs refresh */
  isDataStale: () => boolean
  /** NEW: Reset cursor when filters change (sync filters with pagination) */
  syncFilterAndCursor: () => void
}

// Stale time threshold: 60 seconds
const STALE_TIME_MS = 60 * 1000

let lastEventsFetcher: EventsFetcher | null = null

const getPageAnchor = (events: Event[], page: number, pageSize: number) =>
  events[(page - 1) * pageSize]?.id ?? null

const isValidEvent = (event: unknown): event is Event => {
  if (!event || typeof event !== "object") return false

  const candidate = event as Partial<Event>
  return (
    typeof candidate.id === "string" &&
    candidate.id.trim().length > 0 &&
    candidate.id === candidate.id.trim() &&
    typeof candidate.title === "string" &&
    candidate.title.trim().length > 0 &&
    typeof candidate.txHash === "string" &&
    ["Football", "Politics", "Crypto", "Stocks"].includes(candidate.category ?? "") &&
    ["ongoing", "upcoming", "past"].includes(candidate.status ?? "") &&
    typeof candidate.odds === "number" &&
    Number.isFinite(candidate.odds) &&
    typeof candidate.participants === "number" &&
    Number.isInteger(candidate.participants) &&
    candidate.participants >= 0 &&
    typeof candidate.startDate === "string" &&
    Number.isFinite(Date.parse(candidate.startDate)) &&
    typeof candidate.endDate === "string" &&
    Number.isFinite(Date.parse(candidate.endDate))
  )
}

const validateSnapshot = (events: unknown): Event[] | null => {
  if (!Array.isArray(events)) return null

  const ids = new Set<string>()
  for (const event of events) {
    if (!isValidEvent(event) || ids.has(event.id)) return null
    ids.add(event.id)
  }

  // Detach the store from caller-owned objects so later mutation cannot alter a
  // committed snapshot without going through validation and reconciliation.
  return events.map((event) => ({ ...event }))
}

const classifyLoadError = (error: unknown) => {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : null

  if (status === 401 || status === 403) {
    return {
      kind: "permission" as const,
      message: "You do not have permission to refresh these markets.",
      retryable: false,
    }
  }

  return {
    kind: "network" as const,
    message: "Could not refresh markets. Showing the last available data.",
    retryable: true,
  }
}

export const useEventsStore = create<EventsStore>((set, get) => ({
  // Initial state
  events: mockEvents,
  filteredEvents: mockEvents.filter((e) => e.status === "ongoing"),
  loading: false,
  error: null,
  loadErrorKind: null,
  canRetry: false,

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
    cursor: null,
    filterVersion: 0,
  },

  // Filter-cursor synchronization tracking
  filterVersion: 0,
  appliedFilterVersion: 0,

  // Infinite scroll state
  hasNextPage: true,
  isFetchingNextPage: false,
  lastFetchTime: null,
  nextPageRequestId: 0,
  loadRequestId: 0,

  // Actions
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      filterVersion: state.filterVersion + 1,
    }))
    get().syncFilterAndCursor()
  },

  setSort: (sort) => {
    set({ sort })
    get().applyFilters()
  },

  setPagination: (newPagination) => {
    set((state) => {
      const requestedPageSize = newPagination.pageSize ?? state.pagination.pageSize
      const pageSize =
        Number.isInteger(requestedPageSize) && requestedPageSize > 0
          ? requestedPageSize
          : state.pagination.pageSize
      const totalPages = Math.max(1, Math.ceil(state.filteredEvents.length / pageSize))
      const requestedPage = newPagination.page ?? state.pagination.page
      const page = Math.min(
        totalPages,
        Math.max(1, Number.isInteger(requestedPage) ? requestedPage : state.pagination.page),
      )

      return {
        pagination: {
          ...state.pagination,
          ...newPagination,
          page,
          pageSize,
          total: state.filteredEvents.length,
        },
      }
    })
  },

  setSearch: (search) => {
    set((state) => ({
      filters: { ...state.filters, search },
      filterVersion: state.filterVersion + 1,
    }))
    get().syncFilterAndCursor()
  },

  setDateRange: (from, to) => {
    set((state) => ({
      filters: {
        ...state.filters,
        dateRange: { from, to },
      },
      filterVersion: state.filterVersion + 1,
    }))
    get().syncFilterAndCursor()
  },

  setStatus: (status) => {
    set((state) => ({
      filters: { ...state.filters, status },
      filterVersion: state.filterVersion + 1,
    }))
    get().syncFilterAndCursor()
  },

  syncFilterAndCursor: () => {
    const { filterVersion } = get()

    set((state) => ({
      pagination: {
        ...state.pagination,
        page: 1,
        cursor: null,
        filterVersion,
      },
      hasNextPage: true,
      isFetchingNextPage: false,
      nextPageRequestId: state.nextPageRequestId + 1,
    }))
    get().applyFilters()
  },

  applyFilters: (anchorId = null) => {
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

      // A unique tie-breaker is required: live snapshots may arrive in any
      // order, but equal sort values must never make rows jump between pages.
      return a.id.localeCompare(b.id)
    })

    set((state) => {
      const totalPages = Math.max(1, Math.ceil(filtered.length / state.pagination.pageSize))
      const anchorIndex = anchorId ? filtered.findIndex((event) => event.id === anchorId) : -1
      const page =
        anchorIndex >= 0
          ? Math.floor(anchorIndex / state.pagination.pageSize) + 1
          : Math.min(Math.max(state.pagination.page, 1), totalPages)

      return {
        filteredEvents: filtered,
        pagination: {
          ...state.pagination,
          page,
          total: filtered.length,
          filterVersion: state.filterVersion,
        },
        appliedFilterVersion: state.filterVersion,
        hasNextPage: page * state.pagination.pageSize < filtered.length,
      }
    })
  },

  applyLiveEvents: (events) => {
    const snapshot = validateSnapshot(events)
    if (!snapshot) {
      console.warn("[events-store] Rejected invalid market snapshot")
      set({
        error: "Market refresh returned invalid data. Showing the last available data.",
        loadErrorKind: "invalid",
        canRetry: true,
      })
      return false
    }

    const state = get()
    const anchorId = getPageAnchor(
      state.filteredEvents,
      state.pagination.page,
      state.pagination.pageSize,
    )

    // Validation happens before this single commit, so a malformed or duplicate
    // snapshot can never partially replace the last known-good market list.
    set({
      events: snapshot,
      error: null,
      loadErrorKind: null,
      canRetry: false,
      loading: false,
      lastFetchTime: Date.now(),
      loadRequestId: state.loadRequestId + 1,
    })
    get().applyFilters(anchorId)
    return true
  },

  loadEvents: async (fetcher) => {
    if (fetcher) lastEventsFetcher = fetcher

    const requestId = get().loadRequestId + 1
    set({
      loading: true,
      error: null,
      loadErrorKind: null,
      canRetry: false,
      loadRequestId: requestId,
    })

    try {
      const snapshot = fetcher
        ? await fetcher()
        : await new Promise<Event[]>((resolve) =>
            setTimeout(() => resolve(get().events), 1000),
          )

      // Only the newest refresh may commit. This prevents a slow retry from
      // overwriting a newer live snapshot or clearing its error state.
      if (get().loadRequestId !== requestId) return

      const accepted = get().applyLiveEvents(snapshot)
      if (!accepted && get().loadRequestId === requestId) set({ loading: false })
    } catch (error) {
      if (get().loadRequestId !== requestId) return

      const failure = classifyLoadError(error)
      console.warn("[events-store] Market refresh failed", { kind: failure.kind })
      set({
        loading: false,
        error: failure.message,
        loadErrorKind: failure.kind,
        canRetry: failure.retryable,
      })
    }
  },

  retryLoadEvents: async () => {
    await get().loadEvents(lastEventsFetcher ?? undefined)
  },

  /** NEW: Delete an event by id and re-apply filters */
  deleteEvent: (id: string) => {
    const state = get()
    const anchorId = getPageAnchor(
      state.filteredEvents,
      state.pagination.page,
      state.pagination.pageSize,
    )
    set((state) => ({
      events: state.events.filter((event) => event.id !== id),
    }))
    get().applyFilters(anchorId === id ? null : anchorId)
  },

  /** NEW: Load next page for infinite scroll */
  loadNextPage: async () => {
    const { isFetchingNextPage, hasNextPage, pagination, filteredEvents, filterVersion } = get()
    
    if (isFetchingNextPage || !hasNextPage) return

    const requestId = get().nextPageRequestId + 1
    set({ isFetchingNextPage: true, error: null, nextPageRequestId: requestId })
    
    try {
      // Simulate API call for next page
      await new Promise((resolve) => setTimeout(resolve, 800))
      
      const nextPage = pagination.page + 1
      const startIndex = (nextPage - 1) * pagination.pageSize
      const endIndex = startIndex + pagination.pageSize

      // A filter change invalidates this request; never apply an old page.
      const currentState = get()
      if (
        currentState.nextPageRequestId !== requestId ||
        currentState.filterVersion !== filterVersion ||
        currentState.pagination.page !== pagination.page ||
        currentState.pagination.filterVersion !== filterVersion
      ) {
        if (currentState.nextPageRequestId === requestId) {
          set({ isFetchingNextPage: false })
        }
        return
      }
      
      // Check if we've reached the end
      const hasMore = endIndex < filteredEvents.length
      
      set((state) => ({
        pagination: {
          ...state.pagination,
          page: nextPage,
          cursor: String(endIndex),
          filterVersion,
        },
        hasNextPage: hasMore,
        isFetchingNextPage: false,
        lastFetchTime: Date.now(),
      }))
    } catch (error) {
      if (get().nextPageRequestId === requestId) {
        set({
          isFetchingNextPage: false,
          error: "Failed to load more events",
        })
      }
    }
  },

  /** NEW: Check if data is stale and needs refresh */
  isDataStale: () => {
    const { lastFetchTime } = get()
    if (!lastFetchTime) return true
    return Date.now() - lastFetchTime > STALE_TIME_MS
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
