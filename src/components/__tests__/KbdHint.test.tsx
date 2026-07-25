import React from "react";
import { render, screen } from "@testing-library/react";
import KbdHint from "../KbdHint";

describe("KbdHint", () => {
  it("renders correctly with children", () => {
    render(<KbdHint>Enter</KbdHint>);
    const kbdElement = screen.getByText("Enter");
    expect(kbdElement).toBeInTheDocument();
    expect(kbdElement.tagName).toBe("KBD");
  });

  it("applies custom class names", () => {
    render(<KbdHint className="custom-class">Cmd</KbdHint>);
    const kbdElement = screen.getByText("Cmd");
    expect(kbdElement).toHaveClass("custom-class");
  });
});
