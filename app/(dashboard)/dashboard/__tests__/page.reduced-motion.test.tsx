import React from "react"
import { render, screen, act } from "@testing-library/react"
import DashboardPage from "../page"

// ---------------------------------------------------------------------------
// Mocks — keep the surface of the page under test focused.
//
// `useReducedMotion` is mocked so we can flip its return value per test.
// The dashboard pulls in many heavy child components (NotifDigest,
// RecommendationsStrip, ActiveBets, etc.) which themselves contain
// full subtrees and animation primitives. Stubbing them prevents the
// reduced-motion tests from becoming a kitchen-sink suite.
// ---------------------------------------------------------------------------

const mockUseReducedMotion = jest.fn(() => false)
jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}))

jest.mock("@/app/dashboard/NotifDigest", () => ({
  NotifDigest: () => <div data-testid="notif-digest" />,
}))
jest.mock("@/app/dashboard/RefreshIndicator", () => ({
  RefreshIndicator: () => <div data-testid="refresh-indicator" />,
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
jest.mock("@/app/components/RecentlyViewedRail", () => ({
  RecentlyViewedRail: () => <div data-testid="recently-viewed-rail" />,
}))
jest.mock("@/components/cards/recommendation-provenance", () => ({
  RecommendationProvenance: () => <div data-testid="recommendation-provenance" />,
}))

// next/link from next/navigation is a client component; mock to avoid
// pulling the router in for what is fundamentally a static component test.
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Skeletons / Tabs / Card are exercised unchanged from `@/components/ui`.
// We don't mock them — we rely on them to render their actual DOM, which
// keeps the reduced-motion tests honest.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetMotionMock(value: boolean) {
  mockUseReducedMotion.mockReset()
  mockUseReducedMotion.mockReturnValue(value)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DashboardPage — reduced-motion fallback (#547)", () => {
  // Real timers so we can assert the 1500ms simulated delay is in effect
  // when motion is allowed. The reduced-motion case must NOT trigger the
  // simulated delay (data renders synchronously).
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
    mockUseReducedMotion.mockReset()
  })

  // ---- Loading state under motion-allowed --------------------------------

  it("renders Skeleton placeholders briefly while stats are loading when motion is allowed", () => {
    resetMotionMock(false)
    render(<DashboardPage />)

    // The KPI grid shows 4 Skeleton placeholders under the loading state.
    // We query by the stable `animate-pulse` class that the Skeleton
    // component applies (see components/ui/skeleton.tsx) — this avoids
    // coupling to whatever ARIA extras a future Skeleton revision may add.
    const skeletons = document.querySelectorAll(".animate-pulse")
    expect(skeletons.length).toBeGreaterThanOrEqual(4)
  })

  it("renders stat values after the simulated 1500ms fetch when motion is allowed", () => {
    resetMotionMock(false)
    render(<DashboardPage />)

    // Stat values are not visible yet — the timer hasn't elapsed.
    expect(screen.queryByText("24")).not.toBeInTheDocument()

    // Advance the simulated fetch and verify the populated state now appears.
    act(() => {
      jest.advanceTimersByTime(1500)
    })

    expect(screen.getByText("24")).toBeInTheDocument()
    expect(screen.getByText("12,543")).toBeInTheDocument()
    expect(screen.getByText("$4,325.49")).toBeInTheDocument()
    expect(screen.getByText("573")).toBeInTheDocument()
  })

  // ---- Reduced-motion fallback --------------------------------------------

  it("renders the populated dashboard immediately when prefers-reduced-motion is set", () => {
    resetMotionMock(true)
    render(<DashboardPage />)

    // Stats should be visible right away — the timer is bypassed.
    expect(screen.getByText("24")).toBeInTheDocument()
    expect(screen.getByText("12,543")).toBeInTheDocument()
    expect(screen.getByText("$4,325.49")).toBeInTheDocument()
    expect(screen.getByText("573")).toBeInTheDocument()
  })

  it("shows an accessible reduced-motion status banner when prefers-reduced-motion is set", () => {
    resetMotionMock(true)
    render(<DashboardPage />)

    const banner = screen.getByTestId("dashboard-reduced-motion-banner")
    expect(banner).toBeInTheDocument()

    // Banner uses role="status" + aria-live="polite" so screen readers
    // announce the static-mode state without pre-empting other output
    // (WCAG 2.1 AA SC 4.1.3 – Status Messages).
    expect(banner).toHaveAttribute("role", "status")
    expect(banner).toHaveAttribute("aria-live", "polite")

    // Visible copy explains the change.
    expect(screen.getByText(/reduced motion mode/i)).toBeInTheDocument()
  })

  it("does not show the reduced-motion banner when motion is allowed", () => {
    resetMotionMock(false)
    render(<DashboardPage />)

    expect(
      screen.queryByTestId("dashboard-reduced-motion-banner"),
    ).not.toBeInTheDocument()
  })

  it("does not schedule the simulated loading delay under reduced motion (data appears within the same tick)", () => {
    resetMotionMock(true)
    render(<DashboardPage />)

    // Confirm that NO pending timers remain after the initial render — the
    // reduced-motion branch should be fully synchronous.
    expect(jest.getTimerCount()).toBe(0)

    // And the populated state must already be in the DOM.
    expect(screen.getByText("24")).toBeInTheDocument()
  })

  // ---- Side-effects of the reduced-motion banner on layout ----------------

  it("renders the reduced-motion banner above the page heading", () => {
    resetMotionMock(true)
    render(<DashboardPage />)

    const banner = screen.getByTestId("dashboard-reduced-motion-banner")
    const heading = screen.getByRole("heading", { level: 1, name: /dashboard/i })

    // Document order checks that the banner precedes the H1.
    expect(
      banner.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
