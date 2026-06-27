import { act, renderHook } from "@testing-library/react"
import { useWhatsNew, type ChangelogEntry } from "../use-whats-new"

const entries: ChangelogEntry[] = [
  {
    id: "v2",
    version: "2.0",
    date: "2026-06-20",
    title: "Second release",
    description: "Newer entry",
    highlights: [],
  },
  {
    id: "v1",
    version: "1.0",
    date: "2026-05-01",
    title: "First release",
    description: "Older entry",
    highlights: [],
  },
]

describe("useWhatsNew", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("flags the latest entry as unseen on first run", () => {
    const { result } = renderHook(() => useWhatsNew(entries))
    expect(result.current.hasUnseen).toBe(true)
  })

  it("returns no unseen entries when the changelog is empty", () => {
    const { result } = renderHook(() => useWhatsNew([]))
    expect(result.current.hasUnseen).toBe(false)
  })

  it("clears the unseen flag when markSeen is called", () => {
    const { result } = renderHook(() => useWhatsNew(entries))

    act(() => {
      result.current.markSeen()
    })

    expect(result.current.hasUnseen).toBe(false)
  })

  it("persists the seen state across remounts", () => {
    const first = renderHook(() => useWhatsNew(entries))
    act(() => {
      first.result.current.markSeen()
    })
    first.unmount()

    const second = renderHook(() => useWhatsNew(entries))
    expect(second.result.current.hasUnseen).toBe(false)
  })

  it("flags a newly added entry as unseen again after a previous one was seen", () => {
    const olderOnly = [entries[1]]
    const first = renderHook(() => useWhatsNew(olderOnly))
    act(() => {
      first.result.current.markSeen()
    })
    first.unmount()

    const second = renderHook(() => useWhatsNew(entries))
    expect(second.result.current.hasUnseen).toBe(true)
  })

  it("dismissForever clears the unseen flag and keeps it cleared for future entries", () => {
    const olderOnly = [entries[1]]
    const first = renderHook(() => useWhatsNew(olderOnly))
    act(() => {
      first.result.current.dismissForever()
    })
    first.unmount()

    const second = renderHook(() => useWhatsNew(entries))
    expect(second.result.current.hasUnseen).toBe(false)
  })

  it("exposes the entries it was given", () => {
    const { result } = renderHook(() => useWhatsNew(entries))
    expect(result.current.entries).toBe(entries)
  })
})
