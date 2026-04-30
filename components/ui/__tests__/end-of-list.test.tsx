import { render, screen } from "@testing-library/react"
import { EndOfList } from "../end-of-list"

describe("EndOfList", () => {
  it("should render when show is true", () => {
    render(<EndOfList show={true} />)
    
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.getByText("You've reached the end")).toBeInTheDocument()
  })

  it("should not render when show is false", () => {
    const { container } = render(<EndOfList show={false} />)
    
    expect(container.firstChild).toBeNull()
  })

  it("should render custom text when provided", () => {
    render(<EndOfList show={true} text="No more items" />)
    
    expect(screen.getByText("No more items")).toBeInTheDocument()
  })

  it("should have proper aria-label for accessibility", () => {
    render(<EndOfList show={true} text="End of results" />)
    
    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-label", "End of results")
  })

  it("should apply custom className", () => {
    render(<EndOfList show={true} className="custom-class" />)
    
    const container = screen.getByRole("status")
    expect(container).toHaveClass("custom-class")
  })

  it("should render divider lines", () => {
    const { container } = render(<EndOfList show={true} />)
    
    const dividers = container.querySelectorAll(".bg-border")
    expect(dividers).toHaveLength(2)
  })
})
