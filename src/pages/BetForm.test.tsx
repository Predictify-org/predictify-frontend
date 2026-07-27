import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BetForm from "../BetForm";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

describe("BetForm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders correctly", () => {
    render(<BetForm />);
    expect(screen.getByRole("heading", { name: /Place Your Bet/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Bet Amount/i)).toBeInTheDocument();
  });

  it("announces errors for invalid amounts", async () => {
    render(<BetForm />);
    const button = screen.getByRole("button", { name: /Place Bet/i });
    
    // click with empty amount
    fireEvent.click(button);
    
    // the live region should announce the error
    expect(screen.getByText(/Invalid bet amount/i)).toBeInTheDocument();
  });

  it("announces submission and success states", async () => {
    const user = userEvent.setup({ delay: null });
    render(<BetForm />);
    
    const input = screen.getByLabelText(/Bet Amount/i);
    const button = screen.getByRole("button", { name: /Place Bet/i });
    
    await user.type(input, "10");
    fireEvent.click(button);
    
    expect(screen.getByText(/Placing your bet/i)).toBeInTheDocument();
    
    // advance timers to simulate API call completion
    vi.advanceTimersByTime(1500);
    
    await waitFor(() => {
      expect(screen.getByText(/Bet placed successfully!/i)).toBeInTheDocument();
    });
  });

  it("renders the empty state when campaign is not active", () => {
    render(<BetForm campaignActive={false} />);
    expect(screen.getByText(/No Stellar Wave data yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Place Your Bet/i })).not.toBeInTheDocument();
  });
});

