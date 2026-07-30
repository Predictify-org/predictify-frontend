import React from "react"
import { render, screen } from "@testing-library/react"
import MarketDetailPage from "../MarketDetail"

jest.mock("@/app/markets/[id]/page", () => ({
  __esModule: true,
  default: () => <div data-testid="mock-market-detail-page" />,
}))

jest.mock("../../components/Skeleton", () => ({
  Skeleton: () => <div data-testid="mock-skeleton" />,
}))

describe("MarketDetail wrapper", () => {
  it("wraps the page in a .market-detail-page container for focus-visible CSS scoping", () => {
    render(<MarketDetailPage />)

    const page = screen.getByTestId("mock-market-detail-page")
    expect(page.parentElement).toHaveClass("market-detail-page")
  })
})
