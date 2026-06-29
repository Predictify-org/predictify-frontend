/**
 * Tests for BetForm
 *
 * Scope:
 *  1. Renders quick-bet chips and the amount input
 *  2. Clicking a chip populates the amount field
 *  3. Submitting with a valid amount calls onSubmit
 *  4. Submitting with an empty / zero amount shows an inline error
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BetForm from "@/app/components/BetForm";

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
