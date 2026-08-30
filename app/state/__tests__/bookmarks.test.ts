/**
 * bookmarks.test.ts
 *
 * Unit tests for the useBookmarksStore (app/state/bookmarks.ts).
 * Covers: bookmark, unbookmark, toggle, isBookmarked, and persistence helpers.
 */

import { act } from "@testing-library/react"
import { useBookmarksStore } from "../bookmarks"

// ── helpers ──────────────────────────────────────────────────────────────────

/** Reset store to a pristine state between tests. */
function resetStore() {
  act(() => {
    useBookmarksStore.setState({ bookmarkedIds: new Set() })
  })
}

// ── tests ────────────────────────────────────────────────────────────────────

describe("useBookmarksStore", () => {
  beforeEach(() => {
    resetStore()
    // Clear localStorage to ensure clean state
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // --- Initial State ---

  it("initially has no bookmarked markets", () => {
    const { isBookmarked } = useBookmarksStore.getState()
    expect(isBookmarked("market-1")).toBe(false)
  })

  it("returns false for any market when store is empty", () => {
    const { isBookmarked } = useBookmarksStore.getState()
    expect(isBookmarked("market-1")).toBe(false)
    expect(isBookmarked("market-2")).toBe(false)
    expect(isBookmarked("non-existent")).toBe(false)
  })

  // --- bookmark() ---

  it("bookmark() adds a market to the bookmarked set", () => {
    act(() => useBookmarksStore.getState().bookmark("market-1"))
    expect(useBookmarksStore.getState().isBookmarked("market-1")).toBe(true)
  })

  it("bookmark() can add multiple different markets", () => {
    act(() => {
      useBookmarksStore.getState().bookmark("market-1")
      useBookmarksStore.getState().bookmark("market-2")
      useBookmarksStore.getState().bookmark("market-3")
    })
    expect(useBookmarksStore.getState().isBookmarked("market-1")).toBe(true)
    expect(useBookmarksStore.getState().isBookmarked("market-2")).toBe(true)
    expect(useBookmarksStore.getState().isBookmarked("market-3")).toBe(true)
  })

  it("bookmark() is idempotent (bookmarking same market twice has no side effects)", () => {
    act(() => {
      useBookmarksStore.getState().bookmark("market-1")
      useBookmarksStore.getState().bookmark("market-1")
    })
    expect(useBookmarksStore.getState().isBookmarked("market-1")).toBe(true)
    expect(useBookmarksStore.getState().bookmarkedIds.size).toBe(1)
  })

  // --- unbookmark() ---

  it("unbookmark() removes a previously bookmarked market", () => {
    act(() => {
      useBookmarksStore.getState().bookmark("market-1")
      useBookmarksStore.getState().unbookmark("market-1")
    })
    expect(useBookmarksStore.getState().isBookmarked("market-1")).toBe(false)
  })

  it("unbookmark() does nothing when market is not bookmarked", () => {
    act(() => {
      useBookmarksStore.getState().unbookmark("market-1")
    })
    expect(useBookmarksStore.getState().isBookmarked("market-1")).toBe(false)
  })

  it("unbookmark() only removes the specified market", () => {
    act(() => {
      useBookmarksStore.getState().bookmark("market-1")
      useBookmarksStore.getState().bookmark("market-2")
      useBookmarksStore.getState().unbookmark("market-1")
    })
    expect(useBookmarksStore.getState().isBookmarked("market-1")).toBe(false)
    expect(useBookmarksStore.getState().isBookmarked("market-2")).toBe(true)
  })

  // --- toggle() ---

  it("toggle() bookmarks a market when not bookmarked and returns true", () => {
    let result: boolean
    act(() => {
      result = useBookmarksStore.getState().toggle("market-1")
    })
    expect(result!).toBe(true)
    expect(useBookmarksStore.getState().isBookmarked("market-1")).toBe(true)
  })

  it("toggle() unbookmarks a market when bookmarked and returns false", () => {
    act(() => {
      useBookmarksStore.getState().bookmark("market-1")
    })
    let result: boolean
    act(() => {
      result = useBookmarksStore.getState().toggle("market-1")
    })
    expect(result!).toBe(false)
    expect(useBookmarksStore.getState().isBookmarked("market-1")).toBe(false)
  })

  it("toggle() can be called multiple times to alternate state", () => {
    let result1: boolean, result2: boolean, result3: boolean
    act(() => {
      result1 = useBookmarksStore.getState().toggle("market-1")
      result2 = useBookmarksStore.getState().toggle("market-1")
      result3 = useBookmarksStore.getState().toggle("market-1")
    })
    expect(result1!).toBe(true)
    expect(result2!).toBe(false)
    expect(result3!).toBe(true)
    expect(useBookmarksStore.getState().isBookmarked("market-1")).toBe(true)
  })

  // --- isBookmarked() ---

  it("isBookmarked() returns correct state for multiple markets", () => {
    act(() => {
      useBookmarksStore.getState().bookmark("market-A")
      useBookmarksStore.getState().bookmark("market-C")
    })
    expect(useBookmarksStore.getState().isBookmarked("market-A")).toBe(true)
    expect(useBookmarksStore.getState().isBookmarked("market-B")).toBe(false)
    expect(useBookmarksStore.getState().isBookmarked("market-C")).toBe(true)
  })

  // --- Independence ---

  it("bookmarking one market does not affect another", () => {
    act(() => useBookmarksStore.getState().bookmark("market-A"))
    expect(useBookmarksStore.getState().isBookmarked("market-A")).toBe(true)
    expect(useBookmarksStore.getState().isBookmarked("market-B")).toBe(false)
  })

  // --- Edge Cases ---

  it("handles empty string as marketId", () => {
    act(() => useBookmarksStore.getState().bookmark(""))
    expect(useBookmarksStore.getState().isBookmarked("")).toBe(true)
  })

  it("handles special characters in marketId", () => {
    const specialId = "market-123!@#$%^&*()"
    act(() => useBookmarksStore.getState().bookmark(specialId))
    expect(useBookmarksStore.getState().isBookmarked(specialId)).toBe(true)
  })

  it("handles very long marketId strings", () => {
    const longId = "m".repeat(1000)
    act(() => useBookmarksStore.getState().bookmark(longId))
    expect(useBookmarksStore.getState().isBookmarked(longId)).toBe(true)
  })

  it("handles unicode characters in marketId", () => {
    const unicodeId = "market-🚀-测试-🎯"
    act(() => useBookmarksStore.getState().bookmark(unicodeId))
    expect(useBookmarksStore.getState().isBookmarked(unicodeId)).toBe(true)
  })

  // --- Persistence ---

  it("stores bookmarked markets in localStorage", () => {
    act(() => {
      useBookmarksStore.getState().bookmark("market-1")
      useBookmarksStore.getState().bookmark("market-2")
    })
    
    const stored = localStorage.getItem("predictify-bookmarks")
    expect(stored).toBeTruthy()
    
    const parsed = JSON.parse(stored!)
    expect(parsed.state.bookmarkedIds).toContain("market-1")
    expect(parsed.state.bookmarkedIds).toContain("market-2")
  })

  it("removes bookmarks from localStorage when unbookmarked", () => {
    act(() => {
      useBookmarksStore.getState().bookmark("market-1")
      useBookmarksStore.getState().bookmark("market-2")
      useBookmarksStore.getState().unbookmark("market-1")
    })
    
    const stored = localStorage.getItem("predictify-bookmarks")
    const parsed = JSON.parse(stored!)
    expect(parsed.state.bookmarkedIds).not.toContain("market-1")
    expect(parsed.state.bookmarkedIds).toContain("market-2")
  })

  // --- Performance ---

  it("handles large numbers of bookmarks efficiently", () => {
    const startTime = Date.now()
    act(() => {
      for (let i = 0; i < 1000; i++) {
        useBookmarksStore.getState().bookmark(`market-${i}`)
      }
    })
    const endTime = Date.now()
    
    expect(endTime - startTime).toBeLessThan(1000) // Should complete in under 1 second
    expect(useBookmarksStore.getState().bookmarkedIds.size).toBe(1000)
  })
})
