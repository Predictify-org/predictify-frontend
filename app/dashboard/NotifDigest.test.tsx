import React from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NotifDigest } from "./NotifDigest"
import { NotificationItem } from "@/types/notifications"

function makeNotification(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: "n1",
    userId: "user-1",
    category: "market",
    title: "Market closing soon",
    description: "A market you follow closes in 1 hour.",
    timestamp: new Date("2026-07-24T10:00:00.000Z"),
    read: false,
    ...overrides,
  }
}

describe("NotifDigest", () => {
  it("shows no unread badge and an empty-state message when there are no notifications", async () => {
    const user = userEvent.setup()
    render(<NotifDigest notifications={[]} />)

    expect(
      screen.getByRole("button", { name: /notifications, no unread/i })
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /notifications, no unread/i }))
    expect(await screen.findByText(/you're all caught up/i)).toBeInTheDocument()
  })

  it("renders an unread count badge capped at 9+", () => {
    const notifications = Array.from({ length: 12 }, (_, i) =>
      makeNotification({ id: `n${i}`, read: false })
    )
    render(<NotifDigest notifications={notifications} />)

    expect(
      screen.getByRole("button", { name: /notifications, 12 unread/i })
    ).toBeInTheDocument()
    const badge = screen.getByText("9+")
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass("tabular-nums")
  })

  it("lists notifications newest-first when the panel is opened", async () => {
    const user = userEvent.setup()
    const notifications = [
      makeNotification({
        id: "older",
        title: "Older notification",
        timestamp: new Date("2026-07-24T08:00:00.000Z"),
      }),
      makeNotification({
        id: "newer",
        title: "Newer notification",
        timestamp: new Date("2026-07-24T09:00:00.000Z"),
      }),
    ]
    render(<NotifDigest notifications={notifications} />)

    await user.click(screen.getByRole("button", { name: /notifications/i }))

    const items = await screen.findAllByRole("listitem")
    expect(within(items[0]).getByText("Newer notification")).toBeInTheDocument()
    expect(within(items[1]).getByText("Older notification")).toBeInTheDocument()
  })

  it("calls onMarkAsRead when an individual notification is clicked", async () => {
    const user = userEvent.setup()
    const handleMarkAsRead = jest.fn()
    render(
      <NotifDigest
        notifications={[makeNotification()]}
        onMarkAsRead={handleMarkAsRead}
      />
    )

    await user.click(screen.getByRole("button", { name: /notifications, 1 unread/i }))
    await user.click(await screen.findByText("Market closing soon"))

    expect(handleMarkAsRead).toHaveBeenCalledWith("n1")
  })

  it("calls onMarkAllAsRead and disables the action once there is nothing unread", async () => {
    const user = userEvent.setup()
    const handleMarkAllAsRead = jest.fn()
    const { rerender } = render(
      <NotifDigest
        notifications={[makeNotification()]}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    )

    await user.click(screen.getByRole("button", { name: /notifications, 1 unread/i }))
    const markAllButton = await screen.findByRole("button", { name: /mark all read/i })
    expect(markAllButton).toBeEnabled()

    await user.click(markAllButton)
    expect(handleMarkAllAsRead).toHaveBeenCalledTimes(1)

    rerender(
      <NotifDigest
        notifications={[makeNotification({ read: true })]}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    )
    expect(screen.getByRole("button", { name: /mark all read/i })).toBeDisabled()
  })

  it("exposes an aria-live region that announces the unread count", () => {
    render(<NotifDigest notifications={[makeNotification()]} />)
    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-live", "polite")
  })
})
