import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { BookmarkButton } from "../BookmarkButton";
import { useBookmarksStore } from "@/app/state/bookmarks";

function resetStore() {
  useBookmarksStore.setState({ bookmarkedIds: new Set() });
}

describe("BookmarkButton", () => {
  beforeEach(resetStore);

  it("saves and removes a market with accessible pressed state", () => {
    render(<BookmarkButton marketId="btc-price" marketTitle="Bitcoin Price" />);

    const button = screen.getByRole("button", { name: "Save Bitcoin Price for later" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);

    expect(
      screen.getByRole("button", { name: "Remove Bitcoin Price from saved markets" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(useBookmarksStore.getState().isBookmarked("btc-price")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Remove Bitcoin Price from saved markets" }));

    expect(screen.getByRole("button", { name: "Save Bitcoin Price for later" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(useBookmarksStore.getState().isBookmarked("btc-price")).toBe(false);
  });
});
