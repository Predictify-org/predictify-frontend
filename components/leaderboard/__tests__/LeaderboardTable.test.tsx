import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeaderboardTable } from "../LeaderboardTable";
import type { LeaderboardUser } from "@/lib/leaderboard-data";

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

function createUsers(): LeaderboardUser[] {
  return [
    { rank: 1, name: "Alpha", profit: 1200, winRate: 62, predictions: 35 },
    { rank: 2, name: "Beta", profit: 2200, winRate: 71, predictions: 40 },
    { rank: 3, name: "Gamma", profit: 1800, winRate: 79, predictions: 52 },
  ];
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

  it("provides responsive avatar sources and mobile-aware image sizes", () => {
    render(
      <LeaderboardTable
        users={[
          {
            ...createUsers()[0],
            avatarUrl: "https://cdn.example.test/alpha.webp",
          },
        ]}
      />,
    );

    const avatar = screen.getByRole("img");
    expect(avatar).toHaveAttribute(
      "srcset",
      expect.stringContaining("https://cdn.example.test/alpha.webp?w=48 48w"),
    );
    expect(avatar).toHaveAttribute(
      "srcset",
      expect.stringContaining("https://cdn.example.test/alpha.webp?w=192 192w"),
    );
    expect(avatar).toHaveAttribute("sizes", "(max-width: 640px) 40px, 48px");
    expect(avatar).toHaveAttribute("alt", "");
  });
});
