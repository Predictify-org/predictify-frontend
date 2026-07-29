import React from "react"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import NotificationsPanel from "../NotificationsPanel"
import type { NotificationItem } from "@/types/notifications"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let mockNotifications: NotificationItem[]
let mockMarkAsRead: jest.Mock
let mockMarkAllAsRead: jest.Mock

function makeNotification(
  overrides: Partial<NotificationItem> = {},
): NotificationItem {
  return {
    id: `n${Math.random().toString(36).slice(2, 8)}`,
    userId: "current-user",
    category: "market",
    title: "Test notification",
    description: "This is a test description.",
    timestamp: new Date("2026-07-24T10:00:00.000Z"),
    read: false,
    ...overrides,
  }
}

beforeEach(() => {
  mockMarkAsRead = jest.fn()
  mockMarkAllAsRead = jest.fn()
  mockNotifications = [
    makeNotification({
      id: "n1",
      title: "Market closing soon",
      category: "market",
      timestamp: new Date("2026-07-24T12:00:00.000Z"),
    }),
    makeNotification({
      id: "n2",
      title: "Dispute update",
      description: "A dispute moved to review.",
      category: "dispute",
      read: false,
      timestamp: new Date("2026-07-24T10:00:00.000Z"),
    }),
    makeNotification({
      id: "n3",
      title: "Payout received",
      category: "payout",
      read: true,
      timestamp: new Date("2026-07-23T08:00:00.000Z"),
    }),
  ]
})

jest.mock("@/app/state/notifications", () => ({
  useNotificationsStore: () => ({
    notifications: mockNotifications,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
  }),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NotificationsPanel", () => {
  it("renders the page heading and unread summary", () => {
    render(<NotificationsPanel />)

    expect(
      screen.getByRole("heading", { level: 1, name: /notifications/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/you have 2 unread notifications/i),
    ).toBeInTheDocument()
  })

  it("renders an 'all caught up' message when all notifications are read", () => {
    mockNotifications = mockNotifications.map((n) => ({ ...n, read: true }))
    render(<NotificationsPanel />)

    expect(
      screen.getByText(/you're all caught up/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /mark all read/i }),
    ).not.toBeInTheDocument()
  })

  it("shows the empty-state card when there are no notifications", () => {
    mockNotifications = []
    render(<NotificationsPanel />)

    const messages = screen.getAllByText(/you're all caught up/i)
    expect(messages).toHaveLength(2)
    expect(screen.getByRole("heading", { level: 1, name: /notifications/i })).toBeInTheDocument()
  })

  it("renders each notification as a list item with title and category badge", () => {
    render(<NotificationsPanel />)

    const list = screen.getByRole("list")
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(3)

    expect(screen.getByText("Market closing soon")).toBeInTheDocument()
    expect(screen.getByText("Dispute update")).toBeInTheDocument()
    expect(screen.getByText("Payout received")).toBeInTheDocument()

    // Category badges rendered
    expect(screen.getByText("Market")).toBeInTheDocument()
    expect(screen.getByText("Dispute")).toBeInTheDocument()
    expect(screen.getByText("Payout")).toBeInTheDocument()
  })

  it("calls markAsRead when an unread notification is clicked", async () => {
    const user = userEvent.setup()
    render(<NotificationsPanel />)

    await user.click(screen.getByText("Market closing soon"))
    expect(mockMarkAsRead).toHaveBeenCalledWith("n1")
  })

  it("calls markAllAsRead from the header button", async () => {
    const user = userEvent.setup()
    render(<NotificationsPanel />)

    await user.click(screen.getByRole("button", { name: /mark all read/i }))
    expect(mockMarkAllAsRead).toHaveBeenCalledTimes(1)
  })

  describe("sticky bottom action bar", () => {
    it("renders the toolbar with action buttons", () => {
      render(<NotificationsPanel />)

      const toolbar = screen.getByRole("toolbar", { name: /notification actions/i })
      expect(toolbar).toBeInTheDocument()
      expect(
        within(toolbar).getByRole("button", { name: /mark read/i }),
      ).toBeInTheDocument()
      expect(
        within(toolbar).getByRole("button", { name: /filter/i }),
      ).toBeInTheDocument()
    })

    it("starts hidden (translated off-screen) before scrolling", () => {
      render(<NotificationsPanel />)

      const toolbar = screen.getByRole("toolbar", { name: /notification actions/i })
      expect(toolbar.className).toContain("translate-y-full")
    })

    it("appears after scrolling past the header", () => {
      render(<NotificationsPanel />)

      const toolbar = screen.getByRole("toolbar", { name: /notification actions/i })
      const headerEl = screen.getByTestId("notifications-header")

      const origGetBoundingClientRect = headerEl.getBoundingClientRect.bind(headerEl)
      jest.spyOn(headerEl, "getBoundingClientRect").mockReturnValue({
        bottom: -100,
        top: -200,
        left: 0,
        right: 0,
        width: 0,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => null,
      } as DOMRect)

      act(() => {
        window.dispatchEvent(new Event("scroll", { bubbles: true }))
      })

      expect(toolbar.className).toContain("translate-y-0")
      expect(toolbar.className).not.toContain("translate-y-full")

      headerEl.getBoundingClientRect = origGetBoundingClientRect
    })

    it("shows unread count in the toolbar", () => {
      render(<NotificationsPanel />)

      const toolbar = screen.getByRole("toolbar", { name: /notification actions/i })
      expect(within(toolbar).getByText("2")).toBeInTheDocument()
      expect(within(toolbar).getByText(/unread/i)).toBeInTheDocument()
    })

    it("disables 'Mark read' in toolbar when all notifications are read", () => {
      mockNotifications = mockNotifications.map((n) => ({ ...n, read: true }))
      render(<NotificationsPanel />)

      const toolbar = screen.getByRole("toolbar", { name: /notification actions/i })
      expect(
        within(toolbar).getByRole("button", { name: /mark read/i }),
      ).toBeDisabled()
    })

    it("calls markAllAsRead from the toolbar button", async () => {
      const user = userEvent.setup()
      render(<NotificationsPanel />)

      const toolbar = screen.getByRole("toolbar", { name: /notification actions/i })
      await user.click(
        within(toolbar).getByRole("button", { name: /mark read/i }),
      )
      expect(mockMarkAllAsRead).toHaveBeenCalledTimes(1)
    })
  })

  describe("category filter", () => {
    it("filters notifications by category", async () => {
      const user = userEvent.setup()
      render(<NotificationsPanel />)

      // Open filter dropdown
      await user.click(screen.getByRole("button", { name: /filter/i }))
      const option = await screen.findByRole("menuitemradio", { name: /payout/i })
      await user.click(option)

      // Only payout notification should remain
      expect(screen.getByText("Payout received")).toBeInTheDocument()
      expect(screen.queryByText("Market closing soon")).not.toBeInTheDocument()
      expect(screen.queryByText("Dispute update")).not.toBeInTheDocument()
    })

    it("shows 'no notifications' message when filter yields empty results", async () => {
      const user = userEvent.setup()
      render(<NotificationsPanel />)

      await user.click(screen.getByRole("button", { name: /filter/i }))
      const option = await screen.findByRole("menuitemradio", { name: /account/i })
      await user.click(option)

      expect(
        screen.getByText(/no notifications in this category/i),
      ).toBeInTheDocument()
    })
  })

  describe("accessibility", () => {
    it("renders an aria-live region for unread announcements", () => {
      render(<NotificationsPanel />)

      const liveRegion = screen.getByRole("status")
      expect(liveRegion).toHaveAttribute("aria-live", "polite")
    })

    it("marks unread notifications with aria-current", () => {
      render(<NotificationsPanel />)

      const items = screen.getAllByRole("listitem")
      // First two items are unread
      const unreadBtn = within(items[0]).getByRole("button")
      expect(unreadBtn).toHaveAttribute("aria-current", "true")
    })

    it("sorts notifications newest-first", () => {
      render(<NotificationsPanel />)

      const items = screen.getAllByRole("listitem")
      // n1 (12:00) should be first, n2 (10:00) second, n3 (prev day) third
      expect(within(items[0]).getByText("Market closing soon")).toBeInTheDocument()
      expect(within(items[1]).getByText("Dispute update")).toBeInTheDocument()
      expect(within(items[2]).getByText("Payout received")).toBeInTheDocument()
    })
  })
})
