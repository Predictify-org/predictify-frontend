import { render, screen } from "@testing-library/react"
import { LoadingMoreIndicator } from "../loading-more-indicator"

describe("LoadingMoreIndicator", () => {
  it("should render when isLoading is true", () => {
    render(<LoadingMoreIndicator isLoading={true} />)
    
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.getByText("Loading more items...")).toBeInTheDocument()
  })

  it("should not render when isLoading is false", () => {
    const { container } = render(<LoadingMoreIndicator isLoading={false} />)
    
    expect(container.firstChild).toBeNull()
  })

  it("should render custom text when provided", () => {
    render(<LoadingMoreIndicator isLoading={true} text="Loading more events..." />)
    
    expect(screen.getByText("Loading more events...")).toBeInTheDocument()
  })

  it("should have aria-live='polite' for accessibility", () => {
    render(<LoadingMoreIndicator isLoading={true} />)
    
    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-live", "polite")
  })

  it("should have fixed height to prevent scroll jump", () => {
    render(<LoadingMoreIndicator isLoading={true} />)
    
    const container = screen.getByRole("status")
    expect(container).toHaveClass("h-12")
  })

  it("should apply custom className", () => {
    render(<LoadingMoreIndicator isLoading={true} className="custom-class" />)
    
    const container = screen.getByRole("status")
    expect(container).toHaveClass("custom-class")
  })
})
