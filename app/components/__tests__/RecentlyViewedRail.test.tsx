import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { RecentlyViewedRail } from "../RecentlyViewedRail"
import * as useRecentlyViewedModule from "@/hooks/useRecentlyViewed"

const mockItems = [
  { id: "1", title: "Arsenal vs Liverpool", category: "Football", href: "/events/event-page/1", viewedAt: Date.now() },
  { id: "2", title: "Bitcoin Price", category: "Crypto", href: "/events/event-page/2", viewedAt: Date.now() - 1000 },
  { id: "3", title: "Trump vs Kamala", category: "Politics", href: "/events/event-page/3", viewedAt: Date.now() - 2000 },
]

const mockRemove = jest.fn()

function mockOverflow(container: HTMLElement) {
  Object.defineProperty(container, "scrollWidth", { value: 2000, configurable: true })
  Object.defineProperty(container, "clientWidth", { value: 500, configurable: true })
  Object.defineProperty(container, "scrollLeft", { value: 0, writable: true, configurable: true })
  container.scrollTo = jest.fn(({ left }: { left: number }) => {
    Object.defineProperty(container, "scrollLeft", { value: left, writable: true, configurable: true })
  }) as unknown as typeof container.scrollTo
}

describe("RecentlyViewedRail", () => {
  beforeEach(() => {
    mockRemove.mockClear()
    jest.spyOn(useRecentlyViewedModule, "useRecentlyViewed").mockReturnValue({
      items: mockItems,
      addRecentlyViewed: jest.fn(),
      removeRecentlyViewed: mockRemove,
      clearRecentlyViewed: jest.fn(),
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("empty state", () => {
    it("shows empty state when there are no items", () => {
      jest.spyOn(useRecentlyViewedModule, "useRecentlyViewed").mockReturnValue({
        items: [],
        addRecentlyViewed: jest.fn(),
        removeRecentlyViewed: jest.fn(),
        clearRecentlyViewed: jest.fn(),
      })

      render(<RecentlyViewedRail />)
      expect(screen.getByText("No recently viewed markets")).toBeInTheDocument()
      expect(screen.queryByRole("region", { name: /carousel/i })).not.toBeInTheDocument()
    })
  })

  describe("populated state", () => {
    it("renders the section heading", () => {
      render(<RecentlyViewedRail />)
      expect(screen.getByText("Recently viewed")).toBeInTheDocument()
    })

    it("renders all recently viewed items", () => {
      render(<RecentlyViewedRail />)
      expect(screen.getByText("Arsenal vs Liverpool")).toBeInTheDocument()
      expect(screen.getByText("Bitcoin Price")).toBeInTheDocument()
      expect(screen.getByText("Trump vs Kamala")).toBeInTheDocument()
    })

    it("renders category labels", () => {
      render(<RecentlyViewedRail />)
      expect(screen.getByText("Football")).toBeInTheDocument()
      expect(screen.getByText("Crypto")).toBeInTheDocument()
      expect(screen.getByText("Politics")).toBeInTheDocument()
    })

    it("renders each item as a link", () => {
      render(<RecentlyViewedRail />)
      const links = screen.getAllByRole("link")
      expect(links).toHaveLength(3)
      expect(links[0]).toHaveAttribute("href", "/events/event-page/1")
    })

    it("renders a remove button for each item", () => {
      render(<RecentlyViewedRail />)
      const removeButtons = screen.getAllByRole("button", { name: /remove/i })
      expect(removeButtons).toHaveLength(3)
    })

    it("calls removeRecentlyViewed when remove button is clicked", () => {
      render(<RecentlyViewedRail />)
      const removeButtons = screen.getAllByRole("button", { name: /remove/i })
      fireEvent.click(removeButtons[0])
      expect(mockRemove).toHaveBeenCalledWith("1")
    })

    it("renders the carousel region with correct aria-label", () => {
      render(<RecentlyViewedRail />)
      const region = screen.getByRole("region", { name: /recently viewed markets carousel/i })
      expect(region).toBeInTheDocument()
      expect(region).toHaveAttribute("tabIndex", "0")
    })
  })

  describe("keyboard scrolling", () => {
    it("scrolls right on ArrowRight and left on ArrowLeft when content overflows", () => {
      render(<RecentlyViewedRail />)
      const region = screen.getByRole("region", { name: /recently viewed markets carousel/i })
      mockOverflow(region)

      fireEvent.scroll(region)
      fireEvent.keyDown(region, { key: "ArrowRight" })
      expect(region.scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ left: 500, behavior: "smooth" })
      )

      fireEvent.scroll(region)
      fireEvent.keyDown(region, { key: "ArrowLeft" })
      expect(region.scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ left: 0, behavior: "smooth" })
      )
    })
  })
})
