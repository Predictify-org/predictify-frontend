/**
 * BookmarkButton.test.tsx
 *
 * Unit tests for the BookmarkButton component.
 * Covers: rendering, clicking, keyboard navigation, accessibility, and state changes.
 */

import React from "react"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BookmarkButton } from "../BookmarkButton"
import { useBookmarksStore } from "@/app/state/bookmarks"

// ── helpers ──────────────────────────────────────────────────────────────────

/** Reset bookmarks store to pristine state between tests. */
function resetBookmarks() {
  act(() => {
    useBookmarksStore.setState({ bookmarkedIds: new Set() })
  })
}

// ── tests ────────────────────────────────────────────────────────────────────

describe("BookmarkButton", () => {
  beforeEach(() => {
    resetBookmarks()
    jest.clearAllMocks()
  })

  // --- Rendering ---

  it("renders a button with bookmark icon", () => {
    render(<BookmarkButton marketId="market-1" />)
    const button = screen.getByRole("button", { name: /bookmark this market/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute("data-testid", "bookmark-button")
  })

  it("renders with proper aria-label when not bookmarked", () => {
    render(<BookmarkButton marketId="market-1" />)
    const button = screen.getByRole("button")
    expect(button).toHaveAttribute("aria-label", "Bookmark this market")
    expect(button).toHaveAttribute("aria-pressed", "false")
  })

  it("renders with proper aria-label when bookmarked", () => {
    act(() => {
      useBookmarksStore.getState().bookmark("market-1")
    })
    render(<BookmarkButton marketId="market-1" />)
    const button = screen.getByRole("button")
    expect(button).toHaveAttribute("aria-label", "Remove bookmark")
    expect(button).toHaveAttribute("aria-pressed", "true")
  })

  it("shows unfilled icon when not bookmarked", () => {
    const { container } = render(<BookmarkButton marketId="market-1" />)
    const icon = container.querySelector("svg")
    expect(icon).toBeInTheDocument()
    // Unfilled state should not have fill-yellow-400 class
    expect(icon).not.toHaveClass("fill-yellow-400")
  })

  it("shows filled icon when bookmarked", () => {
    act(() => {
      useBookmarksStore.getState().bookmark("market-1")
    })
    const { container } = render(<BookmarkButton marketId="market-1" />)
    const icon = container.querySelector("svg")
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass("fill-yellow-400")
  })

  // --- Click Interaction ---

  it("bookmarks a market when clicked while not bookmarked", async () => {
    const user = userEvent.setup()
    render(<BookmarkButton marketId="market-1" />)
    const button = screen.getByRole("button")

    await user.click(button)

    expect(useBookmarksStore.getState().isBookmarked("market-1")).toBe(true)
  })

  it("unbookmarks a market when clicked while bookmarked", async () => {
    const user = userEvent.setup()
    act(() => {
      useBookmarksStore.getState().bookmark("market-1")
    })
    render(<BookmarkButton marketId="market-1" />)
    const button = screen.getByRole("button")

    await user.click(button)

    expect(useBookmarksStore.getState().isBookmarked("market-1")).toBe(false)
  })

  it("calls onToggle callback with new state when clicked", async () => {
    const user = userEvent.setup()
    const onToggle = jest.fn()
    render(<BookmarkButton marketId="market-1" onToggle={onToggle} />)
    const button = screen.getByRole("button")

    // First click: bookmark
    await user.click(button)
    expect(onToggle).toHaveBeenCalledWith(true)

    // Second click: unbookmark
    await user.click(button)
    expect(onToggle).toHaveBeenCalledWith(false)
  })

  // --- Keyboard Navigation ---

  it("can be activated with Enter key", async () => {
    const user = userEvent.setup()
    render(<BookmarkButton marketId="market-1" />)
    const button = screen.getByRole("button")

    button.focus()
    await user.keyboard("{Enter}")

    expect(useBookmarksStore.getState().isBookmarked("market-1")).toBe(true)
  })

  it("can be activated with Space key", async () => {
    const user = userEvent.setup()
    render(<BookmarkButton marketId="market-1" />)
    const button = screen.getByRole("button")

    button.focus()
    await user.keyboard(" ")

    expect(useBookmarksStore.getState().isBookmarked("market-1")).toBe(true)
  })

  // --- Multiple Instances ---

  it("multiple buttons for different markets work independently", async () => {
    const user = userEvent.setup()
    render(
      <>
        <BookmarkButton marketId="market-1" />
        <BookmarkButton marketId="market-2" />
      </>
    )

    const buttons = screen.getAllByRole("button")
    await user.click(buttons[0])

    expect(useBookmarksStore.getState().isBookmarked("market-1")).toBe(true)
    expect(useBookmarksStore.getState().isBookmarked("market-2")).toBe(false)
  })

  // --- Custom Props ---

  it("accepts custom className prop", () => {
    const { container } = render(
      <BookmarkButton marketId="market-1" className="custom-class" />
    )
    const button = container.querySelector("button")
    expect(button).toHaveClass("custom-class")
  })

  it("accepts custom size prop", () => {
    render(<BookmarkButton marketId="market-1" size="sm" />)
    const button = screen.getByRole("button")
    expect(button).toBeInTheDocument()
  })

  // --- Accessibility ---

  it("has accessible button role", () => {
    render(<BookmarkButton marketId="market-1" />)
    const button = screen.getByRole("button")
    expect(button).toBeInTheDocument()
  })

  it("icon has aria-hidden attribute", () => {
    const { container } = render(<BookmarkButton marketId="market-1" />)
    const icon = container.querySelector("svg")
    expect(icon).toHaveAttribute("aria-hidden", "true")
  })

  it("maintains focus after click", async () => {
    const user = userEvent.setup()
    render(<BookmarkButton marketId="market-1" />)
    const button = screen.getByRole("button")

    button.focus()
    expect(button).toHaveFocus()

    await user.click(button)
    expect(button).toHaveFocus()
  })

  // --- Edge Cases ---

  it("handles rapid clicks without errors", async () => {
    const user = userEvent.setup()
    render(<BookmarkButton marketId="market-1" />)
    const button = screen.getByRole("button")

    await user.click(button)
    await user.click(button)
    await user.click(button)

    // Should toggle back to not bookmarked (odd number of clicks)
    expect(useBookmarksStore.getState().isBookmarked("market-1")).toBe(true)
  })

  it("works with empty marketId string", async () => {
    const user = userEvent.setup()
    render(<BookmarkButton marketId="" />)
    const button = screen.getByRole("button")

    await user.click(button)

    expect(useBookmarksStore.getState().isBookmarked("")).toBe(true)
  })

  it("handles special characters in marketId", async () => {
    const user = userEvent.setup()
    const specialId = "market-123!@#$%"
    render(<BookmarkButton marketId={specialId} />)
    const button = screen.getByRole("button")

    await user.click(button)

    expect(useBookmarksStore.getState().isBookmarked(specialId)).toBe(true)
  })
})
