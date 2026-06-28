import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { MarketFilters } from "../MarketFilters"
import { useEventsStore } from "@/lib/events-store"

beforeEach(() => {
  useEventsStore.setState({
    filters: {
      search: "",
      category: [],
      oddsRange: [0, 10],
      dateRange: { from: null, to: null },
      status: "ongoing",
    },
  })
})

describe("MarketFilters", () => {
  it("renders category pills for all default categories", () => {
    render(<MarketFilters />)
    expect(screen.getByRole("checkbox", { name: /football/i })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: /politics/i })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: /crypto/i })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: /stocks/i })).toBeInTheDocument()
  })

  it("reflects store filter state on selected pills", () => {
    useEventsStore.setState({ filters: { search: "", category: ["Crypto"], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    render(<MarketFilters />)
    expect(screen.getByRole("checkbox", { name: /crypto/i })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("checkbox", { name: /football/i })).toHaveAttribute("aria-checked", "false")
  })

  it("toggles a category on click", () => {
    render(<MarketFilters />)
    fireEvent.click(screen.getByRole("checkbox", { name: /^politics/i }))
    expect(useEventsStore.getState().filters.category).toEqual(["Politics"])
  })

  it("deselects an already-selected category on click", () => {
    useEventsStore.setState({ filters: { search: "", category: ["Politics", "Crypto"], oddsRange: [0, 10], dateRange: { from: null, to: null }, status: "ongoing" } })
    render(<MarketFilters />)
    fireEvent.click(screen.getByRole("checkbox", { name: /^politics/i }))
    expect(useEventsStore.getState().filters.category).toEqual(["Crypto"])
  })

  it("accepts custom categories", () => {
    const customCategories = [
      { value: "Sports", label: "Sports" },
      { value: "Entertainment", label: "Entertainment" },
    ]
    render(<MarketFilters categories={customCategories} />)
    expect(screen.getByRole("checkbox", { name: /sports/i })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: /entertainment/i })).toBeInTheDocument()
    expect(screen.queryByRole("checkbox", { name: /football/i })).not.toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<MarketFilters className="custom-class" />)
    const outer = container.firstChild as HTMLElement
    expect(outer).toHaveClass("custom-class")
  })
})
