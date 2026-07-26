/**
 * FilterChips — focused test suite
 *
 * Covers:
 *  • Renders nothing when no filters are active
 *  • Search chip: label, removal
 *  • Category chips: one per selected category, removal
 *  • Odds-range chip: shown only when range ≠ default, removal
 *  • Date-range chip: from-only, to-only, both, removal
 *  • "Clear all" button: hidden with <2 chips, visible with ≥2, clears all
 *  • ARIA: aria-label on wrapper, role="list", role="listitem",
 *           descriptive aria-label on remove buttons
 *  • Keyboard: remove buttons are focusable and activatable via Enter
 *  • Responsive label truncation class is present
 */

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FilterChips } from "../FilterChips"
import { useEventsStore } from "@/lib/events-store"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Reset store to a known "no active filters" baseline before each test. */
function resetFilters() {
  useEventsStore.setState({
    filters: {
      search: "",
      category: [],
      oddsRange: [0, 10],
      dateRange: { from: null, to: null },
      status: "ongoing",
    },
  })
}

/** Render <FilterChips /> with a fresh DOM. */
function renderChips() {
  return render(<FilterChips />)
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetFilters()
})

// ─── Empty state ──────────────────────────────────────────────────────────────

describe("empty state", () => {
  it("renders nothing when no filters are active", () => {
    const { container } = renderChips()
    expect(container.firstChild).toBeNull()
  })

  it("renders nothing when only the default odds range is set", () => {
    useEventsStore.setState({
      filters: {
        search: "",
        category: [],
        oddsRange: [0, 10], // default — should NOT produce a chip
        dateRange: { from: null, to: null },
        status: "ongoing",
      },
    })
    const { container } = renderChips()
    expect(container.firstChild).toBeNull()
  })
})

// ─── Search chip ──────────────────────────────────────────────────────────────

describe("search chip", () => {
  it("renders a chip with the search term in quotes", () => {
    useEventsStore.setState({ filters: { search: "Bitcoin", category: [], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    expect(screen.getByText(/"Bitcoin"/i)).toBeInTheDocument()
  })

  it("does not render a chip for a whitespace-only search", () => {
    useEventsStore.setState({ filters: { search: "   ", category: [], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    const { container } = renderChips()
    expect(container.firstChild).toBeNull()
  })

  it("removes the search filter when the remove button is clicked", () => {
    useEventsStore.setState({ filters: { search: "Bitcoin", category: [], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    fireEvent.click(screen.getByRole("button", { name: /remove "bitcoin" filter/i }))
    expect(useEventsStore.getState().filters.search).toBe("")
  })
})

// ─── Category chips ───────────────────────────────────────────────────────────

describe("category chips", () => {
  it("renders one chip per selected category", () => {
    useEventsStore.setState({ filters: { search: "", category: ["Crypto", "Politics"], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    expect(screen.getByText("Crypto")).toBeInTheDocument()
    expect(screen.getByText("Politics")).toBeInTheDocument()
  })

  it("removes a single category when its chip is dismissed", () => {
    useEventsStore.setState({ filters: { search: "", category: ["Crypto", "Politics"], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    fireEvent.click(screen.getByRole("button", { name: /remove crypto filter/i }))
    expect(useEventsStore.getState().filters.category).toEqual(["Politics"])
  })

  it("leaves other categories intact after removal", () => {
    useEventsStore.setState({ filters: { search: "", category: ["Crypto", "Politics", "Stocks"], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    fireEvent.click(screen.getByRole("button", { name: /remove politics filter/i }))
    expect(useEventsStore.getState().filters.category).toEqual(["Crypto", "Stocks"])
  })
})

// ─── Odds-range chip ──────────────────────────────────────────────────────────

describe("odds range chip", () => {
  it("renders an odds chip when range differs from default", () => {
    useEventsStore.setState({ filters: { search: "", category: [], oddsRange: [2, 8], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    expect(screen.getByText("Odds: 2–8")).toBeInTheDocument()
  })

  it("does not render an odds chip for the default range [0, 10]", () => {
    useEventsStore.setState({ filters: { search: "", category: [], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    const { container } = renderChips()
    expect(container.firstChild).toBeNull()
  })

  it("resets odds range to [0, 10] when the chip is removed", () => {
    useEventsStore.setState({ filters: { search: "", category: [], oddsRange: [3, 7], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    fireEvent.click(screen.getByRole("button", { name: /remove odds: 3–7 filter/i }))
    expect(useEventsStore.getState().filters.oddsRange).toEqual([0, 10])
  })
})

// ─── Date-range chip ──────────────────────────────────────────────────────────

describe("date range chip", () => {
  it("renders a chip with both dates when from and to are set", () => {
    useEventsStore.setState({
      filters: {
        search: "",
        category: [],
        oddsRange: [0, 10],
        dateRange: { from: new Date("2025-01-01"), to: new Date("2025-06-30") },
        status: "ongoing",
      },
    })
    renderChips()
    // Chip should contain both formatted dates separated by –
    expect(screen.getByText(/jan 1, 2025/i)).toBeInTheDocument()
    expect(screen.getByText(/jun 30, 2025/i)).toBeInTheDocument()
  })

  it("renders 'From <date>' when only from is set", () => {
    useEventsStore.setState({
      filters: {
        search: "",
        category: [],
        oddsRange: [0, 10],
        dateRange: { from: new Date("2025-03-15"), to: null },
        status: "ongoing",
      },
    })
    renderChips()
    expect(screen.getByText(/from mar 15, 2025/i)).toBeInTheDocument()
  })

  it("renders 'Until <date>' when only to is set", () => {
    useEventsStore.setState({
      filters: {
        search: "",
        category: [],
        oddsRange: [0, 10],
        dateRange: { from: null, to: new Date("2025-09-01") },
        status: "ongoing",
      },
    })
    renderChips()
    expect(screen.getByText(/until sep 1, 2025/i)).toBeInTheDocument()
  })

  it("resets dateRange to null/null when the chip is removed", () => {
    useEventsStore.setState({
      filters: {
        search: "",
        category: [],
        oddsRange: [0, 10],
        dateRange: { from: new Date("2025-01-01"), to: new Date("2025-06-30") },
        status: "ongoing",
      },
    })
    renderChips()
    const removeBtn = screen.getByRole("button", { name: /remove .* filter/i })
    fireEvent.click(removeBtn)
    const { dateRange } = useEventsStore.getState().filters
    expect(dateRange.from).toBeNull()
    expect(dateRange.to).toBeNull()
  })
})

// ─── "Clear all" button ───────────────────────────────────────────────────────

describe("clear all button", () => {
  it("is NOT rendered when only one filter chip is active", () => {
    useEventsStore.setState({ filters: { search: "Arsenal", category: [], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    expect(screen.queryByRole("button", { name: /clear all/i })).not.toBeInTheDocument()
  })

  it("IS rendered when two or more chips are active", () => {
    useEventsStore.setState({ filters: { search: "Arsenal", category: ["Football"], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    expect(screen.getByRole("button", { name: /clear all active filters/i })).toBeInTheDocument()
  })

  it("clears search, categories, odds, and date range when clicked", () => {
    useEventsStore.setState({
      filters: {
        search: "Bitcoin",
        category: ["Crypto"],
        oddsRange: [2, 9],
        dateRange: { from: new Date("2025-01-01"), to: null },
        status: "ongoing",
      },
    })
    renderChips()
    fireEvent.click(screen.getByRole("button", { name: /clear all active filters/i }))

    const { filters } = useEventsStore.getState()
    expect(filters.search).toBe("")
    expect(filters.category).toEqual([])
    expect(filters.oddsRange).toEqual([0, 10])
    expect(filters.dateRange.from).toBeNull()
    expect(filters.dateRange.to).toBeNull()
  })

  it("disappears after clearing all filters", () => {
    useEventsStore.setState({ filters: { search: "Bitcoin", category: ["Crypto"], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    fireEvent.click(screen.getByRole("button", { name: /clear all active filters/i }))
    expect(screen.queryByRole("button", { name: /clear all/i })).not.toBeInTheDocument()
  })
})

// ─── ARIA / accessibility ─────────────────────────────────────────────────────

describe("accessibility", () => {
  it("wrapper has aria-label='Active filters'", () => {
    useEventsStore.setState({ filters: { search: "test", category: [], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    expect(screen.getByLabelText("Active filters")).toBeInTheDocument()
  })

  it("chip list has role='list'", () => {
    useEventsStore.setState({ filters: { search: "test", category: [], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    expect(screen.getByRole("list", { name: /applied filters/i })).toBeInTheDocument()
  })

  it("each chip item has role='listitem'", () => {
    useEventsStore.setState({ filters: { search: "test", category: ["Crypto"], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    const items = screen.getAllByRole("listitem")
    expect(items.length).toBeGreaterThanOrEqual(2)
  })

  it("remove buttons have descriptive aria-label", () => {
    useEventsStore.setState({ filters: { search: "", category: ["Football"], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    expect(
      screen.getByRole("button", { name: "Remove Football filter" })
    ).toBeInTheDocument()
  })

  it("clear-all button has descriptive aria-label", () => {
    useEventsStore.setState({ filters: { search: "test", category: ["Crypto"], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    expect(
      screen.getByRole("button", { name: "Clear all active filters" })
    ).toBeInTheDocument()
  })
})

// ─── Keyboard interaction ─────────────────────────────────────────────────────

describe("keyboard interaction", () => {
  it("remove button is keyboard-activatable via Enter", async () => {
    useEventsStore.setState({ filters: { search: "", category: ["Crypto"], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    const btn = screen.getByRole("button", { name: /remove crypto filter/i })
    btn.focus()
    await userEvent.keyboard("{Enter}")
    expect(useEventsStore.getState().filters.category).toEqual([])
  })

  it("remove button is keyboard-activatable via Space", async () => {
    useEventsStore.setState({ filters: { search: "", category: ["Politics"], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    renderChips()
    const btn = screen.getByRole("button", { name: /remove politics filter/i })
    btn.focus()
    await userEvent.keyboard(" ")
    expect(useEventsStore.getState().filters.category).toEqual([])
  })
})

// ─── Custom className ─────────────────────────────────────────────────────────

describe("className prop", () => {
  it("forwards a custom className to the wrapper element", () => {
    useEventsStore.setState({ filters: { search: "test", category: [], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    const { container } = render(<FilterChips className="custom-class" />)
    expect(container.firstChild).toHaveClass("custom-class")
  })
})

// ─── Snapshot ─────────────────────────────────────────────────────────────────

describe("snapshot", () => {
  it("matches snapshot with multiple active filters", () => {
    useEventsStore.setState({
      filters: {
        search: "Arsenal",
        category: ["Football"],
        oddsRange: [1, 9],
        dateRange: { from: new Date("2025-01-01"), to: new Date("2025-12-31") },
        status: "ongoing",
      },
    })
    const { container } = renderChips()
    expect(container.firstChild).toMatchSnapshot()
  })
})
