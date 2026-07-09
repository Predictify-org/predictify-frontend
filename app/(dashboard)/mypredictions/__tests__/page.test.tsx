import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyPredictionsAndHistoryPage from "../page";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
}));

// Mock next/image to render a plain <img> with the same alt so tests
// can assert on the illustration without pulling in Next's runtime.
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

describe("MyPredictionsAndHistoryPage empty state", () => {
  it("renders the page with the default All tab and a populated card list", () => {
    render(<MyPredictionsAndHistoryPage />);
    // One of the seeded cards should be present.
    expect(screen.getByText(/NBA Finals/i)).toBeInTheDocument();
    // The empty state is NOT shown while there is data.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a themed empty state when the Active tab has no matches", async () => {
    const user = userEvent.setup();
    render(<MyPredictionsAndHistoryPage />);
    // There are active predictions in the seed data, so we type a
    // search term that no active prediction matches, then assert that
    // the empty state is shown with the correct copy and a reset CTA.
    await user.click(screen.getByRole("button", { name: /^Active$/ }));
    await user.type(
      screen.getByRole("searchbox", { name: /search predictions/i }),
      "ZZZ-no-match-zzz",
    );
    const region = screen.getByRole("status");
    expect(region).toBeInTheDocument();
    expect(
      within(region).getByText(/No "Active" predictions/i),
    ).toBeInTheDocument();
    expect(
      within(region).getByRole("button", { name: /reset filters/i }),
    ).toBeInTheDocument();
  });

  it("renders the reset CTA and clicking it restores the default view", async () => {
    const user = userEvent.setup();
    render(<MyPredictionsAndHistoryPage />);
    await user.click(screen.getByRole("button", { name: /^Completed$/ }));
    // Switch to Completed and type a non-matching search term.
    await user.type(
      screen.getByRole("searchbox", { name: /search predictions/i }),
      "ZZZ-no-match-zzz",
    );
    const region = screen.getByRole("status");
    expect(
      within(region).getByText(/No "Completed" predictions/i),
    ).toBeInTheDocument();

    // Click the reset CTA.
    await user.click(
      within(region).getByRole("button", { name: /reset filters/i }),
    );
    // The empty state should disappear and the seeded data returns.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(/NBA Finals/i)).toBeInTheDocument();
  });

  it("the empty state is announced politely to screen readers", async () => {
    const user = userEvent.setup();
    render(<MyPredictionsAndHistoryPage />);
    // Filter to a tab whose copy we know we can rely on.
    await user.click(screen.getByRole("button", { name: /^Active$/ }));
    // Search for something that doesn't match.
    await user.type(
      screen.getByRole("searchbox", { name: /search predictions/i }),
      "ZZZ-no-match-zzz",
    );
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("the empty state renders a Browse events link when not on the Active tab", async () => {
    const user = userEvent.setup();
    render(<MyPredictionsAndHistoryPage />);
    await user.click(screen.getByRole("button", { name: /^Pending$/ }));
    await user.type(
      screen.getByRole("searchbox", { name: /search predictions/i }),
      "ZZZ-no-match-zzz",
    );
    const region = screen.getByRole("status");
    const link = within(region).getByRole("link", { name: /browse events/i });
    expect(link).toHaveAttribute("href", "/events");
  });

  it("search-only filtering is honoured: the reset CTA clears the search", async () => {
    const user = userEvent.setup();
    render(<MyPredictionsAndHistoryPage />);
    // Type a non-matching search term while on the default All tab.
    await user.type(
      screen.getByRole("searchbox", { name: /search predictions/i }),
      "ZZZ-no-match-zzz",
    );
    const region = screen.getByRole("status");
    expect(
      within(region).getByText(/No predictions yet/i),
    ).toBeInTheDocument();
    // Click the reset CTA and assert searchbox is empty and the data is back.
    await user.click(
      within(region).getByRole("button", { name: /reset filters/i }),
    );
    expect(
      screen.getByRole("searchbox", { name: /search predictions/i }),
    ).toHaveValue("");
    expect(screen.getByText(/NBA Finals/i)).toBeInTheDocument();
  });
});
