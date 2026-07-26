import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import MarketCard from "../MarketCard";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Render the card and return its container element for querying. */
function renderCard(overrides: Partial<Parameters<typeof MarketCard>[0]> = {}) {
  return render(
    <MarketCard
      id="1"
      title="Test Market"
      status="active"
      {...overrides}
    />,
  );
}

// ---------------------------------------------------------------------------
// Accessibility / status pattern tests (unchanged from original)
// ---------------------------------------------------------------------------

describe("MarketCard Color-Blind Accessibility", () => {
  it("renders Active status with status-pattern-active class", () => {
    renderCard({ status: "active" });
    const badge = screen.getByRole("status");
    expect(badge).toHaveClass("status-pattern-active");
    expect(badge).toHaveAttribute("aria-label", "Market status: active");
  });

  it("renders Closed status with status-pattern-closed class", () => {
    renderCard({ status: "closed" });
    const badge = screen.getByRole("status");
    expect(badge).toHaveClass("status-pattern-closed");
    expect(badge).toHaveAttribute("aria-label", "Market status: closed");
  });

  it("renders Pending status with status-pattern-pending class", () => {
    renderCard({ status: "pending" });
    const badge = screen.getByRole("status");
    expect(badge).toHaveClass("status-pattern-pending");
  });

  it("renders Resolved status with status-pattern-resolved class", () => {
    renderCard({ status: "resolved" });
    const badge = screen.getByRole("status");
    expect(badge).toHaveClass("status-pattern-resolved");
  });
});

// ---------------------------------------------------------------------------
// Mobile responsive layout tests
// ---------------------------------------------------------------------------
// Jest/jsdom does not apply CSS breakpoints, so we verify that the
// Tailwind responsive classes driving the mobile-first stacked layout are
// present on the correct elements.  The existence of these classes is the
// source-of-truth for the responsive behaviour that will be active in real
// browsers.

describe("MarketCard mobile responsive layout", () => {
  it("header row has flex-col for mobile stacking and sm:flex-row for desktop", () => {
    const { container } = renderCard({ category: "Sports" });
    // The header row wraps category + badge
    const headerRow = container.querySelector(".flex-col.sm\\:flex-row");
    expect(headerRow).toBeInTheDocument();
  });

  it("header row restores justify-between on sm and above", () => {
    const { container } = renderCard({ category: "Sports" });
    const headerRow = container.querySelector(
      ".sm\\:justify-between",
    );
    expect(headerRow).toBeInTheDocument();
  });

  it("status badge has self-start so it aligns to the left on mobile", () => {
    const { container } = renderCard({ status: "active" });
    const badge = container.querySelector(".self-start");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("role", "status");
  });

  it("category label has min-w-0 and truncate to handle overflow", () => {
    const { container } = renderCard({
      category: "A Very Long Category Name That Might Overflow",
    });
    const categoryEl = container.querySelector(".min-w-0.truncate");
    expect(categoryEl).toBeInTheDocument();
  });

  it("meta row (volume + end date) has flex-wrap for narrow viewports", () => {
    const { container } = renderCard({ volume: "100K", endDate: "2024-12-31" });
    // The meta row must have flex-wrap
    const metaRow = container.querySelector(".flex-wrap");
    expect(metaRow).toBeInTheDocument();
  });

  it("meta row has gap utilities for spacing in both orientations", () => {
    const { container } = renderCard({ volume: "100K", endDate: "2024-12-31" });
    const metaRow = container.querySelector(".gap-x-4");
    expect(metaRow).toBeInTheDocument();
  });

  it("renders status badge and category simultaneously on all widths", () => {
    renderCard({ category: "Finance", status: "pending" });
    expect(screen.getByText("Finance")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders without category — badge is still present", () => {
    renderCard({ status: "resolved" });
    expect(screen.getByRole("status")).toBeInTheDocument();
    // No category span should exist when not provided
    expect(screen.queryByTitle("")).toBeNull();
  });

  it("renders volume and end date in the meta row", () => {
    renderCard({ volume: "50K USDC", endDate: "2025-06-01" });
    expect(screen.getByText("Volume: 50K USDC")).toBeInTheDocument();
    expect(screen.getByText("Ends: 2025-06-01")).toBeInTheDocument();
  });

  it("handles very long category without breaking layout classes", () => {
    const { container } = renderCard({
      category: "A".repeat(80),
      status: "active",
    });
    const categoryEl = container.querySelector(".truncate");
    expect(categoryEl).toBeInTheDocument();
    // title attribute allows tooltip to show the full value on hover
    expect(categoryEl).toHaveAttribute("title", "A".repeat(80));
  });
});
