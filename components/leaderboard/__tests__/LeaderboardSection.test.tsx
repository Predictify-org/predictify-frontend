import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeaderboardSection } from "../LeaderboardSection";

jest.mock("@/hooks/useLeaderboard", () => ({
  useLeaderboard: () => ({
    status: "success",
    data: [
      { rank: 1, name: "Alpha", profit: 1000, winRate: 80, predictions: 50, isCurrentUser: false },
      { rank: 2, name: "Beta", profit: 900, winRate: 75, predictions: 40, isCurrentUser: false },
      { rank: 3, name: "You (User)", profit: 800, winRate: 70, predictions: 30, isCurrentUser: true },
    ],
    error: null,
    lastUpdated: Date.now(),
    isStale: false,
    refetch: jest.fn(),
    retry: jest.fn(),
    reset: jest.fn(),
  }),
  LeaderboardStatus: {
    success: "success",
  },
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

describe("LeaderboardSection", () => {
  it("renders the leaderboard title", () => {
    render(<LeaderboardSection />);

    expect(screen.getByText("Top Predictors")).toBeInTheDocument();
  });

  it("renders the tab navigation", () => {
    render(<LeaderboardSection />);

    expect(screen.getByRole("tab", { name: /daily/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /weekly/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /all-time/i })).toBeInTheDocument();
  });

  it("renders user names from data", () => {
    render(<LeaderboardSection />);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("renders the Your Rank chip for current user", () => {
    render(<LeaderboardSection />);

    expect(screen.getByText("#3")).toBeInTheDocument();
  });

  it("switches tabs when clicked", async () => {
    const user = userEvent.setup();
    render(<LeaderboardSection />);

    const weeklyTab = screen.getByRole("tab", { name: /weekly/i });
    await user.click(weeklyTab);

    expect(weeklyTab).toHaveAttribute("aria-selected", "true");
  });
});
