import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { BackToTopFab } from "../back-to-top-fab"
import { createRef } from "react"

describe("BackToTopFab", () => {
  let scrollContainer: HTMLDivElement
  let containerRef: React.RefObject<HTMLDivElement>

  beforeEach(() => {
    scrollContainer = document.createElement("div")
    Object.defineProperty(scrollContainer, "scrollTop", {
      writable: true,
      value: 0,
    })
    Object.defineProperty(scrollContainer, "scrollTo", {
      writable: true,
      value: jest.fn((options: ScrollToOptions) => {
        scrollContainer.scrollTop = options.top || 0
      }),
    })
    
    containerRef = { current: scrollContainer }
    
    // Mock window.innerHeight
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      value: 800,
    })
  })

  it("should not render when scroll is below threshold", () => {
    scrollContainer.scrollTop = 100
    
    const { container } = render(
      <BackToTopFab scrollContainerRef={containerRef} threshold={2} />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it("should render when scroll exceeds threshold", async () => {
    render(<BackToTopFab scrollContainerRef={containerRef} threshold={2} />)
    
    // Scroll past 2 viewport heights (2 * 800 = 1600px)
    scrollContainer.scrollTop = 1700
    fireEvent.scroll(scrollContainer)
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Back to top" })).toBeInTheDocument()
    })
  })

  it("should hide when scrolling back near top", async () => {
    render(<BackToTopFab scrollContainerRef={containerRef} threshold={2} />)
    
    // Scroll down
    scrollContainer.scrollTop = 1700
    fireEvent.scroll(scrollContainer)
    
    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument()
    })
    
    // Scroll back up
    scrollContainer.scrollTop = 100
    fireEvent.scroll(scrollContainer)
    
    await waitFor(() => {
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })
  })

  it("should scroll to top with smooth behavior when clicked", async () => {
    render(<BackToTopFab scrollContainerRef={containerRef} threshold={2} />)
    
    scrollContainer.scrollTop = 1700
    fireEvent.scroll(scrollContainer)
    
    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument()
    })
    
    const button = screen.getByRole("button")
    fireEvent.click(button)
    
    expect(scrollContainer.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    })
  })

  it("should call onScrollToTop callback when clicked", async () => {
    const onScrollToTop = jest.fn()
    
    render(
      <BackToTopFab 
        scrollContainerRef={containerRef} 
        threshold={2}
        onScrollToTop={onScrollToTop}
      />
    )
    
    scrollContainer.scrollTop = 1700
    fireEvent.scroll(scrollContainer)
    
    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument()
    })
    
    const button = screen.getByRole("button")
    fireEvent.click(button)
    
    expect(onScrollToTop).toHaveBeenCalledTimes(1)
  })

  it("should have proper accessibility attributes", async () => {
    render(<BackToTopFab scrollContainerRef={containerRef} threshold={2} />)
    
    scrollContainer.scrollTop = 1700
    fireEvent.scroll(scrollContainer)
    
    await waitFor(() => {
      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-label", "Back to top")
    })
  })

  it("should apply custom className", async () => {
    render(
      <BackToTopFab 
        scrollContainerRef={containerRef} 
        threshold={2}
        className="custom-class"
      />
    )
    
    scrollContainer.scrollTop = 1700
    fireEvent.scroll(scrollContainer)
    
    await waitFor(() => {
      const button = screen.getByRole("button")
      expect(button).toHaveClass("custom-class")
    })
  })

  it("should use custom threshold value", async () => {
    render(<BackToTopFab scrollContainerRef={containerRef} threshold={3} />)
    
    // 3 viewport heights = 3 * 800 = 2400px
    scrollContainer.scrollTop = 2500
    fireEvent.scroll(scrollContainer)
    
    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument()
    })
    
    // Below threshold
    scrollContainer.scrollTop = 2000
    fireEvent.scroll(scrollContainer)
    
    await waitFor(() => {
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })
  })
})
