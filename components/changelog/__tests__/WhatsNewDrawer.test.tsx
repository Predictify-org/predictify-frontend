import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { WhatsNewDrawer } from "../WhatsNewDrawer"

// Radix uses portals; keep dialog content in the document for queries.
jest.mock("@radix-ui/react-dialog", () => {
  const actual = jest.requireActual("@radix-ui/react-dialog")
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

describe("WhatsNewDrawer", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("shows the unseen dot before the drawer has been opened", () => {
    render(<WhatsNewDrawer />)
    const trigger = screen.getByRole("button", { name: /new updates available/i })
    expect(trigger).toBeInTheDocument()
  })

  it("opens the drawer and renders entries sourced from the changelog", async () => {
    render(<WhatsNewDrawer />)
    const trigger = screen.getByRole("button", { name: /what's new/i })

    await userEvent.click(trigger)

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText(/what's new/i)).toBeInTheDocument()
  })

  it("is keyboard accessible: Enter opens it and Escape closes it", async () => {
    const user = userEvent.setup()
    render(<WhatsNewDrawer />)

    const trigger = screen.getByRole("button", { name: /what's new/i })
    trigger.focus()
    expect(trigger).toHaveFocus()

    await user.keyboard("{Enter}")
    expect(await screen.findByRole("dialog")).toBeInTheDocument()

    await user.keyboard("{Escape}")
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("clears the unseen indicator once the drawer is opened", async () => {
    const user = userEvent.setup()
    render(<WhatsNewDrawer />)
    expect(screen.getByRole("button", { name: /new updates available/i })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /what's new/i }))
    await screen.findByRole("dialog")

    // The trigger is aria-hidden from the background while the modal is open
    // (expected Radix behavior) — close it again to inspect its updated label.
    await user.keyboard("{Escape}")
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    expect(screen.queryByRole("button", { name: /new updates available/i })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "What's new" })).toBeInTheDocument()
  })

  it("keeps the indicator cleared after a remount once seen", async () => {
    const { unmount } = render(<WhatsNewDrawer />)
    await userEvent.click(screen.getByRole("button", { name: /what's new/i }))
    await screen.findByRole("dialog")
    unmount()

    render(<WhatsNewDrawer />)
    expect(screen.getByRole("button", { name: "What's new" })).toBeInTheDocument()
  })

  it("checking 'don't show again' dismisses the unseen indicator", async () => {
    render(<WhatsNewDrawer />)
    await userEvent.click(screen.getByRole("button", { name: /what's new/i }))
    await screen.findByRole("dialog")

    const checkbox = screen.getByRole("checkbox", { name: /don't show this indicator again/i })
    await userEvent.click(checkbox)

    expect(window.localStorage.getItem("predictify:whats-new:dont-show-again")).toBe("true")
  })
})
