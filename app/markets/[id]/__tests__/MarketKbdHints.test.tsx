/**
 * MarketKbdHints.test.tsx
 *
 * Focused tests for the keyboard-shortcut hint strip on MarketDetail (v7).
 *
 * Coverage:
 *  1. Hint strip renders with correct data-testid.
 *  2. Both hint rows (share, place-bet) are present.
 *  3. Key chips render inside each hint row.
 *  4. Strip is aria-hidden (purely decorative for screen readers).
 *  5. onShare callback fires on ⌘/Ctrl + Shift + S.
 *  6. onPlaceBet callback fires on ⌘/Ctrl + B.
 *  7. Neither callback fires for unrelated key combos.
 *  8. Callbacks default to no-op when omitted.
 *  9. Touch-device detection hides the strip.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarketKbdHints } from "../MarketKbdHints";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// KbdHint renders a <kbd>; stub it to keep the test output simple.
jest.mock("@/src/components/KbdHint", () => {
  const Mock = ({ children }: { children: React.ReactNode }) => (
    <kbd data-testid="kbd-chip">{children}</kbd>
  );
  Mock.displayName = "KbdHint";
  return Mock;
});

// Default matchMedia to pointer:fine (non-touch) so the strip is visible.
const mockMatchMedia = (coarse: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query.includes("coarse") ? coarse : false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
};

beforeEach(() => {
  mockMatchMedia(false); // non-touch by default
});

// ---------------------------------------------------------------------------
// 1. Strip renders
// ---------------------------------------------------------------------------

it("renders the hint strip with data-testid=market-kbd-hints", () => {
  render(<MarketKbdHints />);
  expect(screen.getByTestId("market-kbd-hints")).toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// 2. Both hint rows present
// ---------------------------------------------------------------------------

it("renders the share-market hint row", () => {
  render(<MarketKbdHints />);
  expect(screen.getByTestId("kbd-hint-share")).toBeInTheDocument();
});

it("renders the place-bet hint row", () => {
  render(<MarketKbdHints />);
  expect(screen.getByTestId("kbd-hint-place-bet")).toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// 3. Key chips rendered
// ---------------------------------------------------------------------------

it("renders at least one <kbd> chip per hint row", () => {
  render(<MarketKbdHints />);
  const chips = screen.getAllByTestId("kbd-chip");
  // 3 chips for share (⌘ ⇧ S) + 2 chips for place-bet (⌘ B) = 5 minimum on Mac
  expect(chips.length).toBeGreaterThanOrEqual(4);
});

// ---------------------------------------------------------------------------
// 4. aria-hidden
// ---------------------------------------------------------------------------

it("strip has aria-hidden=true (decorative)", () => {
  render(<MarketKbdHints />);
  expect(screen.getByTestId("market-kbd-hints")).toHaveAttribute(
    "aria-hidden",
    "true"
  );
});

// ---------------------------------------------------------------------------
// 5. ⌘/Ctrl + Shift + S fires onShare
// ---------------------------------------------------------------------------

it("fires onShare on metaKey + Shift + S", () => {
  const onShare = jest.fn();
  render(<MarketKbdHints onShare={onShare} />);

  fireEvent.keyDown(window, { key: "s", metaKey: true, shiftKey: true });
  expect(onShare).toHaveBeenCalledTimes(1);
});

it("fires onShare on ctrlKey + Shift + S (Windows)", () => {
  const onShare = jest.fn();
  render(<MarketKbdHints onShare={onShare} />);

  fireEvent.keyDown(window, { key: "s", ctrlKey: true, shiftKey: true });
  expect(onShare).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------------------
// 6. ⌘/Ctrl + B fires onPlaceBet
// ---------------------------------------------------------------------------

it("fires onPlaceBet on metaKey + B", () => {
  const onPlaceBet = jest.fn();
  render(<MarketKbdHints onPlaceBet={onPlaceBet} />);

  fireEvent.keyDown(window, { key: "b", metaKey: true });
  expect(onPlaceBet).toHaveBeenCalledTimes(1);
});

it("fires onPlaceBet on ctrlKey + B (Windows)", () => {
  const onPlaceBet = jest.fn();
  render(<MarketKbdHints onPlaceBet={onPlaceBet} />);

  fireEvent.keyDown(window, { key: "b", ctrlKey: true });
  expect(onPlaceBet).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------------------
// 7. Unrelated keys don't fire callbacks
// ---------------------------------------------------------------------------

it("does not fire onShare on a plain S key press", () => {
  const onShare = jest.fn();
  render(<MarketKbdHints onShare={onShare} />);

  fireEvent.keyDown(window, { key: "s" });
  expect(onShare).not.toHaveBeenCalled();
});

it("does not fire onPlaceBet on plain B key press", () => {
  const onPlaceBet = jest.fn();
  render(<MarketKbdHints onPlaceBet={onPlaceBet} />);

  fireEvent.keyDown(window, { key: "b" });
  expect(onPlaceBet).not.toHaveBeenCalled();
});

it("does not fire onShare when only ctrlKey (no shift) + S", () => {
  const onShare = jest.fn();
  render(<MarketKbdHints onShare={onShare} />);

  fireEvent.keyDown(window, { key: "s", ctrlKey: true, shiftKey: false });
  expect(onShare).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// 8. Omitted callbacks default to no-op (no throws)
// ---------------------------------------------------------------------------

it("does not throw when onShare is omitted and shortcut fires", () => {
  render(<MarketKbdHints />);
  expect(() =>
    fireEvent.keyDown(window, { key: "s", metaKey: true, shiftKey: true })
  ).not.toThrow();
});

it("does not throw when onPlaceBet is omitted and shortcut fires", () => {
  render(<MarketKbdHints />);
  expect(() =>
    fireEvent.keyDown(window, { key: "b", ctrlKey: true })
  ).not.toThrow();
});

// ---------------------------------------------------------------------------
// 9. Touch device hides strip
// ---------------------------------------------------------------------------

it("returns null on pointer:coarse (touch) devices", () => {
  mockMatchMedia(true); // simulate touch
  render(<MarketKbdHints />);
  // After hydration sets isTouch=true the component returns null.
  // In JSDOM the useEffect runs synchronously in the test environment,
  // so the element should be absent after render.
  expect(screen.queryByTestId("market-kbd-hints")).not.toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// Edge: listener is removed on unmount
// ---------------------------------------------------------------------------

it("removes the keydown listener on unmount (no stale handler)", () => {
  const addSpy = jest.spyOn(window, "addEventListener");
  const removeSpy = jest.spyOn(window, "removeEventListener");

  const { unmount } = render(<MarketKbdHints />);
  unmount();

  // Both add and remove should have been called for "keydown"
  const addCalls = addSpy.mock.calls.filter(([ev]) => ev === "keydown");
  const removeCalls = removeSpy.mock.calls.filter(([ev]) => ev === "keydown");
  expect(addCalls.length).toBeGreaterThanOrEqual(1);
  expect(removeCalls.length).toBeGreaterThanOrEqual(1);

  addSpy.mockRestore();
  removeSpy.mockRestore();
});
