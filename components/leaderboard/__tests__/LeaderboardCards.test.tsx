import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeaderboardCards } from "../LeaderboardCards";
import type { LeaderboardUser } from "@/lib/leaderboard-data";

jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        start: index * 80,
        size: 80,
      })),
    getTotalSize: () => count * 80,
  }),
}));

function createUsers(): LeaderboardUser[] {
  return [
    { rank: 1, name: "Alpha", profit: 1200, winRate: 62, predictions: 35 },
    { rank: 2, name: "Beta", profit: 2200, winRate: 71, predictions: 40 },
  ];
}

describe("LeaderboardCards", () => {
  it("renders users when data is provided", () => {
    render(<LeaderboardCards users={createUsers()} />);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("renders loading skeletons when isLoading is true", () => {
    const { container } = render(<LeaderboardCards users={[]} isLoading={true} />);

    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error state when error is provided", () => {
    render(<LeaderboardCards users={[]} error="Failed to load" />);

    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("renders empty state when users array is empty", () => {
    render(<LeaderboardCards users={[]} />);

    expect(screen.getByText("No Rankings Yet")).toBeInTheDocument();
  });

  it("renders retry button in error state when onRetry is provided", async () => {
    const onRetry = jest.fn();
    render(<LeaderboardCards users={[]} error="Failed" onRetry={onRetry} />);

    const retryButton = screen.getByRole("button", { name: /try again/i });
    await userEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders retry button in empty state when onRetry is provided", async () => {
    const onRetry = jest.fn();
    render(<LeaderboardCards users={[]} onRetry={onRetry} />);

    const retryButton = screen.getByRole("button", { name: /refresh/i });
    await userEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render cards when loading", () => {
    render(<LeaderboardCards users={createUsers()} isLoading={true} />);

    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  it("does not render cards when error is present", () => {
    render(<LeaderboardCards users={createUsers()} error="Failed" />);

    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  it("does not render cards when users is empty", () => {
    render(<LeaderboardCards users={[]} />);

    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });
});
