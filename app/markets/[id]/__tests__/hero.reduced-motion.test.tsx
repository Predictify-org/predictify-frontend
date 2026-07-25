import React from "react";
import { render, screen } from "@testing-library/react";
import { MarketHero } from "../hero";

describe("MarketHero - Reduced Motion", () => {
  it("includes motion-reduce:transition-none class on the probability bar", () => {
    render(
      <MarketHero
        title="Test"
        status="open"
        outcomes={[
          { label: "Yes", probability: 60 },
          { label: "No", probability: 40 },
        ]}
      />
    );

    // The inner div with the style width: 60%
    const bar = document.querySelector(".bg-outcome-yes");
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveClass("motion-reduce:transition-none");
  });
});
