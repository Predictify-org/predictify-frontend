import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import MarketCard from "../MarketCard";

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

describe("MarketCard Tabular Nums", () => {
  it("applies tabular-nums to the volume display", () => {
    render(<MarketCard id="1" title="Test Market" status="active" volume="$1,234.56" />);
    const volumeSpan = screen.getByText("Volume: $1,234.56");
    expect(volumeSpan).toHaveClass("tabular-nums");
  });

  it("does not render volume element when volume is not provided", () => {
    render(<MarketCard id="1" title="Test Market" status="active" />);
    expect(screen.queryByText(/Volume:/)).not.toBeInTheDocument();
  });
});
