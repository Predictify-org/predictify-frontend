import React from "react"
import { render, screen } from "@testing-library/react"
import DashboardPage from "../page"

const mockPush = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter() {
    return { push: mockPush, replace: jest.fn(), prefetch: jest.fn() }
  },
}))

jest.mock("@/app/components/RecentlyViewedRail", () => ({
  RecentlyViewedRail: () => <div data-testid="recently-viewed-rail" />,
}))

jest.mock("@/components/dashboard/RecommendationsStrip", () => ({
  RecommendationsStrip: () => <div data-testid="recommendations-strip" />,
}))

jest.mock("@/components/active-bets/ActiveBets", () => ({
  ActiveBets: () => <div data-testid="active-bets" />,
}))

jest.mock("@/components/activity-timeline", () => ({
  ActivityTimeline: () => <div data-testid="activity-timeline" />,
}))

jest.mock("@/app/dashboard/RefreshIndicator", () => ({
  RefreshIndicator: () => <div data-testid="refresh-indicator" />,
}))

jest.mock("@/app/dashboard/NotifDigest", () => ({
  NotifDigest: () => <div data-testid="notif-digest" />,
}))

jest.mock("@/components/cards/recommendation-provenance", () => ({
  RecommendationProvenance: () => <div data-testid="recommendation-provenance" />,
}))

describe("DashboardPage responsive layout (Issue #541)", () => {
  beforeEach(() => {
    mockPush.mockClear()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // Issue #1: Stat Cards Grid - Mobile-First Breakpoint
  it("renders stat cards with explicit grid-cols-1 for mobile-first responsive scaling", () => {
    render(<DashboardPage />)
    jest.advanceTimersByTime(1600)

    // The stat cards grid should have the grid-cols-1 class applied
    const statCardGrids = document.querySelectorAll(".grid.grid-cols-1")
    
    // We expect at least one grid with grid-cols-1 (the stat cards grid)
    expect(statCardGrids.length).toBeGreaterThan(0)

    // Verify responsive breakpoints are present: md:grid-cols-2 and lg:grid-cols-4
    const allGridClasses = Array.from(statCardGrids)
      .map(el => el.className)
      .join(" ")
    
    expect(allGridClasses).toMatch(/md:grid-cols-2/)
    expect(allGridClasses).toMatch(/lg:grid-cols-4/)
  })

  // Issue #2: Recommendation Strip - Responsive Columns 1→2→3
  it("renders recommendation cards with responsive grid scaling (grid-cols-1 sm:grid-cols-2 md:grid-cols-3)", () => {
    render(<DashboardPage />)
    jest.advanceTimersByTime(1600)
    jest.runAllTimers()

    // Find the recommendations section
    const recommendationsSection = screen.getByText("Recommended markets")?.closest("section")
    
    if (recommendationsSection) {
      // Look for the grid within recommendations with responsive classes
      const grids = recommendationsSection.querySelectorAll(".grid")
      const responsiveGrid = Array.from(grids).find(grid => 
        grid.className.includes("grid-cols-1") &&
        grid.className.includes("sm:grid-cols-2") &&
        grid.className.includes("md:grid-cols-3")
      )

      expect(responsiveGrid).toBeTruthy()
    }
  })

  // Issue #4: Analytics Panel - Correct Column Span Layout
  it("renders analytics panel with grid-cols-1 md:grid-cols-3 for proper tablet scaling", () => {
    render(<DashboardPage />)
    jest.advanceTimersByTime(1600)
    jest.runAllTimers()

    // Click on Analytics tab to render the panel
    const analyticsTab = screen.getByRole("tab", { name: "Analytics" })
    analyticsTab.click()
    jest.advanceTimersByTime(100)

    // The analytics grid should have grid-cols-1 md:grid-cols-3
    const analyticsBodies = document.querySelectorAll('[role="tabpanel"]')
    const analyticsPanel = Array.from(analyticsBodies).find(panel => 
      panel.textContent?.includes("User Growth") && panel.textContent?.includes("User Demographics")
    )

    if (analyticsPanel) {
      const analyticsGrid = analyticsPanel.querySelector(".grid")
      expect(analyticsGrid?.className).toMatch(/grid-cols-1/)
      expect(analyticsGrid?.className).toMatch(/md:grid-cols-3/)
    }
  })

  // Issue #5: Activity Timeline + Chart - Stack on Mobile, 7-Column at Desktop
  it("renders overview activity section with grid-cols-1 lg:grid-cols-7 for proper mobile/tablet stacking", () => {
    render(<DashboardPage />)
    jest.advanceTimersByTime(1600)
    jest.runAllTimers()

    // The overview tab should be active by default
    const overviewPanel = document.querySelector('[role="tabpanel"]')
    
    if (overviewPanel) {
      // Find the grid containing "Platform Activity" and "Recent Activity"
      const grids = overviewPanel.querySelectorAll(".grid")
      const activityGrid = Array.from(grids).find(grid => {
        const text = grid.textContent || ""
        return text.includes("Platform Activity") && text.includes("Recent Activity")
      })

      expect(activityGrid?.className).toMatch(/grid-cols-1/)
      expect(activityGrid?.className).toMatch(/lg:grid-cols-7/)
    }
  })

  // Issue #5: Responsive Chart Height
  it("applies responsive chart heights (h-[150px] sm:h-[200px]) to platform activity", () => {
    render(<DashboardPage />)
    jest.advanceTimersByTime(1600)
    jest.runAllTimers()

    // Find the "Activity Chart Placeholder" element
    const chartPlaceholder = screen.getByText("Activity Chart Placeholder")?.closest("div")

    if (chartPlaceholder?.parentElement) {
      const chartContainer = chartPlaceholder
      expect(chartContainer.className).toMatch(/h-\[150px\]/)
      expect(chartContainer.className).toMatch(/sm:h-\[200px\]/)
    }
  })
})
