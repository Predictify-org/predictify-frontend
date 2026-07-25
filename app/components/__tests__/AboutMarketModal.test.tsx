import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AboutMarketModal } from "../AboutMarketModal";

// Mock matchMedia (Radix UI components depend on this in testing environments)
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

const mockFWC26Market = {
  id: "world-cup-market",
  title: "Will Argentina win the 2026 FIFA World Cup?",
  description: "Predict whether Argentina will successfully defend their title.",
  status: "open",
  category: "Football",
  isGrantFoxCampaign: true,
  timeLeft: "18 days",
};

const mockGenericMarket = {
  id: "generic-market",
  title: "Will the price of Stellar exceed $1.00 in 2026?",
  description: "Predict if XLM exceeds 1 dollar.",
  status: "open",
  category: "Crypto",
  isGrantFoxCampaign: false,
  timeLeft: "30 days",
};

describe("AboutMarketModal", () => {
  it("renders the trigger button correctly", () => {
    render(<AboutMarketModal market={mockFWC26Market} />);
    
    const triggerBtn = screen.getByRole("button", { name: /about this market/i });
    expect(triggerBtn).toBeInTheDocument();
    expect(triggerBtn).toHaveTextContent("About Market");
  });

  it("opens the modal Dialog and displays FWC26 campaign resolution details", async () => {
    const user = userEvent.setup();
    render(<AboutMarketModal market={mockFWC26Market} />);
    
    const triggerBtn = screen.getByRole("button", { name: /about this market/i });
    await user.click(triggerBtn);
    
    // Check Dialog content
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /about this market/i })).toBeInTheDocument();
    
    // Check specific World Cup resolution rules
    expect(screen.getByText("FIFA Official Reports")).toBeInTheDocument();
    expect(screen.getByText(/Argentina wins the final match and is officially crowned World Cup Champion/i)).toBeInTheDocument();
    expect(screen.getByText(/Argentina is eliminated at any stage, fails to qualify, or the tournament is cancelled/i)).toBeInTheDocument();
  });

  it("opens the modal Dialog and displays generic resolution details", async () => {
    const user = userEvent.setup();
    render(<AboutMarketModal market={mockGenericMarket} />);
    
    const triggerBtn = screen.getByRole("button", { name: /about this market/i });
    await user.click(triggerBtn);
    
    // Check generic details
    expect(screen.getByText("Official Public Sources")).toBeInTheDocument();
    expect(screen.getByText(/The specified event occurs as described before the resolution deadline/i)).toBeInTheDocument();
    expect(screen.getByText(/The specified event does not occur before the resolution deadline/i)).toBeInTheDocument();
  });

  it("has accessible screen-reader markup and descriptions", async () => {
    const user = userEvent.setup();
    render(<AboutMarketModal market={mockFWC26Market} />);
    
    const triggerBtn = screen.getByRole("button", { name: /about this market/i });
    await user.click(triggerBtn);
    
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-describedby", "about-market-description");
    
    // Ensure screen-reader description matches expected accessibility tags
    const srMarkup = screen.getByText(/This market question is: Will Argentina win the 2026 FIFA World Cup\?/i);
    expect(srMarkup).toBeInTheDocument();
    expect(srMarkup).toHaveClass("sr-only");
  });

  it("closes the modal when clicking the Close button and returns focus to trigger", async () => {
    const user = userEvent.setup();
    render(<AboutMarketModal market={mockFWC26Market} />);
    
    const triggerBtn = screen.getByRole("button", { name: /about this market/i });
    
    // Click trigger and ensure focus shifts
    await user.click(triggerBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    
    const closeBtn = screen.getByRole("button", { name: /close/i });
    expect(closeBtn).toBeInTheDocument();
    
    await user.click(closeBtn);
    
    // Check that modal closes
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    
    // Focus should be returned to triggerBtn
    expect(triggerBtn).toHaveFocus();
  });
});
