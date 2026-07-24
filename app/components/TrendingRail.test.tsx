import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { TrendingRail, TRENDING_MARKETS } from "./TrendingRail"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockOverflow(container: HTMLElement) {
  Object.defineProperty(container, "scrollWidth", {
    value: 3000,
    configurable: true,
  })
  Object.defineProperty(container, "clientWidth", {
    value: 500,
    configurable: true,
  })
  Object.defineProperty(container, "scrollLeft", {
    value: 0,
    writable: true,
    configurable: true,
  })
  container.scrollTo = jest.fn(
    ({ left }: { left: number }) => {
      Object.defineProperty(container, "scrollLeft", {
        value: left,
        writable: true,
        configurable: true,
      })
    },
  ) as unknown as typeof container.scrollTo
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TrendingRail", () => {
  // ---- Rendering ----------------------------------------------------------

  it("renders the heading", () => {
    render(<TrendingRail />)
    expect(
      screen.getByRole("heading", { name: /what's happening now/i }),
    ).toBeInTheDocument()
  })

  it("renders all default trending markets", () => {
    render(<TrendingRail />)
    TRENDING_MARKETS.forEach((market) => {
      expect(screen.getByText(market.title)).toBeInTheDocument()
    })
  })

  it("renders each trending market as a link", () => {
    render(<TrendingRail />)
    const links = screen.getAllByRole("link")
    expect(links.length).toBe(TRENDING_MARKETS.length)
    links.forEach((link) => expect(link).toHaveAttribute("href"))
  })

  // ---- Empty state --------------------------------------------------------

  it("returns nothing when no markets are provided", () => {
    const { container } = render(<TrendingRail markets={[]} />)
    expect(container.innerHTML).toBe("")
  })

  // ---- Hot markets --------------------------------------------------------

  it("shows 'Hot' badge on markets with isHot flag", () => {
    render(<TrendingRail />)
    const hotBadges = screen.getAllByText("Hot")
    const hotMarkets = TRENDING_MARKETS.filter((m) => m.isHot)
    expect(hotBadges.length).toBe(hotMarkets.length)
  })

  // ---- Volume display -----------------------------------------------------

  it("displays 24h volume for each market", () => {
    render(<TrendingRail />)
    TRENDING_MARKETS.forEach((market) => {
      expect(screen.getByText(market.volume)).toBeInTheDocument()
    })
    const volLabels = screen.getAllByText("24h vol")
    expect(volLabels.length).toBe(TRENDING_MARKETS.length)
  })

  // ---- Accessibility ------------------------------------------------------

  it("has a labelled carousel region", () => {
    render(<TrendingRail />)
    expect(
      screen.getByRole("region", { name: /trending markets carousel/i }),
    ).toBeInTheDocument()
  })

  it("the carousel region is keyboard-focusable", () => {
    render(<TrendingRail />)
    expect(
      screen.getByRole("region", { name: /trending markets carousel/i }),
    ).toHaveAttribute("tabIndex", "0")
  })

  // ---- Keyboard navigation ------------------------------------------------

  it("scrolls right on ArrowRight when content overflows", () => {
    render(<TrendingRail />)
    const region = screen.getByRole("region", {
      name: /trending markets carousel/i,
    })
    mockOverflow(region)

    fireEvent.scroll(region)
    fireEvent.keyDown(region, { key: "ArrowRight" })
    expect(region.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" }),
    )
  })

  it("scrolls left on ArrowLeft when content overflows", () => {
    render(<TrendingRail />)
    const region = screen.getByRole("region", {
      name: /trending markets carousel/i,
    })
    mockOverflow(region)
    // Simulate we've scrolled to the right
    Object.defineProperty(region, "scrollLeft", {
      value: 1000,
      writable: true,
      configurable: true,
    })

    fireEvent.scroll(region)
    fireEvent.keyDown(region, { key: "ArrowLeft" })
    expect(region.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" }),
    )
  })

  // ---- Custom markets -----------------------------------------------------

  it("accepts a custom market list", () => {
    const custom = [
      {
        id: "custom-1",
        title: "Custom Market",
        category: "Test",
        volume: "$1k",
        participants: 10,
        odds: 2.0,
        href: "/test",
      },
    ]
    render(<TrendingRail markets={custom} />)
    expect(screen.getByText("Custom Market")).toBeInTheDocument()
    expect(screen.queryByText(TRENDING_MARKETS[0].title)).not.toBeInTheDocument()
  })
})
