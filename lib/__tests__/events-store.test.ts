import { useEventsStore } from "../events-store"
import type { Event } from "@/types/events"

const initialState = useEventsStore.getState()
let warnSpy: jest.SpyInstance

const event = (id: string, title = `Market ${id}`): Event => ({
  id,
  title,
  txHash: `tx-${id}`,
  category: "Crypto",
  odds: 2,
  startDate: "2026-08-01T00:00:00.000Z",
  endDate: "2026-09-01T00:00:00.000Z",
  status: "ongoing",
  participants: 1,
})

beforeEach(() => {
  warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined)
  useEventsStore.setState({
    filters: {
      search: "",
      category: [],
      oddsRange: [0, 10],
      dateRange: { from: null, to: null },
      status: "ongoing",
    },
    filterVersion: 0,
    appliedFilterVersion: 0,
    pagination: {
      page: 1,
      pageSize: 5,
      total: 0,
      cursor: null,
      filterVersion: 0,
    },
    hasNextPage: true,
    isFetchingNextPage: false,
    nextPageRequestId: 0,
    loadRequestId: 0,
    loading: false,
    error: null,
    loadErrorKind: null,
    canRetry: false,
    events: initialState.events,
    filteredEvents: initialState.events,
  })
  useEventsStore.getState().applyFilters()
})

afterEach(() => {
  jest.useRealTimers()
  warnSpy.mockRestore()
})

describe("events filter and cursor synchronization", () => {
  it("resets page and cursor whenever filters change", () => {
    useEventsStore.setState({
      pagination: { page: 3, pageSize: 5, total: 10, cursor: "10", filterVersion: 0 },
    })

    useEventsStore.getState().setFilters({ category: ["Crypto"] })

    const state = useEventsStore.getState()
    expect(state.pagination.page).toBe(1)
    expect(state.pagination.cursor).toBeNull()
    expect(state.pagination.filterVersion).toBe(state.filterVersion)
    expect(state.appliedFilterVersion).toBe(state.filterVersion)
  })

  it("does not allow an in-flight page to commit after a filter change", async () => {
    jest.useFakeTimers()
    const pageRequest = useEventsStore.getState().loadNextPage()

    expect(useEventsStore.getState().isFetchingNextPage).toBe(true)
    useEventsStore.getState().setSearch("Bitcoin")
    jest.advanceTimersByTime(800)
    await pageRequest

    const state = useEventsStore.getState()
    expect(state.pagination.page).toBe(1)
    expect(state.pagination.cursor).toBeNull()
    expect(state.isFetchingNextPage).toBe(false)
    expect(state.filteredEvents.every((event) => event.title.includes("Bitcoin"))).toBe(true)
    jest.useRealTimers()
  })

  it("keeps duplicate filter values deterministic", () => {
    useEventsStore.getState().setFilters({ category: ["Crypto", "Crypto"] })

    expect(useEventsStore.getState().filters.category).toEqual(["Crypto", "Crypto"])
    expect(useEventsStore.getState().filteredEvents).toHaveLength(
      initialState.events.filter((item) => item.status === "ongoing" && item.category === "Crypto").length,
    )
  })
})

describe("stable pagination under live updates", () => {
  it("keeps the visible anchor in view when markets are inserted ahead of it", () => {
    const original = [event("b", "B"), event("c", "C"), event("d", "D"), event("e", "E")]
    useEventsStore.setState({
      events: original,
      pagination: { page: 2, pageSize: 2, total: original.length, cursor: null, filterVersion: 0 },
    })
    useEventsStore.getState().applyFilters()
    const anchorId = useEventsStore.getState().filteredEvents[2].id

    const accepted = useEventsStore
      .getState()
      .applyLiveEvents([event("0", "0"), event("a", "A"), ...original])

    const state = useEventsStore.getState()
    const start = (state.pagination.page - 1) * state.pagination.pageSize
    const visibleIds = state.filteredEvents.slice(start, start + state.pagination.pageSize).map(({ id }) => id)
    expect(accepted).toBe(true)
    expect(state.pagination.page).toBe(3)
    expect(visibleIds).toContain(anchorId)
    expect(new Set(state.filteredEvents.map(({ id }) => id)).size).toBe(state.filteredEvents.length)
  })

  it("uses the market id as a deterministic tie-breaker", () => {
    const forward = [event("c", "Same"), event("a", "Same"), event("b", "Same")]
    useEventsStore.getState().applyLiveEvents(forward)
    const firstOrder = useEventsStore.getState().filteredEvents.map(({ id }) => id)

    useEventsStore.getState().applyLiveEvents([...forward].reverse())

    expect(firstOrder).toEqual(["a", "b", "c"])
    expect(useEventsStore.getState().filteredEvents.map(({ id }) => id)).toEqual(firstOrder)
  })

  it("rejects duplicate and malformed snapshots atomically", () => {
    const original = [event("a"), event("b")]
    useEventsStore.getState().applyLiveEvents(original)

    expect(useEventsStore.getState().applyLiveEvents([event("a"), event("a")])).toBe(false)
    expect(useEventsStore.getState().events).toEqual(original)

    expect(useEventsStore.getState().applyLiveEvents([{ id: "bad" }] as Event[])).toBe(false)
    expect(useEventsStore.getState().events).toEqual(original)
    expect(useEventsStore.getState().loadErrorKind).toBe("invalid")
    expect(warnSpy).toHaveBeenCalledWith("[events-store] Rejected invalid market snapshot")
  })

  it("clamps the final page after a live deletion and resets an empty list to page one", () => {
    const original = [event("a"), event("b"), event("c")]
    useEventsStore.setState({
      events: original,
      pagination: { page: 2, pageSize: 2, total: original.length, cursor: null, filterVersion: 0 },
    })
    useEventsStore.getState().applyFilters()

    useEventsStore.getState().applyLiveEvents([event("a"), event("b")])
    expect(useEventsStore.getState().pagination.page).toBe(1)

    useEventsStore.getState().applyLiveEvents([])
    expect(useEventsStore.getState().pagination.page).toBe(1)
    expect(useEventsStore.getState().pagination.total).toBe(0)
  })

  it("normalizes invalid page and page-size inputs", () => {
    useEventsStore.getState().setPagination({ page: Number.NaN, pageSize: 0 })
    expect(useEventsStore.getState().pagination.page).toBe(1)
    expect(useEventsStore.getState().pagination.pageSize).toBe(5)

    useEventsStore.getState().setPagination({ page: 999 })
    const state = useEventsStore.getState()
    expect(state.pagination.page).toBe(Math.ceil(state.filteredEvents.length / state.pagination.pageSize))
  })
})

describe("market refresh failure and concurrency", () => {
  it("allows only the newest concurrent refresh to commit", async () => {
    let resolveOld: (events: Event[]) => void = () => undefined
    let resolveNew: (events: Event[]) => void = () => undefined
    const oldRequest = useEventsStore
      .getState()
      .loadEvents(() => new Promise((resolve) => { resolveOld = resolve }))
    const newRequest = useEventsStore
      .getState()
      .loadEvents(() => new Promise((resolve) => { resolveNew = resolve }))

    resolveNew([event("new")])
    await newRequest
    resolveOld([event("old")])
    await oldRequest

    expect(useEventsStore.getState().events.map(({ id }) => id)).toEqual(["new"])
    expect(useEventsStore.getState().loading).toBe(false)
  })

  it("does not let an older refresh overwrite a newer live snapshot", async () => {
    let resolveRefresh: (events: Event[]) => void = () => undefined
    const refresh = useEventsStore
      .getState()
      .loadEvents(() => new Promise((resolve) => { resolveRefresh = resolve }))

    useEventsStore.getState().applyLiveEvents([event("live")])
    resolveRefresh([event("stale")])
    await refresh

    expect(useEventsStore.getState().events.map(({ id }) => id)).toEqual(["live"])
    expect(useEventsStore.getState().loading).toBe(false)
  })

  it("retains stale data after a retryable failure and recovers on retry", async () => {
    const original = [event("cached")]
    useEventsStore.getState().applyLiveEvents(original)
    const fetcher = jest
      .fn<Promise<Event[]>, []>()
      .mockRejectedValueOnce(new Error("private network details"))
      .mockResolvedValueOnce([event("fresh")])

    await useEventsStore.getState().loadEvents(fetcher)
    expect(useEventsStore.getState().events).toEqual(original)
    expect(useEventsStore.getState().error).not.toContain("private network details")
    expect(useEventsStore.getState().canRetry).toBe(true)

    await useEventsStore.getState().retryLoadEvents()
    expect(useEventsStore.getState().events.map(({ id }) => id)).toEqual(["fresh"])
    expect(useEventsStore.getState().error).toBeNull()
  })

  it("surfaces permission failures without offering an unsafe retry", async () => {
    await useEventsStore.getState().loadEvents(async () => {
      throw { status: 403, detail: "sensitive upstream response" }
    })

    const state = useEventsStore.getState()
    expect(state.loadErrorKind).toBe("permission")
    expect(state.canRetry).toBe(false)
    expect(state.error).toBe("You do not have permission to refresh these markets.")
    expect(state.error).not.toContain("sensitive")
  })
})
