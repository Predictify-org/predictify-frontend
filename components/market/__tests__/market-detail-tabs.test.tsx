import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MarketDetailTabs } from "../MarketDetailTabs"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}))

const mockPush = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  ;(usePathname as jest.Mock).mockReturnValue("/events/event-page/1")
  ;(useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams())
})

function renderTabs(props?: { defaultValue?: "overview" | "activity" | "resolution" }) {
  return render(
    <MarketDetailTabs
      overview={<div>Overview Content</div>}
      activity={<div>Activity Content</div>}
      resolution={<div>Resolution Content</div>}
      {...props}
    />
  )
}

describe("MarketDetailTabs", () => {
  it("renders three tab triggers", () => {
    renderTabs()
    expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /activity/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /resolution/i })).toBeInTheDocument()
  })

  it("defaults to Overview tab when no URL param", () => {
    renderTabs()
    const overviewTab = screen.getByRole("tab", { name: /overview/i })
    expect(overviewTab).toHaveAttribute("data-state", "active")
    expect(screen.getByText("Overview Content")).toBeInTheDocument()
  })

  it("syncs selected tab to URL on click", async () => {
    const user = userEvent.setup()
    renderTabs()
    await user.click(screen.getByRole("tab", { name: /resolution/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("tab=resolution"),
        { scroll: false }
      )
    })
  })

  it("renders correct tab from URL param (deep link)", () => {
    ;(useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("tab=activity")
    )
    renderTabs()
    const activityTab = screen.getByRole("tab", { name: /activity/i })
    expect(activityTab).toHaveAttribute("data-state", "active")
    expect(screen.getByText("Activity Content")).toBeInTheDocument()
  })

  it("switches to activity tab when URL param changes", () => {
    ;(useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("tab=activity")
    )
    renderTabs()
    expect(screen.getByText("Activity Content")).toBeInTheDocument()
    expect(screen.queryByText("Overview Content")).not.toBeInTheDocument()
  })

  it("switches to resolution tab from URL param", () => {
    ;(useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("tab=resolution")
    )
    renderTabs()
    expect(screen.getByText("Resolution Content")).toBeInTheDocument()
    expect(screen.queryByText("Overview Content")).not.toBeInTheDocument()
  })
})
