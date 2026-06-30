/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QuickDeposit } from "./QuickDeposit";

describe("QuickDeposit", () => {
  it("renders the card with a labelled amount input and presets", () => {
    render(<QuickDeposit onDeposit={jest.fn()} />);
    expect(screen.getByRole("heading", { name: /quick deposit/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/amount \(xlm\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /10 xlm/i })).toBeInTheDocument();
  });

  it("fills the input when a preset chip is clicked", () => {
    render(<QuickDeposit onDeposit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /50 xlm/i }));
    expect(screen.getByLabelText(/amount \(xlm\)/i)).toHaveValue("50");
  });

  it("shows a validation error for an empty amount", () => {
    render(<QuickDeposit onDeposit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^deposit xlm$/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/enter an amount/i);
  });

  it("shows a validation error for non-numeric input", () => {
    render(<QuickDeposit onDeposit={jest.fn()} />);
    fireEvent.change(screen.getByLabelText(/amount \(xlm\)/i), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: /^deposit xlm$/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/positive number/i);
  });

  it("rejects more than 7 decimal places", () => {
    render(<QuickDeposit onDeposit={jest.fn()} />);
    fireEvent.change(screen.getByLabelText(/amount \(xlm\)/i), {
      target: { value: "1.123456789" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^deposit xlm$/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("calls onDeposit with the trimmed amount on valid submit", async () => {
    const onDeposit = jest.fn().mockResolvedValue(undefined);
    render(<QuickDeposit onDeposit={onDeposit} />);
    fireEvent.change(screen.getByLabelText(/amount \(xlm\)/i), { target: { value: " 25.5 " } });
    fireEvent.click(screen.getByRole("button", { name: /^deposit xlm$/i }));
    await waitFor(() => expect(onDeposit).toHaveBeenCalledWith("25.5"));
  });

  it("surfaces an error when the deposit rejects", async () => {
    const onDeposit = jest.fn().mockRejectedValue(new Error("boom"));
    render(<QuickDeposit onDeposit={onDeposit} />);
    fireEvent.change(screen.getByLabelText(/amount \(xlm\)/i), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /^deposit xlm$/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/deposit failed/i));
  });
});
