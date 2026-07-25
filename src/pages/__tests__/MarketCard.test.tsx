import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import MarketCard from "../MarketCard";

// ── Color-blind accessibility (pre-existing) ─────────────────────────────────

describe("MarketCard Color-Blind Accessibility", () => {
  it("renders Active status with status-pattern-active class", () => {
    render(<MarketCard id="1" title="Test Market" status="active" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveClass("status-pattern-active");
    expect(badge).toHaveAttribute("aria-label", "Market status: active");
  });

  it("renders Closed status with status-pattern-closed class", () => {
    render(<MarketCard id="2" title="Test Market" status="closed" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveClass("status-pattern-closed");
    expect(badge).toHaveAttribute("aria-label", "Market status: closed");
  });

  it("renders Pending status with status-pattern-pending class", () => {
    render(<MarketCard id="3" title="Test Market" status="pending" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveClass("status-pattern-pending");
  });

  it("renders Resolved status with status-pattern-resolved class", () => {
    render(<MarketCard id="4" title="Test Market" status="resolved" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveClass("status-pattern-resolved");
  });
});

// ── Focus-visible / keyboard accessibility (Issue #498) ──────────────────────

describe("MarketCard focus-visible and keyboard accessibility", () => {
  it("has tabIndex=0 so it is reachable by keyboard", () => {
    render(<MarketCard id="5" title="Focusable Market" status="active" />);
    const card = screen.getByRole("button");
    expect(card).toHaveAttribute("tabindex", "0");
  });

  it("has role=button so assistive technology announces it as interactive", () => {
    render(<MarketCard id="6" title="AT Market" status="active" />);
    const card = screen.getByRole("button");
    expect(card).toBeInTheDocument();
  });

  it("has an aria-label that includes the title and status", () => {
    render(<MarketCard id="7" title="AI Governance" status="pending" />);
    const card = screen.getByRole("button");
    expect(card).toHaveAttribute(
      "aria-label",
      "AI Governance – market status: pending",
    );
  });

  it("carries the market-card class required for :focus-visible CSS rules", () => {
    render(<MarketCard id="8" title="CSS Market" status="active" />);
    const card = screen.getByRole("button");
    expect(card).toHaveClass("market-card");
  });

  it("calls onClick when Enter is pressed", () => {
    const handleClick = jest.fn();
    render(
      <MarketCard
        id="9"
        title="Enter Market"
        status="active"
        onClick={handleClick}
      />,
    );
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Enter", code: "Enter" });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick when Space is pressed", () => {
    const handleClick = jest.fn();
    render(
      <MarketCard
        id="10"
        title="Space Market"
        status="active"
        onClick={handleClick}
      />,
    );
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: " ", code: "Space" });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when an unrelated key is pressed", () => {
    const handleClick = jest.fn();
    render(
      <MarketCard
        id="11"
        title="Tab Market"
        status="active"
        onClick={handleClick}
      />,
    );
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Tab", code: "Tab" });
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("calls onClick on mouse click", () => {
    const handleClick = jest.fn();
    render(
      <MarketCard
        id="12"
        title="Click Market"
        status="active"
        onClick={handleClick}
      />,
    );
    const card = screen.getByRole("button");
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders without throwing even when onClick is not provided", () => {
    expect(() =>
      render(<MarketCard id="13" title="No Click Market" status="resolved" />),
    ).not.toThrow();
  });

  it("renders optional category and volume when provided", () => {
    render(
      <MarketCard
        id="14"
        title="Full Market"
        status="active"
        category="Crypto"
        volume="50,000 USDC"
        endDate="2025-12-31"
      />,
    );
    expect(screen.getByText("Crypto")).toBeInTheDocument();
    expect(screen.getByText("Volume: 50,000 USDC")).toBeInTheDocument();
    expect(screen.getByText("Ends: 2025-12-31")).toBeInTheDocument();
  });
});
