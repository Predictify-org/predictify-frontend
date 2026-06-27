/**
 * compare-overlay.test.tsx
 * Component tests for CompareOverlay and CompareSelectionChip.
 */
import React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { CompareOverlay } from "@/components/market/CompareOverlay"
import { CompareSelectionChip } from "@/components/market/CompareSelectionChip"
import { useCompareStore } from "@/lib/compare-store"
import { useEventsStore } from "@/lib/events-store"

// ── minimal mock events ──────────────────────────────────────────────────────
const mockEvents = [
  {
    id: "1",
    title: "Arsenal vs Liverpool",
    txHash: "TXN001",
    category: "Football" as const,
    odds: 7.0,
    startDate: "2025-04-12T14:00:00Z",
    endDate: "2025-12-12T16:00:00Z",
    status: "ongoing" as const,
    timeRemaining: "90:00:00:00",
    timeRemainingMs: 90 * 24 * 60 * 60 * 1000,
    participants: 1245,
  },
  {
    id: "2",
    title: "Bitcoin Price",
    txHash: "TXN002",
    category: "Crypto" as const,
    odds: 3.5,
    startDate: "2025-05-01T00:00:00Z",
    endDate: "2025-11-01T00:00:00Z",
    status: "upcoming" as const,
    participants: 876,
  },
]

// Seed events store with mock data
beforeEach(() => {
  act(() => {
    useEventsStore.setState({ events: mockEvents, filteredEvents: mockEvents, loading: false })
    useCompareStore.setState({ selectedIds: [], overlayOpen: false })
  })
})

// ── CompareSelectionChip ─────────────────────────────────────────────────────
describe("CompareSelectionChip", () => {
  it("renders nothing when no events selected", () => {
    const { container } = render(<CompareSelectionChip />)
    expect(container.firstChild).toBeNull()
  })

  it("renders chip when one event is selected", () => {
    act(() => useCompareStore.setState({ selectedIds: ["1"] }))
    render(<CompareSelectionChip />)
    expect(screen.getByText("Arsenal vs Liverpool")).toBeInTheDocument()
  })

  it("Compare button is disabled with only 1 selection", () => {
    act(() => useCompareStore.setState({ selectedIds: ["1"] }))
    render(<CompareSelectionChip />)
    const btn = screen.getByRole("button", { name: /compare/i })
    expect(btn).toBeDisabled()
  })

  it("Compare button is enabled with 2 selections", () => {
    act(() => useCompareStore.setState({ selectedIds: ["1", "2"] }))
    render(<CompareSelectionChip />)
    const btn = screen.getByRole("button", { name: /compare/i })
    expect(btn).not.toBeDisabled()
  })

  it("clicking Compare opens the overlay", () => {
    act(() => useCompareStore.setState({ selectedIds: ["1", "2"] }))
    render(<CompareSelectionChip />)
    fireEvent.click(screen.getByRole("button", { name: /compare/i }))
    expect(useCompareStore.getState().overlayOpen).toBe(true)
  })

  it("clicking × on a pill removes that market", () => {
    act(() => useCompareStore.setState({ selectedIds: ["1", "2"] }))
    render(<CompareSelectionChip />)
    fireEvent.click(screen.getByRole("button", { name: /remove Arsenal vs Liverpool/i }))
    expect(useCompareStore.getState().selectedIds).not.toContain("1")
  })

  it("clicking clear button removes all selections", () => {
    act(() => useCompareStore.setState({ selectedIds: ["1", "2"] }))
    render(<CompareSelectionChip />)
    fireEvent.click(screen.getByRole("button", { name: /clear all/i }))
    expect(useCompareStore.getState().selectedIds).toHaveLength(0)
  })
})

// ── CompareOverlay ───────────────────────────────────────────────────────────
describe("CompareOverlay", () => {
  it("is not visible when overlayOpen=false", () => {
    render(<CompareOverlay />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows dialog when overlayOpen=true with 2 markets", () => {
    act(() => useCompareStore.setState({ selectedIds: ["1", "2"], overlayOpen: true }))
    render(<CompareOverlay />)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Compare Markets")).toBeInTheDocument()
  })

  it("renders both market columns", () => {
    act(() => useCompareStore.setState({ selectedIds: ["1", "2"], overlayOpen: true }))
    render(<CompareOverlay />)
    expect(screen.getByText("Arsenal vs Liverpool")).toBeInTheDocument()
    expect(screen.getByText("Bitcoin Price")).toBeInTheDocument()
  })

  it("renders single market column when only 1 selected", () => {
    act(() => useCompareStore.setState({ selectedIds: ["1"], overlayOpen: true }))
    render(<CompareOverlay />)
    expect(screen.getByText("Arsenal vs Liverpool")).toBeInTheDocument()
    expect(screen.queryByText("Bitcoin Price")).not.toBeInTheDocument()
  })

  it("Cmd+Backspace clears selection and closes overlay", () => {
    act(() => useCompareStore.setState({ selectedIds: ["1", "2"], overlayOpen: true }))
    render(<CompareOverlay />)
    act(() => {
      fireEvent.keyDown(window, { key: "Backspace", metaKey: true })
    })
    const { selectedIds, overlayOpen } = useCompareStore.getState()
    expect(selectedIds).toHaveLength(0)
    expect(overlayOpen).toBe(false)
  })

  it("Ctrl+Backspace clears selection and closes overlay", () => {
    act(() => useCompareStore.setState({ selectedIds: ["1", "2"], overlayOpen: true }))
    render(<CompareOverlay />)
    act(() => {
      fireEvent.keyDown(window, { key: "Backspace", ctrlKey: true })
    })
    expect(useCompareStore.getState().selectedIds).toHaveLength(0)
  })

  it("clear button clears selection and closes", () => {
    act(() => useCompareStore.setState({ selectedIds: ["1", "2"], overlayOpen: true }))
    render(<CompareOverlay />)
    fireEvent.click(screen.getByRole("button", { name: /clear comparison/i }))
    expect(useCompareStore.getState().selectedIds).toHaveLength(0)
    expect(useCompareStore.getState().overlayOpen).toBe(false)
  })
})
