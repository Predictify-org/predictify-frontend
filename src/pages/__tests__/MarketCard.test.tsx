import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import MarketCard from "../MarketCard";

// ── Color-blind accessibility (pre-existing) ─────────────────────────────────

describe("MarketCard Color-Blind Accessibility", () => {
  it("renders Active status with status-pattern-active class", () => {
    render(<MarketCard id="1" title="Test Market" status="active" />);
    const badge = screen.getByLabelText("Market status: active");
    expect(badge).toHaveClass("status-pattern-active");
    expect(badge).toHaveAttribute("aria-label", "Market status: active");
  });

  it("renders Closed status with status-pattern-closed class", () => {
    render(<MarketCard id="2" title="Test Market" status="closed" />);
    const badge = screen.getByLabelText("Market status: closed");
    expect(badge).toHaveClass("status-pattern-closed");
    expect(badge).toHaveAttribute("aria-label", "Market status: closed");
  });

  it("renders Pending status with status-pattern-pending class", () => {
    render(<MarketCard id="3" title="Test Market" status="pending" />);
    const badge = screen.getByLabelText("Market status: pending");
    expect(badge).toHaveClass("status-pattern-pending");
  });

  it("renders Resolved status with status-pattern-resolved class", () => {
    render(<MarketCard id="4" title="Test Market" status="resolved" />);
    const badge = screen.getByLabelText("Market status: resolved");
    expect(badge).toHaveClass("status-pattern-resolved");
  });

  it("includes reduced-motion fallback classes", () => {
    render(<MarketCard id="5" title="Test Market" status="active" />);
    const article = screen.getByRole("article", { hidden: true });
    // Assuming the article element has an implicit role of article, but standard elements might need to be selected differently if role="article" is not set by default or not queryable.
    // However, <article> has role="article" in HTML5
    expect(article).toHaveClass("motion-reduce:transition-none");
    expect(article).toHaveClass("motion-reduce:transform-none");
  });
});
