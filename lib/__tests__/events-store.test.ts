import { useEventsStore } from "../events-store"

const initialState = useEventsStore.getState()

beforeEach(() => {
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
    error: null,
    filteredEvents: initialState.events,
  })
  useEventsStore.getState().applyFilters()
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
    expect(useEventsStore.getState().filteredEvents).toHaveLength(1)
  })
})
