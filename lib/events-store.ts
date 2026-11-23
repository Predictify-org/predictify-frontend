import { create } from "zustand"
import type { Event, EventFilters, EventSort, PaginationState } from "@/types/events"
import { EventsApiError, getEventsAdapter } from "@/lib/events-api"
import type { EventsAdapter, EventsPage, FetchEventsOptions } from "@/lib/events-api"

export type EventsFetcher = EventsAdapter["fetchEvents"]
export type EventsLoadErrorKind = EventsApiError["kind"]

interface EventsStore {
  // Data
  events: Event[]
  filteredEvents: Event[]
  nextCursor: string | null
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
  eventsFetcher: EventsFetcher | null

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
  applyLiveEvents: (events: Event[], nextCursor?: string | null) => boolean
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

let activeLoadController: AbortController | null = null
let activeNextPageController: AbortController | null = null

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
    Number.isFinite(Date.parse(candidate.endDate)) &&
    (candidate.resolutionDate === undefined ||
      (typeof candidate.resolutionDate === "string" &&
        Number.isFinite(Date.parse(candidate.resolutionDate))))
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
  if (error instanceof EventsApiError) {
    return {
      kind: error.kind,
      message:
        error.kind === "permission"
          ? "You do not have permission to refresh these markets."
          : error.kind === "invalid"
            ? "Market refresh returned invalid data. Showing the last available data."
            : "Could not refresh markets. Showing the last available data.",
      retryable: error.kind !== "permission",
    }
  }

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
  events: [],
  filteredEvents: [],
  nextCursor: null,
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
  eventsFetcher: null,

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

    activeNextPageController?.abort()
    set((state) => ({
      pagination: {
        ...state.pagination,
        page: 1,
        cursor: null,
        filterVersion,
      },
      hasNextPage: true,
      isFetchingNextPage: false,
      nextCursor: null,
      nextPageRequestId: state.nextPageRequestId + 1,
    }))
    get().applyFilters()
    void get().loadEvents()
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
        hasNextPage: state.nextCursor !== null,
      }
    })
  },

  applyLiveEvents: (events, nextCursor = null) => {
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
      nextCursor,
      hasNextPage: nextCursor !== null,
      pagination: {
        ...state.pagination,
        cursor: nextCursor,
      },
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
    if (fetcher) set({ eventsFetcher: fetcher })

    const requestId = get().loadRequestId + 1
    activeLoadController?.abort()
    activeNextPageController?.abort()
    const controller = new AbortController()
    activeLoadController = controller
    set({
      loading: true,
      error: null,
      loadErrorKind: null,
      canRetry: false,
      loadRequestId: requestId,
      isFetchingNextPage: false,
      nextPageRequestId: get().nextPageRequestId + 1,
      hasNextPage: true,
      nextCursor: null,
      pagination: {
        ...get().pagination,
        cursor: null,
      },
    })

    try {
      const { filters, pagination } = get()
      const options: FetchEventsOptions = {
        status: filters.status,
        category: filters.category,
        search: filters.search,
        cursor: null,
        limit: pagination.pageSize,
        signal: controller.signal,
      }
      const activeFetcher = get().eventsFetcher
      const page: EventsPage = activeFetcher
        ? await activeFetcher(options)
        : await (await getEventsAdapter()).fetchEvents(options)

      // Only the newest refresh may commit. This prevents a slow retry from
      // overwriting a newer live snapshot or clearing its error state.
      if (get().loadRequestId !== requestId) return

      const accepted = get().applyLiveEvents(page.events, page.nextCursor)
      if (!accepted && get().loadRequestId === requestId) set({ loading: false })
    } catch (error) {
      if (get().loadRequestId !== requestId) return
      if (error instanceof Error && error.name === "AbortError") return

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
    await get().loadEvents()
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
    const { isFetchingNextPage, hasNextPage, nextCursor, pagination, filterVersion } = get()

    if (isFetchingNextPage || !hasNextPage || nextCursor === null) return

    const requestId = get().nextPageRequestId + 1
    activeNextPageController?.abort()
    const controller = new AbortController()
    activeNextPageController = controller
    set({
      isFetchingNextPage: true,
      error: null,
      loadErrorKind: null,
      canRetry: false,
      nextPageRequestId: requestId,
    })

    try {
      const { filters } = get()
      const options: FetchEventsOptions = {
        status: filters.status,
        category: filters.category,
        search: filters.search,
        cursor: nextCursor,
        limit: pagination.pageSize,
        signal: controller.signal,
      }
      const fetcher = get().eventsFetcher
      const page = fetcher
        ? await fetcher(options)
        : await (await getEventsAdapter()).fetchEvents(options)

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

      const existingIds = new Set(currentState.events.map(({ id }) => id))
      const combined = [...currentState.events]
      for (const event of page.events) {
        if (!existingIds.has(event.id)) {
          existingIds.add(event.id)
          combined.push(event)
        }
      }
      const snapshot = validateSnapshot(combined)
      if (!snapshot) {
        set({
          isFetchingNextPage: false,
          error: "Market refresh returned invalid data. Showing the last available data.",
          loadErrorKind: "invalid",
          canRetry: true,
        })
        return
      }

      const nextPage = pagination.page + 1
      set((state) => ({
        events: snapshot,
        nextCursor: page.nextCursor,
        pagination: {
          ...state.pagination,
          page: nextPage,
          cursor: page.nextCursor,
          total: snapshot.length,
          filterVersion,
        },
        hasNextPage: page.nextCursor !== null,
        isFetchingNextPage: false,
        lastFetchTime: Date.now(),
      }))
      get().applyFilters()
    } catch (error) {
      if (get().nextPageRequestId === requestId && !(error instanceof Error && error.name === "AbortError")) {
        const failure = classifyLoadError(error)
        set({
          isFetchingNextPage: false,
          error: failure.message,
          loadErrorKind: failure.kind,
          canRetry: failure.retryable,
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
