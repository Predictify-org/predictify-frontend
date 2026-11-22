import { act } from "@testing-library/react";
import {
  DASHBOARD_LAYOUT_STORAGE_KEY,
  useDashboardLayoutStore,
} from "../dashboardLayout";
import { DEFAULT_LAYOUT } from "@/lib/dashboard-layout";

function resetStore() {
  useDashboardLayoutStore.setState({
    layout: DEFAULT_LAYOUT.map((item) => ({ ...item })),
    hasHydrated: false,
  });
  localStorage.removeItem(DASHBOARD_LAYOUT_STORAGE_KEY);
}

describe("useDashboardLayoutStore", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("persists reordered and hidden sections", () => {
    act(() => {
      useDashboardLayoutStore.getState().moveDown("notifications");
      useDashboardLayoutStore.getState().hide("metrics");
    });

    const stored = JSON.parse(
      localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY) ?? "{}",
    );
    expect(stored.version).toBe(1);
    expect(stored.state.layout[0].id).toBe("metrics");
    expect(
      stored.state.layout.find((item: { id: string }) => item.id === "metrics")
        .visible,
    ).toBe(false);
  });

  it("normalizes outdated layouts during rehydration", async () => {
    localStorage.setItem(
      DASHBOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        version: 0,
        state: {
          layout: [
            { id: "unknown-from-old-version", visible: true },
            { id: "activity", visible: false },
            { id: "activity", visible: true },
          ],
        },
      }),
    );

    await act(async () => {
      await useDashboardLayoutStore.persist.rehydrate();
    });

    const { layout, hasHydrated } = useDashboardLayoutStore.getState();
    expect(layout.map((item) => item.id)).toEqual([
      "activity",
      "notifications",
      "metrics",
      "recently-viewed",
      "active-bets",
      "recommendations",
    ]);
    expect(layout[0].visible).toBe(false);
    expect(hasHydrated).toBe(true);
  });

  it("keeps the defaults for the initial render, then restores saved preferences", async () => {
    const savedLayout = [
      { id: "activity", visible: true },
      ...DEFAULT_LAYOUT.filter((item) => item.id !== "activity"),
    ];
    localStorage.setItem(
      DASHBOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify({ version: 1, state: { layout: savedLayout } }),
    );

    expect(useDashboardLayoutStore.getState().layout).toEqual(DEFAULT_LAYOUT);
    expect(useDashboardLayoutStore.getState().hasHydrated).toBe(false);

    await act(async () => {
      await useDashboardLayoutStore.persist.rehydrate();
    });

    expect(useDashboardLayoutStore.getState().layout).toEqual(savedLayout);
    expect(useDashboardLayoutStore.getState().hasHydrated).toBe(true);
  });

  it("restores the defaults and persists reset", () => {
    act(() => {
      useDashboardLayoutStore.getState().moveDown("notifications");
      useDashboardLayoutStore.getState().reset();
    });

    expect(useDashboardLayoutStore.getState().layout).toEqual(DEFAULT_LAYOUT);
    const stored = JSON.parse(
      localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY) ?? "{}",
    );
    expect(stored.state.layout).toEqual(DEFAULT_LAYOUT);
  });

  it("retains default state after corrupted persisted JSON", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, "not-json");

    await act(async () => {
      await useDashboardLayoutStore.persist.rehydrate();
    });

    expect(useDashboardLayoutStore.getState().layout).toEqual(DEFAULT_LAYOUT);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
