import React from "react"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RefreshIndicator } from "./RefreshIndicator"

describe("RefreshIndicator", () => {
  it("shows 'Never refreshed' when no timestamp is provided", () => {
    render(<RefreshIndicator />)
    expect(screen.getByText("Never refreshed")).toBeInTheDocument()
  })

  it("shows 'Just now' for a timestamp within the last minute", () => {
    const now = new Date()
    render(<RefreshIndicator lastRefreshedAt={now} />)
    expect(screen.getByText("Just now")).toBeInTheDocument()
  })

  it("shows minutes-ago label for a timestamp older than 60 seconds", () => {
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000)
    render(<RefreshIndicator lastRefreshedAt={twoMinsAgo} />)
    expect(screen.getByText("2 mins ago")).toBeInTheDocument()
  })

  it("calls onRefresh when the refresh button is clicked", async () => {
    const user = userEvent.setup()
    const handleRefresh = jest.fn()
    render(<RefreshIndicator onRefresh={handleRefresh} />)
    await user.click(screen.getByRole("button", { name: /refresh dashboard data/i }))
    expect(handleRefresh).toHaveBeenCalledTimes(1)
  })

  it("has an aria-live region for screen-reader announcements", () => {
    render(<RefreshIndicator />)
    const live = screen.getByText("Never refreshed")
    expect(live).toHaveAttribute("aria-live", "polite")
    expect(live).toHaveAttribute("aria-atomic", "true")
  })
})
