import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import BetForm from "../BetForm";

describe("BetForm sticky action bar", () => {
  it("renders the sticky action bar with the Place Bet button", () => {
    render(<BetForm />);
    const bar = screen.getByTestId("betform-action-bar");
    expect(bar).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /place bet/i })).toBeInTheDocument();
  });

  it("keeps the action bar sticky to the bottom of the scrollable content", () => {
    render(<BetForm />);
    const bar = screen.getByTestId("betform-action-bar");
    expect(bar).toHaveClass("sticky");
    expect(bar).toHaveClass("bottom-0");
  });

  it("grows a divider/shadow once the scrollable body has been scrolled", () => {
    render(<BetForm />);
    const bar = screen.getByTestId("betform-action-bar");
    const body = bar.previousElementSibling as HTMLElement;

    // Initially no border/shadow
    expect(bar).not.toHaveClass("border-t");

    // Simulate scroll
    Object.defineProperty(body, "scrollTop", { value: 40, configurable: true });
    fireEvent.scroll(body);

    // Now border-t appears
    expect(bar).toHaveClass("border-t");
  });

  it("does not show the border when the body has not been scrolled", () => {
    render(<BetForm />);
    const bar = screen.getByTestId("betform-action-bar");
    const body = bar.previousElementSibling as HTMLElement;

    Object.defineProperty(body, "scrollTop", { value: 0, configurable: true });
    fireEvent.scroll(body);

    expect(bar).not.toHaveClass("border-t");
  });

  it("calls onSubmit when the Place Bet button is clicked", () => {
    const onSubmit = jest.fn();
    render(<BetForm onSubmit={onSubmit} />);

    // Set a valid amount first
    const input = screen.getByPlaceholderText("Enter amount");
    fireEvent.change(input, { target: { value: "10" } });

    // Click the submit button
    fireEvent.click(screen.getByRole("button", { name: /place bet/i }));
    expect(onSubmit).toHaveBeenCalledWith(10);
  });
});