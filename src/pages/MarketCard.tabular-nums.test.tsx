import React from "react";
import { render, screen } from "@testing-library/react";
import { MarketCard } from "./MarketCard";

describe("MarketCard numeric display alignment", () => {
  it("applies tabular-nums to the volume display", () => {
    render(
      <MarketCard title="Test Market" status="active" volume="1.2M" endDate="2026-10-01" />,
    );
    expect(screen.getByText("Volume: 1.2M")).toHaveClass("tabular-nums");
  });

  it("applies tabular-nums to the end-date display", () => {
    render(
      <MarketCard title="Test Market" status="active" volume="1.2M" endDate="2026-10-01" />,
    );
    expect(screen.getByText("Ends: 2026-10-01")).toHaveClass("tabular-nums");
  });
});
