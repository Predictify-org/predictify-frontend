import React from "react"
import { render, screen } from "@testing-library/react"
import { Skeleton, ProfilePageSkeleton } from "../Skeleton"

describe("MarketDetail Skeleton (Stellar Wave theme)", () => {
  it("renders correctly with accessibility attributes", () => {
    render(<Skeleton />)
    
    const container = screen.getByRole("status")
    expect(container).toBeInTheDocument()
    expect(container).toHaveAttribute("aria-live", "polite")
    expect(container).toHaveAttribute("aria-label", "Loading Market Detail")
    
    // Checks for SR only text
    expect(screen.getByText("Loading market details...")).toBeInTheDocument()
  })

  it("applies custom className when provided", () => {
    render(<Skeleton className="custom-test-class" />)
    
    const container = screen.getByRole("status")
    expect(container).toHaveClass("custom-test-class")
  })
})

describe("MarketCardSkeleton", () => {
  const { MarketCardSkeleton } = require("../Skeleton")

  it("renders correctly with accessibility attributes", () => {
    render(<MarketCardSkeleton />)
    
    const container = screen.getByRole("status")
    expect(container).toBeInTheDocument()
    expect(container).toHaveAttribute("aria-live", "polite")
    expect(container).toHaveAttribute("aria-label", "Loading Market Card")
    
    // Checks for SR only text
    expect(screen.getByText("Loading market card...")).toBeInTheDocument()
  })

  it("applies custom className when provided", () => {
    render(<MarketCardSkeleton className="custom-test-class" />)
    
    const container = screen.getByRole("status")
    expect(container).toHaveClass("custom-test-class")
  })
})

describe("ProfilePageSkeleton", () => {
  it("renders loading status semantics for assistive tech", () => {
    render(<ProfilePageSkeleton />)

    const container = screen.getByRole("status")
    expect(container).toBeInTheDocument()
    expect(container).toHaveAttribute("aria-live", "polite")
    expect(container).toHaveAttribute("aria-busy", "true")
    expect(container).toHaveAttribute("aria-label", "Loading Profile Page")

    expect(screen.getByText("Loading profile page...")).toBeInTheDocument()
  })

  it("keeps major layout parity with profile page structure", () => {
    const { container } = render(<ProfilePageSkeleton />)

    expect(container.querySelector(".flex.flex-col.gap-4")).not.toBeNull()
    expect(container.querySelector(".grid.gap-4.md\\:grid-cols-2")).not.toBeNull()
    expect(container.querySelector(".h-20.w-20.rounded-full")).not.toBeNull()
    expect(container.querySelectorAll(".rounded-xl.border.bg-card").length).toBeGreaterThanOrEqual(3)
  })

  it("uses design tokens instead of campaign-specific hardcoded purple in profile skeleton", () => {
    const { container } = render(<ProfilePageSkeleton />)

    const classBlob = Array.from(container.querySelectorAll("[class]")).map((el) => el.className).join(" ")
    expect(classBlob).not.toContain("#540D8D")
  })
})
