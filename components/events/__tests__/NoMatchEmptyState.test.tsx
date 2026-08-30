import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { NoMatchEmptyState } from "../NoMatchEmptyState"

const noop = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("NoMatchEmptyState — rendering", () => {
  it("renders without crashing with no active filters", () => {
    expect(() =>
      render(<NoMatchEmptyState onClearFilters={noop} />)
    ).not.toThrow()
  })

  it("renders the 'Clear all filters' button", () => {
    render(<NoMatchEmptyState onClearFilters={noop} />)
    expect(
      screen.getByRole("button", { name: /clear all filters/i })
    ).toBeInTheDocument()
  })

  it("applies a custom className to the wrapper", () => {
    const { container } = render(
      <NoMatchEmptyState onClearFilters={noop} className="my-custom-class" />
    )
    expect(container.firstChild).toHaveClass("my-custom-class")
  })
})

// ─── Context-aware copy ───────────────────────────────────────────────────────

describe("NoMatchEmptyState — context-aware headings and copy", () => {
  it("shows search-specific copy when only hasSearch is true", () => {
    render(<NoMatchEmptyState hasSearch onClearFilters={noop} />)
    expect(
      screen.getByRole("heading", { name: /no markets match your search/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/different keywords/i)).toBeInTheDocument()
  })

  it("shows category-specific copy when only hasCategories is true", () => {
    render(<NoMatchEmptyState hasCategories onClearFilters={noop} />)
    expect(
      screen.getByRole("heading", { name: /no markets in this category/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/selected categories/i)).toBeInTheDocument()
  })

  it("shows date-range-specific copy when only hasDateRange is true", () => {
    render(<NoMatchEmptyState hasDateRange onClearFilters={noop} />)
    expect(
      screen.getByRole("heading", { name: /no markets in that date range/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/selected dates/i)).toBeInTheDocument()
  })

  it("shows generic fallback copy when multiple filters are active", () => {
    render(
      <NoMatchEmptyState hasSearch hasCategories hasDateRange onClearFilters={noop} />
    )
    expect(
      screen.getByRole("heading", { name: /no matching markets/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/adjust your search/i)).toBeInTheDocument()
  })

  it("shows generic fallback copy when no filter flags are set", () => {
    render(<NoMatchEmptyState onClearFilters={noop} />)
    expect(
      screen.getByRole("heading", { name: /no matching markets/i })
    ).toBeInTheDocument()
  })

  it("shows generic fallback copy for mixed search + categories", () => {
    render(<NoMatchEmptyState hasSearch hasCategories onClearFilters={noop} />)
    expect(
      screen.getByRole("heading", { name: /no matching markets/i })
    ).toBeInTheDocument()
  })

  it("shows generic fallback copy for mixed categories + date range", () => {
    render(<NoMatchEmptyState hasCategories hasDateRange onClearFilters={noop} />)
    expect(
      screen.getByRole("heading", { name: /no matching markets/i })
    ).toBeInTheDocument()
  })
})

// ─── Interaction ──────────────────────────────────────────────────────────────

describe("NoMatchEmptyState — interaction", () => {
  it("calls onClearFilters when the button is clicked", () => {
    const onClear = jest.fn()
    render(<NoMatchEmptyState onClearFilters={onClear} />)
    fireEvent.click(screen.getByRole("button", { name: /clear all filters/i }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it("does not call onClearFilters before the button is clicked", () => {
    const onClear = jest.fn()
    render(<NoMatchEmptyState onClearFilters={onClear} />)
    expect(onClear).not.toHaveBeenCalled()
  })
})

// ─── Accessibility ────────────────────────────────────────────────────────────

describe("NoMatchEmptyState — accessibility", () => {
  it("has role=status for live-region announcement", () => {
    render(<NoMatchEmptyState onClearFilters={noop} />)
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("has aria-live=polite on the status region", () => {
    render(<NoMatchEmptyState onClearFilters={noop} />)
    const region = screen.getByRole("status")
    expect(region).toHaveAttribute("aria-live", "polite")
  })

  it("has a descriptive aria-label on the status region", () => {
    render(<NoMatchEmptyState hasSearch onClearFilters={noop} />)
    const region = screen.getByRole("status")
    expect(region).toHaveAttribute("aria-label", "No markets match your search")
  })

  it("the 'Clear all filters' button is keyboard-focusable (type=button)", () => {
    render(<NoMatchEmptyState onClearFilters={noop} />)
    const button = screen.getByRole("button", { name: /clear all filters/i })
    expect(button).toHaveAttribute("type", "button")
  })
})
