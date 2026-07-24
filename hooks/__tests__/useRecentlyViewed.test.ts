import { act, renderHook } from "@testing-library/react"
import { useRecentlyViewed } from "../useRecentlyViewed"

const marketA = { id: "1", title: "Market A", category: "Football", href: "/events/event-page/1" }
const marketB = { id: "2", title: "Market B", category: "Crypto", href: "/events/event-page/2" }
const marketC = { id: "3", title: "Market C", category: "Politics", href: "/events/event-page/3" }

describe("useRecentlyViewed", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("starts with an empty list", () => {
    const { result } = renderHook(() => useRecentlyViewed())
    expect(result.current.items).toEqual([])
  })

  it("adds an item to the list", () => {
    const { result } = renderHook(() => useRecentlyViewed())

    act(() => {
      result.current.addRecentlyViewed(marketA)
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].id).toBe("1")
    expect(result.current.items[0].title).toBe("Market A")
  })

  it("prepends new items (most recent first)", () => {
    const { result } = renderHook(() => useRecentlyViewed())

    act(() => {
      result.current.addRecentlyViewed(marketA)
    })
    act(() => {
      result.current.addRecentlyViewed(marketB)
    })

    expect(result.current.items).toHaveLength(2)
    expect(result.current.items[0].id).toBe("2")
    expect(result.current.items[1].id).toBe("1")
  })

  it("deduplicates by id, moving the existing entry to the front", () => {
    const { result } = renderHook(() => useRecentlyViewed())

    act(() => {
      result.current.addRecentlyViewed(marketA)
    })
    act(() => {
      result.current.addRecentlyViewed(marketB)
    })
    act(() => {
      result.current.addRecentlyViewed(marketA)
    })

    expect(result.current.items).toHaveLength(2)
    expect(result.current.items[0].id).toBe("1")
    expect(result.current.items[1].id).toBe("2")
  })

  it("limits the list to 10 items", () => {
    const { result } = renderHook(() => useRecentlyViewed())

    act(() => {
      for (let i = 1; i <= 12; i++) {
        result.current.addRecentlyViewed({
          id: `${i}`,
          title: `Market ${i}`,
          category: "Sports",
          href: `/events/event-page/${i}`,
        })
      }
    })

    expect(result.current.items).toHaveLength(10)
    expect(result.current.items[0].id).toBe("12")
    expect(result.current.items[9].id).toBe("3")
  })

  it("removes an item by id", () => {
    const { result } = renderHook(() => useRecentlyViewed())

    act(() => {
      result.current.addRecentlyViewed(marketA)
      result.current.addRecentlyViewed(marketB)
      result.current.addRecentlyViewed(marketC)
    })

    act(() => {
      result.current.removeRecentlyViewed("2")
    })

    expect(result.current.items).toHaveLength(2)
    expect(result.current.items.find((i) => i.id === "2")).toBeUndefined()
  })

  it("clears all items", () => {
    const { result } = renderHook(() => useRecentlyViewed())

    act(() => {
      result.current.addRecentlyViewed(marketA)
      result.current.addRecentlyViewed(marketB)
    })

    act(() => {
      result.current.clearRecentlyViewed()
    })

    expect(result.current.items).toEqual([])
  })

  it("persists items across remounts", () => {
    const first = renderHook(() => useRecentlyViewed())
    act(() => {
      first.result.current.addRecentlyViewed(marketA)
      first.result.current.addRecentlyViewed(marketB)
    })
    first.unmount()

    const second = renderHook(() => useRecentlyViewed())
    expect(second.result.current.items).toHaveLength(2)
    expect(second.result.current.items[0].id).toBe("2")
    expect(second.result.current.items[1].id).toBe("1")
  })

  it("handles localStorage being full without throwing", () => {
    const setItemMock = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError")
      })

    const { result } = renderHook(() => useRecentlyViewed())
    act(() => {
      expect(() => result.current.addRecentlyViewed(marketA)).not.toThrow()
    })

    setItemMock.mockRestore()
  })
})
