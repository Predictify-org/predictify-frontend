import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeaderboardTable } from "../LeaderboardTable";
import { LeaderboardUser } from "@/lib/leaderboard-data";

jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        start: index * 64,
        size: 64,
      })),
    getTotalSize: () => count * 64,
  }),
}));

jest.mock("framer-motion", () => {
  const MockMotionDiv = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    (props, ref) => React.createElement("div", { ref, ...props })
  );
  MockMotionDiv.displayName = "MockMotionDiv";
  return {
    motion: { div: MockMotionDiv },
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

function createUsers(): LeaderboardUser[] {
  return [
    { rank: 1, name: "Alpha", profit: 1200, winRate: 62, predictions: 35 },
    { rank: 2, name: "Beta", profit: 2200, winRate: 71, predictions: 40 },
    { rank: 3, name: "Gamma", profit: 1800, winRate: 79, predictions: 52 },
  ];
}

function getScrollContainer(container: HTMLElement): HTMLDivElement {
  return container.querySelector(".overflow-auto") as HTMLDivElement;
}

function simulateScroll(div: HTMLDivElement, scrollTop: number, overrides?: Partial<{ scrollHeight: number; clientHeight: number }>) {
  Object.defineProperty(div, "scrollTop", { writable: true, configurable: true, value: scrollTop });
  if (overrides?.scrollHeight !== undefined) {
    Object.defineProperty(div, "scrollHeight", { writable: true, configurable: true, value: overrides.scrollHeight });
  }
  if (overrides?.clientHeight !== undefined) {
    Object.defineProperty(div, "clientHeight", { writable: true, configurable: true, value: overrides.clientHeight });
  }
  fireEvent.scroll(div);
}

describe("LeaderboardTable", () => {
  it("sorts by profit descending by default and exposes the active sort state", async () => {
    render(<LeaderboardTable users={createUsers()} />);

    const profitButton = screen.getByRole("button", { name: /sort by profit/i });
    expect(profitButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Beta");
  });

  it("supports keyboard toggling for a different column", async () => {
    const user = userEvent.setup();
    render(<LeaderboardTable users={createUsers()} />);

    const winRateButton = screen.getByRole("button", { name: /sort by win rate/i });
    winRateButton.focus();
    await user.keyboard("{Enter}");

    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Gamma");
    expect(winRateButton).toHaveAttribute("aria-pressed", "true");
  });

  describe("Sticky Action Bar", () => {
    it("does not render the action bar when not scrolled", () => {
      render(<LeaderboardTable users={createUsers()} />);

      expect(screen.queryByLabelText("Scroll to top of leaderboard")).not.toBeInTheDocument();
      expect(screen.queryByText("3 Predictors")).not.toBeInTheDocument();
    });

    it("renders the action bar after scrolling past threshold", async () => {
      const { container } = render(<LeaderboardTable users={createUsers()} />);
      const scrollDiv = getScrollContainer(container);

      simulateScroll(scrollDiv, 100);

      await waitFor(() => {
        expect(screen.getByLabelText("Scroll to top of leaderboard")).toBeInTheDocument();
      });
    });

    it("displays the predictor count in the action bar", async () => {
      const { container } = render(<LeaderboardTable users={createUsers()} />);
      const scrollDiv = getScrollContainer(container);

      simulateScroll(scrollDiv, 100);

      await waitFor(() => {
        expect(screen.getByText("3 Predictors")).toBeInTheDocument();
      });
    });

    it("calls onShare when share button is clicked", async () => {
      const onShare = jest.fn();
      const user = userEvent.setup();
      const { container } = render(
        <LeaderboardTable users={createUsers()} onShare={onShare} />
      );
      const scrollDiv = getScrollContainer(container);

      simulateScroll(scrollDiv, 100);

      await waitFor(() => {
        expect(screen.getByLabelText("Share leaderboard rankings")).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText("Share leaderboard rankings"));
      expect(onShare).toHaveBeenCalledTimes(1);
    });

    it("does not render share button when onShare is not provided", async () => {
      const { container } = render(<LeaderboardTable users={createUsers()} />);
      const scrollDiv = getScrollContainer(container);

      simulateScroll(scrollDiv, 100);

      await waitFor(() => {
        expect(screen.getByLabelText("Scroll to top of leaderboard")).toBeInTheDocument();
      });

      expect(screen.queryByLabelText("Share leaderboard rankings")).not.toBeInTheDocument();
    });

    it("scrolls to top when back to top button is clicked", async () => {
      const { container } = render(<LeaderboardTable users={createUsers()} />);
      const scrollDiv = getScrollContainer(container);

      simulateScroll(scrollDiv, 300, { scrollHeight: 2000, clientHeight: 600 });

      await waitFor(() => {
        expect(screen.getByLabelText("Scroll to top of leaderboard")).toBeInTheDocument();
      });

      const button = screen.getByLabelText("Scroll to top of leaderboard");
      expect(button).toBeEnabled();

      const scrollToCalls: unknown[] = [];
      Object.defineProperty(scrollDiv, "scrollTo", {
        configurable: true,
        writable: true,
        value: jest.fn((...args: unknown[]) => {
          scrollToCalls.push(args[0]);
        }),
      });

      fireEvent.click(button);

      expect(scrollToCalls).toHaveLength(1);
      expect(scrollToCalls[0]).toEqual({ top: 0, behavior: "smooth" });
    });

    it("disables back to top button when near bottom of scroll", async () => {
      const { container } = render(<LeaderboardTable users={createUsers()} />);
      const scrollDiv = getScrollContainer(container);

      simulateScroll(scrollDiv, 500, { scrollHeight: 1000, clientHeight: 600 });

      await waitFor(() => {
        const button = screen.getByLabelText("Scroll to top of leaderboard");
        expect(button).toBeDisabled();
      });
    });

    it("enables back to top button when not near bottom of scroll", async () => {
      const { container } = render(<LeaderboardTable users={createUsers()} />);
      const scrollDiv = getScrollContainer(container);

      simulateScroll(scrollDiv, 100, { scrollHeight: 2000, clientHeight: 600 });

      await waitFor(() => {
        const button = screen.getByLabelText("Scroll to top of leaderboard");
        expect(button).not.toBeDisabled();
      });
    });

    it("hides action bar when scrolling back to top", async () => {
      const { container } = render(<LeaderboardTable users={createUsers()} />);
      const scrollDiv = getScrollContainer(container);

      simulateScroll(scrollDiv, 100);

      await waitFor(() => {
        expect(screen.getByLabelText("Scroll to top of leaderboard")).toBeInTheDocument();
      });

      simulateScroll(scrollDiv, 0);

      await waitFor(() => {
        expect(screen.queryByLabelText("Scroll to top of leaderboard")).not.toBeInTheDocument();
      });
    });

    it("has proper accessibility attributes on action bar buttons", async () => {
      const { container } = render(<LeaderboardTable users={createUsers()} />);
      const scrollDiv = getScrollContainer(container);

      simulateScroll(scrollDiv, 100);

      await waitFor(() => {
        expect(screen.getByLabelText("Scroll to top of leaderboard")).toHaveAttribute(
          "aria-label",
          "Scroll to top of leaderboard"
        );
      });
    });

    it("hides predictor count text on mobile viewports", async () => {
      const { container } = render(<LeaderboardTable users={createUsers()} />);
      const scrollDiv = getScrollContainer(container);

      simulateScroll(scrollDiv, 100);

      await waitFor(() => {
        const predictorText = screen.getByText("3 Predictors");
        expect(predictorText).toHaveClass("hidden", "sm:inline");
      });
    });

    it("hides button text labels on mobile viewports", async () => {
      const { container } = render(<LeaderboardTable users={createUsers()} />);
      const scrollDiv = getScrollContainer(container);

      simulateScroll(scrollDiv, 100);

      await waitFor(() => {
        const backToTopText = screen.getByText("Back to top");
        expect(backToTopText).toHaveClass("hidden", "sm:inline");
      });
    });

    it("does not render action bar when scroll is below threshold", async () => {
      const { container } = render(<LeaderboardTable users={createUsers()} />);
      const scrollDiv = getScrollContainer(container);

      simulateScroll(scrollDiv, 30);

      await waitFor(() => {
        expect(screen.queryByLabelText("Scroll to top of leaderboard")).not.toBeInTheDocument();
      });
    });
  });
});
