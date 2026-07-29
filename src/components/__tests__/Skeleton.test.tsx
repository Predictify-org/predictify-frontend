import React from "react"
import { render, screen } from "@testing-library/react"
import { Skeleton } from "../Skeleton"

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
