import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { Breadcrumbs } from "../Breadcrumbs"

function mockReducedMotion(reduced: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }))
}

const dashboardEvents = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Events", isCurrentPage: true },
]

const dashboardEventsNew = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Events", href: "/events" },
  { label: "New Event", isCurrentPage: true },
]

describe("Breadcrumbs", () => {
  beforeEach(() => {
    mockReducedMotion(false)
  })

  it("renders every crumb label and links all but the active one", () => {
    render(<Breadcrumbs items={dashboardEvents} />)

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard")
    expect(screen.queryByRole("link", { name: "Events" })).not.toBeInTheDocument()
  })

  it("marks exactly one crumb as the current page", () => {
    render(<Breadcrumbs items={dashboardEventsNew} />)
    const current = screen.getAllByText("New Event")
    expect(current).toHaveLength(1)
    expect(screen.getByText("New Event")).toHaveAttribute("aria-current", "page")
  })

  it("morphs to the new active crumb when route depth changes", async () => {
    const { rerender } = render(<Breadcrumbs items={dashboardEvents} />)
    expect(screen.getByText("Events")).toHaveAttribute("aria-current", "page")

    rerender(<Breadcrumbs items={dashboardEventsNew} />)

    await waitFor(() => {
      expect(screen.getByText("New Event")).toHaveAttribute("aria-current", "page")
    })
    // "Events" now persists as a linked ancestor crumb, not the active one —
    // exactly one element should carry aria-current once the morph settles.
    await waitFor(() => {
      expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1)
    })
    expect(screen.getByRole("link", { name: "Events" })).toHaveAttribute("href", "/events")
  })

  it("does not re-trigger a morph when the trail is unchanged", () => {
    const { rerender } = render(<Breadcrumbs items={dashboardEvents} />)
    const before = screen.getByText("Events")

    // Same content, new array reference — simulates an unrelated parent re-render.
    rerender(<Breadcrumbs items={[...dashboardEvents]} />)

    expect(screen.getByText("Events")).toBe(before)
  })

  it("renders an instantaneous, unanimated swap under prefers-reduced-motion", () => {
    mockReducedMotion(true)
    const { rerender } = render(<Breadcrumbs items={dashboardEvents} />)
    expect(screen.getByText("Events")).toHaveAttribute("aria-current", "page")

    rerender(<Breadcrumbs items={dashboardEventsNew} />)

    // No exit animation to wait out — the swap is synchronous and there is
    // exactly one current-page crumb immediately after the rerender.
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1)
    expect(screen.getByText("New Event")).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Events" })).toHaveAttribute("href", "/events")
  })

  it("renders the mobile back link when backHref is provided", () => {
    render(<Breadcrumbs items={dashboardEvents} backHref="/dashboard" />)
    expect(screen.getByRole("link", { name: /back/i })).toHaveAttribute("href", "/dashboard")
  })
})
