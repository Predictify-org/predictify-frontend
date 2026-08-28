import { act } from "@testing-library/react";
import { NotificationItem } from "@/types/notifications";
import { useNotificationsStore } from "../notifications";

const STORAGE_KEY = "predictify-notifications";

function makeNotification(
  id: string,
  read = false
): NotificationItem {
  return {
    id,
    userId: "current-user",
    category: "market",
    title: id,
    timestamp: new Date("2026-08-28T12:00:00.000Z"),
    read,
  };
}

function resetStore() {
  act(() => {
    useNotificationsStore.setState({
      notifications: [makeNotification("first"), makeNotification("second")],
    });
  });
}

function dispatchStorageUpdate(notifications: unknown[]) {
  act(() => {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: JSON.stringify({ state: { notifications }, version: 0 }),
      })
    );
  });
}

describe("useNotificationsStore", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("persists a notification after it is marked as read", () => {
    act(() => useNotificationsStore.getState().markAsRead("first"));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.state.notifications).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "first", read: true })])
    );
  });

  it("keeps marking an already-read notification idempotent", () => {
    act(() => useNotificationsStore.getState().markAsRead("first"));
    const writesAfterFirstRead = (localStorage.setItem as jest.Mock).mock.calls.length;

    act(() => useNotificationsStore.getState().markAsRead("first"));

    expect(useNotificationsStore.getState().notifications[0].read).toBe(true);
    expect((localStorage.setItem as jest.Mock).mock.calls).toHaveLength(
      writesAfterFirstRead
    );
  });

  it("ignores malformed persisted notification data during rehydration", async () => {
    localStorage.setItem(STORAGE_KEY, "not-json");

    await act(async () => {
      await useNotificationsStore.persist.rehydrate();
    });

    expect(useNotificationsStore.getState().notifications).toEqual([
      makeNotification("first"),
      makeNotification("second"),
    ]);
  });

  it("revives persisted notification timestamps during rehydration", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          notifications: [
            {
              ...makeNotification("first", true),
              timestamp: "2026-08-28T12:00:00.000Z",
            },
          ],
        },
        version: 0,
      })
    );

    await act(async () => {
      await useNotificationsStore.persist.rehydrate();
    });

    const [firstNotification] = useNotificationsStore.getState().notifications;
    expect(firstNotification.timestamp).toBeInstanceOf(Date);
  });

  it("merges read updates from another tab without losing local reads", () => {
    act(() => useNotificationsStore.getState().markAsRead("second"));

    dispatchStorageUpdate([{ id: "first", read: true }]);

    expect(useNotificationsStore.getState().notifications).toEqual([
      expect.objectContaining({ id: "first", read: true }),
      expect.objectContaining({ id: "second", read: true }),
    ]);
  });

  it("preserves known read state when notifications are refreshed", () => {
    act(() => useNotificationsStore.getState().markAsRead("first"));

    act(() => {
      useNotificationsStore
        .getState()
        .setNotifications([makeNotification("first"), makeNotification("second")]);
    });

    expect(useNotificationsStore.getState().notifications).toEqual([
      expect.objectContaining({ id: "first", read: true }),
      expect.objectContaining({ id: "second", read: false }),
    ]);
  });

  it("ignores malformed cross-tab storage events", () => {
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_KEY, newValue: "not-json" })
      );
    });

    expect(useNotificationsStore.getState().notifications).toEqual([
      makeNotification("first"),
      makeNotification("second"),
    ]);
  });

  it("keeps the UI state updated when persistence fails", () => {
    (localStorage.setItem as jest.Mock).mockImplementationOnce(() => {
      throw new Error("storage unavailable");
    });

    expect(() => {
      act(() => useNotificationsStore.getState().markAsRead("first"));
    }).not.toThrow();
    expect(useNotificationsStore.getState().notifications[0].read).toBe(true);
  });

  it("merges stale writes with already-persisted read state", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          notifications: [makeNotification("first", true), makeNotification("second")],
        },
        version: 0,
      })
    );

    act(() => {
      useNotificationsStore.setState({
        notifications: [makeNotification("first"), makeNotification("second", true)],
      });
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.state.notifications).toEqual([
      expect.objectContaining({ id: "first", read: true }),
      expect.objectContaining({ id: "second", read: true }),
    ]);
  });

  it("ignores storage read failures during rehydration", async () => {
    (localStorage.getItem as jest.Mock).mockImplementationOnce(() => {
      throw new Error("storage unavailable");
    });

    await act(async () => {
      await useNotificationsStore.persist.rehydrate();
    });

    expect(useNotificationsStore.getState().notifications).toEqual([
      makeNotification("first"),
      makeNotification("second"),
    ]);
  });
});
