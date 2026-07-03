import { act } from "@testing-library/react";
import { useBookmarksStore } from "../bookmarks";

function resetStore() {
  act(() => {
    useBookmarksStore.setState({ bookmarkedIds: new Set() });
  });
}

describe("useBookmarksStore", () => {
  beforeEach(resetStore);

  it("starts with no saved markets", () => {
    expect(useBookmarksStore.getState().isBookmarked("btc-price")).toBe(false);
    expect(useBookmarksStore.getState().getCount()).toBe(0);
  });

  it("adds and removes saved markets directly", () => {
    act(() => {
      useBookmarksStore.getState().bookmark("btc-price");
    });

    expect(useBookmarksStore.getState().isBookmarked("btc-price")).toBe(true);
    expect(useBookmarksStore.getState().getCount()).toBe(1);

    act(() => {
      useBookmarksStore.getState().unbookmark("btc-price");
    });

    expect(useBookmarksStore.getState().isBookmarked("btc-price")).toBe(false);
    expect(useBookmarksStore.getState().getCount()).toBe(0);
  });

  it("toggles a market bookmark and returns the new state", () => {
    let result: boolean;

    act(() => {
      result = useBookmarksStore.getState().toggle("btc-price");
    });

    expect(result!).toBe(true);
    expect(useBookmarksStore.getState().isBookmarked("btc-price")).toBe(true);
    expect(useBookmarksStore.getState().getCount()).toBe(1);

    act(() => {
      result = useBookmarksStore.getState().toggle("btc-price");
    });

    expect(result!).toBe(false);
    expect(useBookmarksStore.getState().isBookmarked("btc-price")).toBe(false);
    expect(useBookmarksStore.getState().getCount()).toBe(0);
  });
});
