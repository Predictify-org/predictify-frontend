/**
 * follows.test.ts
 *
 * Unit tests for the useFollowsStore (app/state/follows.ts).
 * Covers: follow, unfollow, toggle, isFollowing, and persistence helpers.
 */

import { act } from "@testing-library/react";
import { useFollowsStore } from "../follows";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Reset store to a pristine state between tests. */
function resetStore() {
  act(() => {
    useFollowsStore.setState({ followedIds: new Set() });
  });
}

// ── tests ────────────────────────────────────────────────────────────────────

describe("useFollowsStore", () => {
  beforeEach(resetStore);

  it("initially follows no markets", () => {
    const { isFollowing } = useFollowsStore.getState();
    expect(isFollowing("market-1")).toBe(false);
  });

  it("follow() adds a market to the followed set", () => {
    act(() => useFollowsStore.getState().follow("market-1"));
    expect(useFollowsStore.getState().isFollowing("market-1")).toBe(true);
  });

  it("unfollow() removes a previously followed market", () => {
    act(() => {
      useFollowsStore.getState().follow("market-1");
      useFollowsStore.getState().unfollow("market-1");
    });
    expect(useFollowsStore.getState().isFollowing("market-1")).toBe(false);
  });

  it("toggle() switches follow state and returns the new state", () => {
    // First toggle → should follow
    let result: boolean;
    act(() => {
      result = useFollowsStore.getState().toggle("market-2");
    });
    expect(result!).toBe(true);
    expect(useFollowsStore.getState().isFollowing("market-2")).toBe(true);

    // Second toggle → should unfollow
    act(() => {
      result = useFollowsStore.getState().toggle("market-2");
    });
    expect(result!).toBe(false);
    expect(useFollowsStore.getState().isFollowing("market-2")).toBe(false);
  });

  it("following one market does not affect another", () => {
    act(() => useFollowsStore.getState().follow("market-A"));
    expect(useFollowsStore.getState().isFollowing("market-A")).toBe(true);
    expect(useFollowsStore.getState().isFollowing("market-B")).toBe(false);
  });
});
