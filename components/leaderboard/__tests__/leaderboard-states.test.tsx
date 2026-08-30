import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  LeaderboardEmptyState,
  LeaderboardErrorState,
  LeaderboardLoadingState,
  LeaderboardSkeleton,
} from "../leaderboard-states";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => React.createElement("img", props),
}));

describe("LeaderboardEmptyState", () => {
  it("renders default empty state content", () => {
    render(<LeaderboardEmptyState />);

    expect(screen.getByText("No Rankings Yet")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("renders custom title and description", () => {
    render(<LeaderboardEmptyState title="Custom Title" description="Custom description" />);

    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom description")).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided", async () => {
    const onRetry = jest.fn();
    render(<LeaderboardEmptyState onRetry={onRetry} />);

    const retryButton = screen.getByRole("button", { name: /refresh/i });
    await userEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render retry button when onRetry is omitted", () => {
    render(<LeaderboardEmptyState />);

    expect(screen.queryByRole("button", { name: /refresh/i })).not.toBeInTheDocument();
  });
});

describe("LeaderboardErrorState", () => {
  it("renders default error state", () => {
    render(<LeaderboardErrorState />);

    expect(screen.getByText("Failed to Load Leaderboard")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  });

  it("renders custom error message without sensitive data", () => {
    render(<LeaderboardErrorState error="Something went wrong" />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("sanitizes error messages containing sensitive data", () => {
    render(<LeaderboardErrorState error="Failed with token ghp_1234567890" />);

    expect(screen.queryByText(/ghp_1234567890/)).not.toBeInTheDocument();
    expect(screen.getByText(/Unable to load leaderboard data/)).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided", async () => {
    const onRetry = jest.fn();
    render(<LeaderboardErrorState onRetry={onRetry} />);

    const retryButton = screen.getByRole("button", { name: /try again/i });
    await userEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render retry button when onRetry is omitted", () => {
    render(<LeaderboardErrorState />);

    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });
});

describe("LeaderboardLoadingState", () => {
  it("renders default loading message", () => {
    render(<LeaderboardLoadingState />);

    expect(screen.getByText("Loading leaderboard...")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("renders custom loading message", () => {
    render(<LeaderboardLoadingState message="Please wait..." />);

    expect(screen.getByText("Please wait...")).toBeInTheDocument();
  });

  it("renders a spinner animation", () => {
    const { container } = render(<LeaderboardLoadingState />);

    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});

describe("LeaderboardSkeleton", () => {
  it("renders default number of skeleton rows", () => {
    const { container } = render(<LeaderboardSkeleton />);

    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders custom number of rows", () => {
    const { container } = render(<LeaderboardSkeleton rows={4} />);

    const rows = container.querySelectorAll(".border-slate-800");
    expect(rows.length).toBe(4);
  });
});
