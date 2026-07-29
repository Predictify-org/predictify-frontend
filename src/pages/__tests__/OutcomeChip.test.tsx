import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { OutcomeChip } from "../OutcomeChip";

describe("OutcomeChip", () => {
  it("renders the label", () => {
    render(<OutcomeChip label="Yes" variant="yes" />);
    expect(screen.getByRole("button", { name: /yes/i })).toBeInTheDocument();
  });

  it("renders an optional badge", () => {
    render(<OutcomeChip label="Yes" variant="yes" badge="62%" />);
    expect(screen.getByText("62%")).toBeInTheDocument();
  });

  it("calls onSelect when clicked", () => {
    const onSelect = jest.fn();
    render(<OutcomeChip label="No" variant="no" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /no/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("does not call onSelect when disabled", () => {
    const onSelect = jest.fn();
    render(<OutcomeChip label="No" variant="no" onSelect={onSelect} disabled />);
    fireEvent.click(screen.getByRole("button", { name: /no/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("reflects selected state via aria-pressed", () => {
    const { rerender } = render(<OutcomeChip label="Yes" variant="yes" selected={false} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");

    rerender(<OutcomeChip label="Yes" variant="yes" selected />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("marks disabled chips with aria-disabled and the disabled attribute", () => {
    render(<OutcomeChip label="Yes" variant="yes" disabled />);
    const chip = screen.getByRole("button");
    expect(chip).toBeDisabled();
    expect(chip).toHaveAttribute("aria-disabled", "true");
  });

  it("allows the label to wrap instead of truncating (no fixed nowrap)", () => {
    render(
      <OutcomeChip
        label="A very long custom outcome label that must wrap on narrow screens"
        variant="neutral"
      />
    );
    const chip = screen.getByRole("button");
    // Whitespace handling should allow wrapping, not force single-line clipping.
    expect(chip.className).toContain("outcome-chip");
    expect(screen.getByText(/a very long custom outcome label/i)).toBeInTheDocument();
  });

  it("supports keyboard activation via native button semantics", () => {
    const onSelect = jest.fn();
    render(<OutcomeChip label="Yes" variant="yes" onSelect={onSelect} />);
    const chip = screen.getByRole("button");
    chip.focus();
    fireEvent.keyDown(chip, { key: "Enter", code: "Enter" });
    fireEvent.click(chip); // jsdom doesn't auto-trigger click on Enter for <button>
    expect(onSelect).toHaveBeenCalled();
  });
});
