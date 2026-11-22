import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomizeLayoutPanel } from "../CustomizeLayoutPanel";
import { DEFAULT_LAYOUT } from "@/lib/dashboard-layout";
import { useDashboardLayoutStore } from "@/app/state/dashboardLayout";

describe("CustomizeLayoutPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    useDashboardLayoutStore.setState({
      layout: DEFAULT_LAYOUT.map((item) => ({ ...item })),
      hasHydrated: false,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("opens and reorders sections with keyboard activation", async () => {
    const user = userEvent.setup();
    render(<CustomizeLayoutPanel />);

    const trigger = screen.getByRole("button", { name: /customize/i });
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    const moveDown = screen.getByRole("button", {
      name: "Move Notifications digest down",
    });
    moveDown.focus();
    await user.keyboard("{Enter}");

    expect(useDashboardLayoutStore.getState().layout[1].id).toBe("notifications");
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-layout-announcement")).toHaveTextContent(
        "Notifications digest moved to position 2 of 6.",
      );
    });
  });

  it("disables moves at list boundaries", async () => {
    const user = userEvent.setup();
    render(<CustomizeLayoutPanel />);
    await user.click(screen.getByRole("button", { name: /customize/i }));

    expect(
      screen.getByRole("button", { name: "Move Notifications digest up" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move Activity down" }),
    ).toBeDisabled();
  });

  it("toggles section visibility with the keyboard and announces the change", async () => {
    const user = userEvent.setup();
    render(<CustomizeLayoutPanel />);
    const trigger = screen.getByRole("button", { name: /customize/i });
    trigger.focus();
    await user.keyboard("{Enter}");

    const visibility = await screen.findByRole("checkbox", {
      name: "Show Key metrics",
    });
    visibility.focus();
    await user.keyboard(" ");

    expect(
      useDashboardLayoutStore
        .getState()
        .layout.find((item) => item.id === "metrics")?.visible,
    ).toBe(false);
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-layout-announcement")).toHaveTextContent(
        "Key metrics hidden.",
      );
    });
  });

  it("prevents hiding the final visible section and can reset the layout", async () => {
    const user = userEvent.setup();
    useDashboardLayoutStore.setState({
      layout: DEFAULT_LAYOUT.map((item) => ({
        ...item,
        visible: item.id === "activity",
      })),
    });
    render(<CustomizeLayoutPanel />);
    await user.click(screen.getByRole("button", { name: /customize/i }));

    expect(
      screen.getByRole("checkbox", { name: "Show Activity" }),
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Reset to default" }));
    expect(useDashboardLayoutStore.getState().layout).toEqual(DEFAULT_LAYOUT);
  });
});
