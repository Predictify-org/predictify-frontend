/**
 * Tests for QuickBetPresets
 *
 * Scope:
 *  1. Renders all preset chips (1, 5, 10 XLM)
 *  2. Calls onSelect with the correct value on click
 *  3. Marks the active chip with aria-pressed="true"
 *  4. Disables all chips when the disabled prop is set
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import QuickBetPresets, { QUICK_BET_PRESETS } from "@/components/QuickBetPresets";

describe("QuickBetPresets", () => {
  it("renders a chip for each preset amount", () => {
    render(<QuickBetPresets selectedAmount={null} onSelect={jest.fn()} />);

    for (const amount of QUICK_BET_PRESETS) {
      expect(
        screen.getByRole("button", { name: `Set bet amount to ${amount} XLM` })
      ).toBeInTheDocument();
    }
  });

  it("calls onSelect with the clicked preset value", () => {
    const onSelect = jest.fn();
    render(<QuickBetPresets selectedAmount={null} onSelect={onSelect} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Set bet amount to 5 XLM" })
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(5);
  });

  it("marks the selected chip with aria-pressed=true and others with aria-pressed=false", () => {
    render(<QuickBetPresets selectedAmount={10} onSelect={jest.fn()} />);

    const activeChip = screen.getByRole("button", {
      name: "Set bet amount to 10 XLM",
    });
    expect(activeChip).toHaveAttribute("aria-pressed", "true");

    const inactiveChip = screen.getByRole("button", {
      name: "Set bet amount to 1 XLM",
    });
    expect(inactiveChip).toHaveAttribute("aria-pressed", "false");
  });

  it("disables all chips when the disabled prop is true", () => {
    render(
      <QuickBetPresets selectedAmount={null} onSelect={jest.fn()} disabled />
    );

    for (const amount of QUICK_BET_PRESETS) {
      expect(
        screen.getByRole("button", { name: `Set bet amount to ${amount} XLM` })
      ).toBeDisabled();
    }
  });
});
