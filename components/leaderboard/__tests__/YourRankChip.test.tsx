import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { YourRankChip } from "../YourRankChip";
import type { LeaderboardUser } from "@/lib/leaderboard-data";

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

const mockUser: LeaderboardUser = {
  rank: 42,
  name: "You (User)",
  profit: 1234.56,
  winRate: 67,
  predictions: 123,
  isCurrentUser: true,
};

describe("YourRankChip", () => {
  it("renders user rank and profit when visible=false and user is provided", () => {
    render(<YourRankChip user={mockUser} isVisible={false} />);

    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("+1234.56 XLM")).toBeInTheDocument();
    expect(screen.getByText("Your Rank")).toBeInTheDocument();
  });

  it("does not render when user is null", () => {
    render(<YourRankChip user={null} isVisible={false} />);

    expect(screen.queryByText("Your Rank")).not.toBeInTheDocument();
  });

  it("does not render when user is undefined", () => {
    render(<YourRankChip user={undefined} isVisible={false} />);

    expect(screen.queryByText("Your Rank")).not.toBeInTheDocument();
  });

  it("does not render when isVisible is true", () => {
    render(<YourRankChip user={mockUser} isVisible={true} />);

    expect(screen.queryByText("Your Rank")).not.toBeInTheDocument();
  });

  it("renders when user becomes invisible after being visible", () => {
    const { rerender } = render(<YourRankChip user={mockUser} isVisible={true} />);

    expect(screen.queryByText("Your Rank")).not.toBeInTheDocument();

    rerender(<YourRankChip user={mockUser} isVisible={false} />);

    expect(screen.getByText("Your Rank")).toBeInTheDocument();
  });

  it("dismisses chip when close button is clicked", async () => {
    render(<YourRankChip user={mockUser} isVisible={false} />);

    const dismissButton = screen.getByLabelText("Dismiss rank chip");
    await userEvent.click(dismissButton);

    expect(screen.queryByText("Your Rank")).not.toBeInTheDocument();
  });

  it("shows chip again when user becomes visible after dismiss", async () => {
    const { rerender } = render(<YourRankChip user={mockUser} isVisible={false} />);

    const dismissButton = screen.getByLabelText("Dismiss rank chip");
    await userEvent.click(dismissButton);

    rerender(<YourRankChip user={mockUser} isVisible={true} />);
    rerender(<YourRankChip user={mockUser} isVisible={false} />);

    expect(screen.getByText("Your Rank")).toBeInTheDocument();
  });

  it("has proper accessibility labels", () => {
    render(<YourRankChip user={mockUser} isVisible={false} />);

    expect(screen.getByLabelText("Dismiss rank chip")).toBeInTheDocument();
  });
});
