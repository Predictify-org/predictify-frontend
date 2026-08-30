/**
 * Tests for EventsEmptyState
 *
 * Covers:
 *  - Default rendering with campaign-branded copy
 *  - Custom prop overrides (title, description, ctaText, ctaHref, onCtaClick)
 *  - WCAG 2.1 AA accessibility requirements (role, aria-live, aria-label)
 *  - Interaction: onCtaClick fires correctly
 *  - Custom className propagation
 *
 * Testing patterns follow the project's established style:
 *  - @testing-library/react for rendering
 *  - Role / text-content / attribute assertions
 *  - No snapshot tests (too brittle for styled components)
 */

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { EventsEmptyState } from "../EventsEmptyState"

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("EventsEmptyState — rendering", () => {
  it("renders without crashing", () => {
    expect(() => render(<EventsEmptyState />)).not.toThrow()
  })

  it("renders the default campaign-branded heading", () => {
    render(<EventsEmptyState />)
    expect(
      screen.getByRole("heading", { name: /no events yet/i })
    ).toBeInTheDocument()
  })

  it("renders the default description mentioning GrantFox FWC26", () => {
    render(<EventsEmptyState />)
    // Description is a <p> element; use getAllByText in case the campaign name
    // also appears in the pill label, then assert at least one match exists.
    const matches = screen.getAllByText(/GrantFox FWC26/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it("renders the default CTA button with correct label", () => {
    render(<EventsEmptyState />)
    // The button text comes from ctaText default
    expect(
      screen.getByRole("link", { name: /create your first event/i })
    ).toBeInTheDocument()
  })

  it("renders the GrantFox FWC26 · Stellar Wave campaign pill", () => {
    render(<EventsEmptyState />)
    expect(screen.getByText(/GrantFox FWC26\s*·\s*Stellar Wave/)).toBeInTheDocument()
  })

  it("has a data-testid on the wrapper for integration queries", () => {
    render(<EventsEmptyState />)
    expect(screen.getByTestId("events-empty-state")).toBeInTheDocument()
  })
})

// ─── Custom props ─────────────────────────────────────────────────────────────

describe("EventsEmptyState — custom props", () => {
  it("renders a custom title", () => {
    render(<EventsEmptyState title="My custom heading" />)
    expect(
      screen.getByRole("heading", { name: /my custom heading/i })
    ).toBeInTheDocument()
  })

  it("renders a custom description", () => {
    render(<EventsEmptyState description="A custom description text." />)
    expect(screen.getByText(/a custom description text/i)).toBeInTheDocument()
  })

  it("renders a custom ctaText on the link", () => {
    render(<EventsEmptyState ctaText="Browse Markets" ctaHref="/markets" />)
    expect(
      screen.getByRole("link", { name: /browse markets/i })
    ).toBeInTheDocument()
  })

  it("renders the CTA as a link when ctaHref is provided", () => {
    render(<EventsEmptyState ctaHref="/events/new" ctaText="Start" />)
    const link = screen.getByRole("link", { name: /start/i })
    expect(link).toHaveAttribute("href", "/events/new")
  })

  it("renders the CTA as a button when onCtaClick is provided (no ctaHref)", () => {
    const handler = jest.fn()
    render(<EventsEmptyState onCtaClick={handler} ctaHref={undefined} ctaText="Go" />)
    // Should be a button, not a link
    const button = screen.getByRole("button", { name: /go/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute("type", "button")
  })

  it("applies a custom className to the wrapper element", () => {
    const { container } = render(
      <EventsEmptyState className="test-custom-class" />
    )
    expect(container.firstChild).toHaveClass("test-custom-class")
  })
})

// ─── Interaction ──────────────────────────────────────────────────────────────

describe("EventsEmptyState — interaction", () => {
  it("calls onCtaClick when the button CTA is clicked", () => {
    const handler = jest.fn()
    render(<EventsEmptyState onCtaClick={handler} ctaHref={undefined} ctaText="Click me" />)
    fireEvent.click(screen.getByRole("button", { name: /click me/i }))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it("does not call onCtaClick before the button is clicked", () => {
    const handler = jest.fn()
    render(<EventsEmptyState onCtaClick={handler} ctaHref={undefined} />)
    expect(handler).not.toHaveBeenCalled()
  })
})

// ─── Accessibility ────────────────────────────────────────────────────────────

describe("EventsEmptyState — accessibility", () => {
  it("has role=status for live-region announcement on state transitions", () => {
    render(<EventsEmptyState />)
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("has aria-live=polite so screen readers announce non-interruptively", () => {
    render(<EventsEmptyState />)
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite")
  })

  it("has a descriptive aria-label matching the title", () => {
    render(<EventsEmptyState title="No upcoming events" />)
    const region = screen.getByRole("status")
    expect(region).toHaveAttribute("aria-label", "No upcoming events")
  })

  it("aria-label defaults to the default title when no title prop is passed", () => {
    render(<EventsEmptyState />)
    const region = screen.getByRole("status")
    // The default title contains "No events yet"
    expect(region).toHaveAttribute("aria-label", expect.stringMatching(/no events yet/i))
  })

  it("the button CTA is keyboard-focusable with type=button", () => {
    const handler = jest.fn()
    render(<EventsEmptyState onCtaClick={handler} ctaHref={undefined} ctaText="Action" />)
    const button = screen.getByRole("button", { name: /action/i })
    expect(button).toHaveAttribute("type", "button")
  })

  it("decorative SVG illustration is hidden from assistive technology", () => {
    render(<EventsEmptyState />)
    // The SVG illustration wrapper has aria-hidden="true"
    // We check that no role="img" is exposed to AT (the SVG has role="img"
    // but aria-hidden collapses it from the AT tree in real browsers; in RTL
    // we verify the aria-hidden attribute is present on the outer halo div)
    const haloDiv = screen.getByTestId("events-empty-state").querySelector('[aria-hidden="true"]')
    expect(haloDiv).toBeInTheDocument()
  })

  it("the campaign pill has an accessible label", () => {
    render(<EventsEmptyState />)
    const pill = screen.getByLabelText(/GrantFox FWC26.*Stellar Wave/i)
    expect(pill).toBeInTheDocument()
  })
})
