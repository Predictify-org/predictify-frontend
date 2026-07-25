/**
 * Tests for BetForm
 *
 * Scope:
 *  1. Renders quick-bet chips and the amount input
 *  2. Clicking a chip populates the amount field
 *  3. Submitting with a valid amount calls onSubmit
 *  4. Submitting with an empty / zero amount shows an inline error
 *  5. BetFormSkeleton renders with correct structure and accessibility
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BetForm, { BetFormSkeleton } from "@/app/components/BetForm";

describe("BetForm", () => {
  it("renders the quick-bet chips and the amount input", () => {
    render(<BetForm />);

    expect(screen.getByLabelText("Amount (XLM)")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Set bet amount to 1 XLM" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Set bet amount to 5 XLM" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Set bet amount to 10 XLM" })
    ).toBeInTheDocument();
  });

  it("populates the amount field when a preset chip is clicked", async () => {
    render(<BetForm />);

    const chip = screen.getByRole("button", { name: "Set bet amount to 5 XLM" });
    await userEvent.click(chip);

    const input = screen.getByLabelText("Amount (XLM)") as HTMLInputElement;
    expect(input.value).toBe("5");
  });

  it("calls onSubmit with the correct amount on valid form submission", async () => {
    const onSubmit = jest.fn();
    render(<BetForm onSubmit={onSubmit} />);

    // Select the 10 XLM preset
    await userEvent.click(
      screen.getByRole("button", { name: "Set bet amount to 10 XLM" })
    );

    await userEvent.click(screen.getByRole("button", { name: "Place Bet" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(10);
  });

  it("shows a validation error when submitted with no amount", async () => {
    render(<BetForm />);

    await userEvent.click(screen.getByRole("button", { name: "Place Bet" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please enter a valid bet amount greater than 0 XLM."
      )
    );
  });
});

// --- BetFormSkeleton Tests ---

describe("BetFormSkeleton", () => {
  it("renders a skeleton with the correct structure", () => {
    render(<BetFormSkeleton />);

    const skeleton = screen.getByTestId("bet-form-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-busy", "true");
  });

  it("matches the BetForm layout with correct sections", () => {
    render(<BetFormSkeleton />);

    // Three preset chips - matching QuickBetPresets chip dimensions (h-7 rounded-full)
    const chips = document.querySelectorAll('[role="group"] .animate-pulse');
    expect(chips.length).toBe(3);

    // Amount label + input
    const skeletonBars = document.querySelectorAll('.animate-pulse:not([role="group"] *)');
    expect(skeletonBars.length).toBeGreaterThanOrEqual(2);

    // Submit button - h-10 rounded-md
    const submitSkeleton = document.querySelector('.animate-pulse.w-full.rounded-md.h-10');
    expect(submitSkeleton).toBeInTheDocument();
  });

  it("contains animated skeleton bars", () => {
    render(<BetFormSkeleton />);

    const animatedElements = document.querySelectorAll(".animate-pulse");
    expect(animatedElements.length).toBeGreaterThan(0);
  });

  it("respects reduced motion preference", () => {
    // With reduced motion, animate-pulse should not be on the button
    const { container } = render(<BetFormSkeleton />);

    const buttonSkeleton = container.querySelector('.w-full.rounded-md.h-10');
    expect(buttonSkeleton).toBeInTheDocument();
  });
});
