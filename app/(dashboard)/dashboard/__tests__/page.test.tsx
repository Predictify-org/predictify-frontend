import React from "react"
import { render, screen, act } from "@testing-library/react"
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

describe("DashboardPage keyboard shortcuts", () => {
  beforeEach(() => {
    mockPush.mockClear()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("renders the Kbd hint next to Create New Event", () => {
    render(<DashboardPage />)

    const kbd = document.querySelector("kbd")
    expect(kbd).toBeInTheDocument()
    expect(kbd).toHaveTextContent(/n/i)
  })

  it("navigates to /events/new on Cmd+Shift+N (Mac)", () => {
    render(<DashboardPage />)
    act(() => { jest.advanceTimersByTime(1600) })

    const originalUserAgent = navigator.userAgent
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      configurable: true,
    })

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "n",
          metaKey: true,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        })
      )
    })

    expect(mockPush).toHaveBeenCalledWith("/events/new")

    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    })
  })

  it("navigates to /events/new on Ctrl+Shift+N (Windows)", () => {
    render(<DashboardPage />)
    act(() => { jest.advanceTimersByTime(1600) })

    const originalUserAgent = navigator.userAgent
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      configurable: true,
    })

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "n",
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        })
      )
    })

    expect(mockPush).toHaveBeenCalledWith("/events/new")

    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    })
  })

  it("does not navigate when only N is pressed without modifier", () => {
    render(<DashboardPage />)
    act(() => { jest.advanceTimersByTime(1600) })

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "n",
          bubbles: true,
          cancelable: true,
        })
      )
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it("switches to analytics tab on Cmd+Shift+A (Mac)", () => {
    render(<DashboardPage />)
    act(() => { jest.advanceTimersByTime(1600) })

    const originalUserAgent = navigator.userAgent
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      configurable: true,
    })

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("data-state", "active")

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "a",
          metaKey: true,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        })
      )
    })

    expect(screen.getByRole("tab", { name: "Analytics" })).toHaveAttribute("data-state", "active")

    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    })
  })
})
