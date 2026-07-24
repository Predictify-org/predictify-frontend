import React from "react"
import { render, screen } from "@testing-library/react"
import { SkipToContent } from "../SkipToContent"

describe("SkipToContent", () => {
  it("renders a link with the default label", () => {
    render(<SkipToContent />)
    const link = screen.getByRole("link", { name: /skip to main content/i })
    expect(link).toBeInTheDocument()
  })

  it("renders a link with a custom label", () => {
    render(<SkipToContent label="Skip navigation" />)
    const link = screen.getByRole("link", { name: /skip navigation/i })
    expect(link).toBeInTheDocument()
  })

  it("points to #main-content by default", () => {
    render(<SkipToContent />)
    const link = screen.getByRole("link", { name: /skip to main content/i })
    expect(link).toHaveAttribute("href", "#main-content")
  })

  it("points to a custom target id when provided", () => {
    render(<SkipToContent targetId="page-body" />)
    const link = screen.getByRole("link", { name: /skip to main content/i })
    expect(link).toHaveAttribute("href", "#page-body")
  })

  it("is visually hidden (sr-only) when not focused", () => {
    render(<SkipToContent />)
    const link = screen.getByRole("link", { name: /skip to main content/i })
    expect(link).toHaveClass("sr-only")
  })

  it("carries the skip-link class for the enhanced focus ring", () => {
    render(<SkipToContent />)
    const link = screen.getByRole("link", { name: /skip to main content/i })
    expect(link).toHaveClass("skip-link")
  })

  it("is the first focusable element when rendered at the top of the tree", () => {
    render(
      <div>
        <SkipToContent />
        <nav>
          <a href="/home">Home</a>
        </nav>
        <main id="main-content">
          <p>Content</p>
        </main>
      </div>
    )
    // The skip link should appear before the nav link in the DOM
    const allLinks = screen.getAllByRole("link")
    expect(allLinks[0]).toHaveAttribute("href", "#main-content")
  })

  it("renders without errors when no props are provided", () => {
    expect(() => render(<SkipToContent />)).not.toThrow()
  })
})
