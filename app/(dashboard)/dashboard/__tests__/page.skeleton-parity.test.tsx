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

describe("DashboardPage stat-card skeleton parity (Issue #735)", () => {
  beforeEach(() => {
    mockPush.mockClear()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("renders the loading skeleton at the same height as the final stat card (h-44)", () => {
    render(<DashboardPage />)

    // Still in the "loading" phase — the 1500ms timer hasn't fired yet.
    const loadingSkeletons = document.querySelectorAll(".grid.grid-cols-1 > [class*='rounded-xl']")
    expect(loadingSkeletons.length).toBe(4)
    loadingSkeletons.forEach((el) => {
      expect(el).toHaveClass("h-44")
      expect(el).not.toHaveClass("h-32")
    })
  })
})
