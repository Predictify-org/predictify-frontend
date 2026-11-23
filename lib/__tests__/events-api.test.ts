import { fetchEvents, getEventsAdapter } from "../events-api"
import { mockEvents } from "../fixtures/events"

const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()

function setEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

function mockResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(payload),
  } as unknown as Response
}

describe("fetchEvents", () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("requests filtered cursor pages and validates event data", async () => {
    const signal = new AbortController().signal
    mockFetch.mockResolvedValueOnce(
      mockResponse({ events: [mockEvents[0]], nextCursor: "next-page" })
    )

    const page = await fetchEvents({
      status: "ongoing",
      category: ["Crypto", "Football"],
      search: "bitcoin price",
      cursor: "cursor 1",
      limit: 5,
      signal,
    })

    const [requestUrl, requestInit] = mockFetch.mock.calls[0]
    const url = new URL(String(requestUrl))
    expect(url.pathname).toBe("/api/events")
    expect(url.searchParams.get("status")).toBe("ongoing")
    expect(url.searchParams.getAll("category")).toEqual(["Crypto", "Football"])
    expect(url.searchParams.get("search")).toBe("bitcoin price")
    expect(url.searchParams.get("cursor")).toBe("cursor 1")
    expect(url.searchParams.get("limit")).toBe("5")
    expect(requestInit?.signal).toBe(signal)
    expect(page).toEqual({ events: [mockEvents[0]], nextCursor: "next-page" })
  })

  it("accepts an empty final page", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ events: [] }))
    await expect(fetchEvents({})).resolves.toEqual({ events: [], nextCursor: null })
  })

  it("maps invalid payloads and malformed JSON to invalid errors", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ events: [{ id: "incomplete" }] }))
    await expect(fetchEvents({})).rejects.toMatchObject({ kind: "invalid" })

    mockFetch.mockResolvedValueOnce({
      ...mockResponse(null),
      json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
    } as Response)
    await expect(fetchEvents({})).rejects.toMatchObject({ kind: "invalid" })
  })

  it.each([401, 403])("maps HTTP %s to a permission error", async (status) => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, status))
    await expect(fetchEvents({})).rejects.toMatchObject({
      kind: "permission",
      status,
    })
  })

  it("maps other HTTP and transport failures to network errors", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, 503))
    await expect(fetchEvents({})).rejects.toMatchObject({ kind: "network" })

    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"))
    await expect(fetchEvents({})).rejects.toMatchObject({ kind: "network" })
  })
})

describe("getEventsAdapter", () => {
  it("selects fixture-backed events in the test environment with in-memory filters and paging", async () => {
    const adapter = await getEventsAdapter()
    const firstPage = await adapter.fetchEvents({
      status: "ongoing",
      category: ["Crypto"],
      limit: 2,
    })

    expect(firstPage.events).toHaveLength(2)
    expect(firstPage.events.every((event) => event.category === "Crypto")).toBe(true)
    expect(firstPage.nextCursor).toBe("2")

    const lastPage = await adapter.fetchEvents({
      status: "ongoing",
      category: ["Crypto"],
      cursor: firstPage.nextCursor,
      limit: 2,
    })
    expect(lastPage.events).toHaveLength(1)
    expect(lastPage.nextCursor).toBeNull()
  })

  it("uses fixtures when explicitly enabled outside the test environment", async () => {
    const nodeEnv = process.env.NODE_ENV
    const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS
    setEnv("NODE_ENV", "production")
    setEnv("NEXT_PUBLIC_USE_MOCKS", "true")

    try {
      const adapter = await getEventsAdapter()
      const page = await adapter.fetchEvents({ limit: 1 })
      expect(page.events[0]).toEqual(mockEvents[0])
    } finally {
      setEnv("NODE_ENV", nodeEnv)
      setEnv("NEXT_PUBLIC_USE_MOCKS", useMocks)
    }
  })

  it("uses the configured API in production when mocks are not enabled", async () => {
    const nodeEnv = process.env.NODE_ENV
    const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS
    setEnv("NODE_ENV", "production")
    setEnv("NEXT_PUBLIC_USE_MOCKS", undefined)
    mockFetch.mockClear()
    mockFetch.mockResolvedValueOnce(mockResponse({ events: [], nextCursor: null }))
    global.fetch = mockFetch

    try {
      const adapter = await getEventsAdapter()
      await expect(adapter.fetchEvents({ limit: 3 })).resolves.toEqual({
        events: [],
        nextCursor: null,
      })
      expect(mockFetch).toHaveBeenCalledTimes(1)
    } finally {
      setEnv("NODE_ENV", nodeEnv)
      setEnv("NEXT_PUBLIC_USE_MOCKS", useMocks)
    }
  })
})
