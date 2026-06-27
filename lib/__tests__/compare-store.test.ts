/**
 * compare-store.test.ts
 * Unit tests for the compare Zustand store logic.
 */
import { act } from "react"
import { useCompareStore, MAX_COMPARE } from "@/lib/compare-store"

// Reset store between tests
beforeEach(() => {
  act(() => {
    useCompareStore.setState({ selectedIds: [], overlayOpen: false })
  })
})

describe("useCompareStore", () => {
  it("starts empty", () => {
    const { selectedIds, overlayOpen } = useCompareStore.getState()
    expect(selectedIds).toEqual([])
    expect(overlayOpen).toBe(false)
  })

  it("toggle adds an id when under limit", () => {
    act(() => useCompareStore.getState().toggle("1"))
    expect(useCompareStore.getState().selectedIds).toEqual(["1"])
  })

  it("toggle removes id when already selected", () => {
    act(() => {
      useCompareStore.getState().toggle("1")
      useCompareStore.getState().toggle("1")
    })
    expect(useCompareStore.getState().selectedIds).toEqual([])
  })

  it(`caps selection at ${MAX_COMPARE}`, () => {
    act(() => {
      useCompareStore.getState().toggle("1")
      useCompareStore.getState().toggle("2")
      useCompareStore.getState().toggle("3") // should be ignored
    })
    const { selectedIds } = useCompareStore.getState()
    expect(selectedIds).toHaveLength(MAX_COMPARE)
    expect(selectedIds).not.toContain("3")
  })

  it("deselect removes a single id", () => {
    act(() => {
      useCompareStore.getState().toggle("1")
      useCompareStore.getState().toggle("2")
      useCompareStore.getState().deselect("1")
    })
    expect(useCompareStore.getState().selectedIds).toEqual(["2"])
  })

  it("clear resets ids and closes overlay", () => {
    act(() => {
      useCompareStore.getState().toggle("1")
      useCompareStore.getState().toggle("2")
      useCompareStore.getState().openOverlay()
      useCompareStore.getState().clear()
    })
    const { selectedIds, overlayOpen } = useCompareStore.getState()
    expect(selectedIds).toEqual([])
    expect(overlayOpen).toBe(false)
  })

  it("openOverlay sets overlayOpen=true", () => {
    act(() => useCompareStore.getState().openOverlay())
    expect(useCompareStore.getState().overlayOpen).toBe(true)
  })

  it("closeOverlay sets overlayOpen=false without clearing ids", () => {
    act(() => {
      useCompareStore.getState().toggle("1")
      useCompareStore.getState().openOverlay()
      useCompareStore.getState().closeOverlay()
    })
    const { selectedIds, overlayOpen } = useCompareStore.getState()
    expect(overlayOpen).toBe(false)
    expect(selectedIds).toEqual(["1"])
  })
})
