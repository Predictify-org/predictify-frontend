/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MiniBurnDown } from "./MiniBurnDown";

describe("MiniBurnDown", () => {
  it("renders an accessible image with the remaining percentage", () => {
    render(<MiniBurnDown totalAmount={100} accruedAmount={25} />);
    expect(screen.getByRole("img", { name: /75% of stream remaining/i })).toBeInTheDocument();
  });

  it("reports 100% remaining when nothing has accrued", () => {
    render(<MiniBurnDown totalAmount={100} accruedAmount={0} />);
    expect(screen.getByRole("img", { name: /100% of stream remaining/i })).toBeInTheDocument();
  });

  it("reports 0% remaining when fully accrued", () => {
    render(<MiniBurnDown totalAmount={100} accruedAmount={100} />);
    expect(screen.getByRole("img", { name: /0% of stream remaining/i })).toBeInTheDocument();
  });

  it("clamps over-accrual to 0% remaining", () => {
    render(<MiniBurnDown totalAmount={100} accruedAmount={150} />);
    expect(screen.getByRole("img", { name: /0% of stream remaining/i })).toBeInTheDocument();
  });

  it("handles a zero total without dividing by zero", () => {
    render(<MiniBurnDown totalAmount={0} accruedAmount={0} />);
    // Falls back to 100% remaining rather than NaN.
    expect(screen.getByRole("img", { name: /100% of stream remaining/i })).toBeInTheDocument();
  });

  it("renders an SVG sized to the requested dimensions", () => {
    const { container } = render(
      <MiniBurnDown totalAmount={100} accruedAmount={50} width={80} height={24} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "80");
    expect(svg).toHaveAttribute("height", "24");
  });
});
