import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WatchlistPage from "../page";
import { useBookmarksStore } from "@/app/state/bookmarks";
import { useFollowsStore } from "@/app/state/follows";
import { useSavedMarketsStore } from "@/app/state/saved-markets";

describe("WatchlistPage", () => {
  beforeEach(() => {
    act(() => {
      useBookmarksStore.setState({ bookmarkedIds: new Set(["1"]) });
      useFollowsStore.setState({ followedIds: new Set(["1"]) });
      useSavedMarketsStore.setState({ savedIds: new Set(["1"]) });
    });
  });

  afterEach(() => {
    act(() => {
      useBookmarksStore.setState({ bookmarkedIds: new Set() });
      useFollowsStore.setState({ followedIds: new Set() });
      useSavedMarketsStore.setState({ savedIds: new Set() });
    });
  });

  it("shows all sources for a market and result count", async () => {
    render(<WatchlistPage />);
    expect(await screen.findByText("Arsenal vs Liverpool")).toBeInTheDocument();
    expect(screen.getAllByText("Bookmarked").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Following").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Saved").length).toBeGreaterThan(0);
  });

  it("shows stale ids without crashing", async () => {
    act(() => {
      useBookmarksStore.setState({ bookmarkedIds: new Set(["deleted-market"]) });
      useFollowsStore.setState({ followedIds: new Set() });
      useSavedMarketsStore.setState({ savedIds: new Set() });
    });
    render(<WatchlistPage />);
    expect(await screen.findByText("Market unavailable")).toBeInTheDocument();
  });

  it("bulk removal updates every source and supports undo", async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn(() => true);
    render(<WatchlistPage />);
    await screen.findByText("Arsenal vs Liverpool");

    await user.click(screen.getByRole("checkbox", { name: "Select Arsenal vs Liverpool" }));
    await user.click(screen.getByRole("button", { name: "Remove selected" }));

    expect(useBookmarksStore.getState().isBookmarked("1")).toBe(false);
    expect(useFollowsStore.getState().isFollowing("1")).toBe(false);
    expect(useSavedMarketsStore.getState().isSaved("1")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(useBookmarksStore.getState().isBookmarked("1")).toBe(true);
    expect(useFollowsStore.getState().isFollowing("1")).toBe(true);
    expect(useSavedMarketsStore.getState().isSaved("1")).toBe(true);
  });

  it("shows the empty state when every store is empty", async () => {
    act(() => {
      useBookmarksStore.setState({ bookmarkedIds: new Set() });
      useFollowsStore.setState({ followedIds: new Set() });
      useSavedMarketsStore.setState({ savedIds: new Set() });
    });
    render(<WatchlistPage />);
    expect(await screen.findByText("Your watchlist is empty")).toBeInTheDocument();
  });
});
