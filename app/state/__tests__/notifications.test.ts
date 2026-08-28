import { act } from "@testing-library/react";
import { useNotificationsStore } from "../notifications";
import type { NotificationItem } from "@/types/notifications";

const item = (overrides: Partial<NotificationItem> = {}): NotificationItem => ({
  id: "notification-1",
  userId: "current-user",
  category: "market",
  title: "Original title",
  timestamp: new Date("2026-08-28T10:00:00.000Z"),
  read: false,
  ...overrides,
});

describe("notifications store stream merge", () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => useNotificationsStore.setState({ notifications: [] }));
  });

  it("inserts a new streamed notification", () => {
    act(() => useNotificationsStore.getState().upsertNotification(item()));
    expect(useNotificationsStore.getState().notifications).toEqual([item()]);
  });

  it("updates by ID instead of appending a replay duplicate", () => {
    act(() => {
      useNotificationsStore.getState().upsertNotification(item());
      useNotificationsStore
        .getState()
        .upsertNotification(item({ title: "Updated title" }));
    });

    expect(useNotificationsStore.getState().notifications).toHaveLength(1);
    expect(useNotificationsStore.getState().notifications[0].title).toBe(
      "Updated title"
    );
  });

  it("does not revert local read state when an unread replay arrives", () => {
    act(() => {
      useNotificationsStore.getState().upsertNotification(item({ read: true }));
      useNotificationsStore.getState().upsertNotification(item({ read: false }));
    });

    expect(useNotificationsStore.getState().notifications[0].read).toBe(true);
  });
});
