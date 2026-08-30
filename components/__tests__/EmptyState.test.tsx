import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { EmptyState } from "../EmptyState"

const noop = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
})

describe("EmptyState Component — Rendering", () => {
  it("renders with default props successfully", () => {
    render(<EmptyState />)
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: /market not found/i })).toBeInTheDocument()
    expect(
      screen.getByText(/the prediction market you are looking for does not exist/i)
    ).toBeInTheDocument()
  })

  it("renders with custom title and description", () => {
    render(
      <EmptyState
        title="Custom Empty Title"
        description="Custom empty state description text."
      />
    )
    expect(screen.getByRole("heading", { level: 2, name: /custom empty title/i })).toBeInTheDocument()
    expect(screen.getByText("Custom empty state description text.")).toBeInTheDocument()
  })

  it("renders custom CTA text", () => {
    render(<EmptyState ctaText="Custom Go Back" />)
    expect(screen.getByRole("link", { name: /custom go back/i })).toBeInTheDocument()
  })

  it("applies custom class name to the container", () => {
    const { container } = render(<EmptyState className="custom-test-class" />)
    expect(container.firstChild).toHaveClass("custom-test-class")
  })
})

describe("EmptyState Component — Interactions", () => {
  it("calls onCtaClick when button is clicked (without href)", () => {
    const onCtaClick = jest.fn()
    render(<EmptyState onCtaClick={onCtaClick} ctaHref="" />)
    const button = screen.getByRole("button", { name: /back to markets/i })
    fireEvent.click(button)
    expect(onCtaClick).toHaveBeenCalledTimes(1)
  })
})

describe("EmptyState Component — Accessibility (WCAG 2.1 AA)", () => {
  it("defines status role for assistive technologies", () => {
    render(<EmptyState />)
    const container = screen.getByRole("status")
    expect(container).toBeInTheDocument()
  })

  it("sets aria-live to polite to notify screen readers cleanly", () => {
    render(<EmptyState />)
    const container = screen.getByRole("status")
    expect(container).toHaveAttribute("aria-live", "polite")
  })

  it("ensures custom SVG/illustration is hidden from screen readers", () => {
    const { container } = render(<EmptyState />)
    const svg = container.querySelector("svg")
    expect(svg).toHaveAttribute("aria-hidden", "true")
  })
})
