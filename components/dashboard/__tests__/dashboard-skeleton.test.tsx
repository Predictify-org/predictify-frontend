import { render, screen } from "@testing-library/react"
import { DashboardSkeleton } from "../dashboard-skeleton"

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: jest.fn().mockReturnValue(false),
}))

describe("DashboardSkeleton", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the skeleton with role='status' for accessibility", () => {
    render(<DashboardSkeleton />)
    const container = screen.getByRole("status")
    expect(container).toBeInTheDocument()
    expect(container).toHaveAttribute("aria-live", "polite")
    expect(container).toHaveAttribute("aria-label", "Dashboard is loading")
    expect(container).toHaveAttribute("data-testid", "dashboard-skeleton")
  })

  it("renders 4 stat card skeletons", () => {
    render(<DashboardSkeleton />)
    const statSkeletons = screen.getAllByTestId(/^skeleton-stat-/)
    expect(statSkeletons).toHaveLength(4)
  })

  it("renders 3 recommendation card skeletons", () => {
    render(<DashboardSkeleton />)
    const recSkeletons = screen.getAllByTestId(/^skeleton-rec-/)
    expect(recSkeletons).toHaveLength(3)
  })

  it("renders a visually hidden loading announcement", () => {
    render(<DashboardSkeleton />)
    const announcement = screen.getByText("Dashboard is loading")
    expect(announcement).toHaveClass("sr-only")
  })

  it("applies custom className", () => {
    render(<DashboardSkeleton className="custom-class" />)
    const container = screen.getByTestId("dashboard-skeleton")
    expect(container).toHaveClass("custom-class")
  })

  it("disables pulse animation when reduced motion is preferred", () => {
    const useReducedMotion = jest.requireMock("@/hooks/useReducedMotion").useReducedMotion
    useReducedMotion.mockReturnValue(true)

    render(<DashboardSkeleton />)
    const statSkeletons = screen.getAllByTestId(/^skeleton-stat-/)
    statSkeletons.forEach((el) => {
      expect(el).not.toHaveClass("animate-pulse")
    })
  })

  it("has pulse animation by default", () => {
    render(<DashboardSkeleton />)
    const statSkeletons = screen.getAllByTestId(/^skeleton-stat-/)
    statSkeletons.forEach((el) => {
      expect(el).toHaveClass("animate-pulse")
    })
  })
})
