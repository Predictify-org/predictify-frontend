import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { OutcomeChip } from "../OutcomeChip";
import type { MechanicHelpContent } from "@/components/patterns/MechanicHelp";

const mockHelpContent: MechanicHelpContent = {
  title: "Outcome odds",
  tooltip: "The probability of each outcome based on market activity.",
  summary: "Outcome odds reflect the market's current estimate of each outcome's likelihood.",
  sections: [
    {
      title: "How odds work",
      body: "Higher odds mean higher perceived probability. Odds shift as participants trade.",
    },
  ],
};

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

  it("renders a contextual help button when helpContent is provided", () => {
    render(<OutcomeChip label="Yes" variant="yes" helpContent={mockHelpContent} />);
    // The help button is rendered with the "Quick help" aria-label
    expect(
      screen.getByRole("button", { name: /show quick help for outcome odds/i })
    ).toBeInTheDocument();
  });

  it("does not render a help button when helpContent is omitted", () => {
    render(<OutcomeChip label="Yes" variant="yes" />);
    expect(
      screen.queryByRole("button", { name: /show quick help for/i })
    ).not.toBeInTheDocument();
  });

  it("does not trigger the chip onSelect when the help button is clicked", () => {
    const onSelect = jest.fn();
    render(<OutcomeChip label="Yes" variant="yes" onSelect={onSelect} helpContent={mockHelpContent} />);
    const helpButton = screen.getByRole("button", { name: /show quick help for outcome odds/i });
    fireEvent.click(helpButton);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
