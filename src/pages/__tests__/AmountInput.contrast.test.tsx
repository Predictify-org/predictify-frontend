import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AmountInput, AmountStatus } from "../AmountInput";

describe("AmountInput high-contrast mode", () => {
  it("applies the amount-input wrapper class for high-contrast styling", () => {
    const { container } = render(<AmountInput />);
    expect(container.querySelector(".amount-input")).not.toBeNull();
  });

  it("imports the contrast stylesheet so prefers-contrast overrides are applied", () => {
    const source = require("fs").readFileSync(
      "src/pages/AmountInput.tsx",
      "utf-8"
    );
    expect(source).toContain("../styles/contrast.css");
  });

  it.each(["success", "warning", "error"] as AmountStatus[])(
    "renders a status badge with visible border tokens for status %s",
    (status) => {
      render(<AmountInput status={status} />);
      const badge = screen.getByText(
        status.charAt(0).toUpperCase() + status.slice(1)
      );
      expect(badge).toBeInTheDocument();
      expect(badge.closest(".rounded-sm")).toBeInTheDocument();
    }
  );

  it("renders the input field with a focusable native element", () => {
    render(<AmountInput />);
    const input = screen.getByLabelText("Amount");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });
});