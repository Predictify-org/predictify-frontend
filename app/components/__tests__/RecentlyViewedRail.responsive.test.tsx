import React from "react"
import { render } from "@testing-library/react"
import { RecentlyViewedRail } from "../RecentlyViewedRail"

// Mock the useRecentlyViewed hook to provide sample data
jest.mock("@/hooks/useRecentlyViewed", () => ({
  useRecentlyViewed: () => ({
    items: [
      { id: "1", title: "Market 1", category: "Politics", href: "/events/1", viewedAt: Date.now() },
      { id: "2", title: "Market 2", category: "Sports", href: "/events/2", viewedAt: Date.now() },
      { id: "3", title: "Market 3", category: "Crypto", href: "/events/3", viewedAt: Date.now() },
    ],
    removeRecentlyViewed: jest.fn(),
  }),
}))

describe("RecentlyViewedRail scroll buttons - Touch target sizing (Issue #541 #7)", () => {
  it("renders scroll arrow buttons with responsive sizing: w-10 h-10 on mobile, sm:w-8 sm:h-8 on larger screens", () => {
    const { container } = render(<RecentlyViewedRail />)

    // Find all scroll buttons (left and right arrows)
    const scrollButtons = container.querySelectorAll('[aria-label*="Scroll"]')

    // Should have scroll buttons visible (left and right)
    expect(scrollButtons.length).toBeGreaterThan(0)

    scrollButtons.forEach(button => {
      // Verify the button has the responsive size classes
      expect(button.className).toMatch(/w-10/)
      expect(button.className).toMatch(/h-10/)
      expect(button.className).toMatch(/sm:w-8/)
      expect(button.className).toMatch(/sm:h-8/)
    })
  })
})
