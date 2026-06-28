/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MultiRecipientStreamPage from "./multi";
import "@testing-library/jest-dom";

// Mock crypto.randomUUID
beforeAll(() => {
  Object.defineProperty(window, "crypto", {
    value: {
      randomUUID: () => Math.random().toString(36).substring(2, 9),
    },
  });
});

describe("MultiRecipientStreamPage", () => {
  it("renders the stream creation form", () => {
    render(<MultiRecipientStreamPage />);
    
    expect(screen.getByText("Create Multi-Recipient Stream")).toBeInTheDocument();
    expect(screen.getByText("Stream Name")).toBeInTheDocument();
    expect(screen.getByText("Total Amount")).toBeInTheDocument();
    expect(screen.getByText("Recipients")).toBeInTheDocument();
  });

  it("adds a new recipient when clicking 'Add Recipient'", () => {
    render(<MultiRecipientStreamPage />);
    
    const initialInputs = screen.getAllByPlaceholderText("GABC... or email@example.com");
    expect(initialInputs).toHaveLength(1);

    const addButton = screen.getByText("+ Add Recipient");
    fireEvent.click(addButton);

    const updatedInputs = screen.getAllByPlaceholderText("GABC... or email@example.com");
    expect(updatedInputs).toHaveLength(2);
  });

  it("calculates equal split by default when adding recipients", () => {
    render(<MultiRecipientStreamPage />);
    
    const addButton = screen.getByText("+ Add Recipient");
    fireEvent.click(addButton);

    // Initial total amount is 1000. So 2 recipients = 500 each, 50% each.
    const shareInputs = screen.getAllByDisplayValue("50");
    expect(shareInputs).toHaveLength(2);
    
    const amountDisplays = screen.getAllByText("500");
    expect(amountDisplays).toHaveLength(2);
  });

  it("allows custom split when preset is changed", () => {
    render(<MultiRecipientStreamPage />);
    
    const addButton = screen.getByText("+ Add Recipient");
    fireEvent.click(addButton); // Now we have 2 recipients

    // Change to custom preset
    const select = screen.getAllByRole("combobox")[1];
    fireEvent.change(select, { target: { value: "custom" } });

    // Change first recipient's percentage to 70
    // Skip the first spinbutton which is the totalAmount input
    const shareInputs = screen.getAllByRole("spinbutton");
    fireEvent.change(shareInputs[1], { target: { value: "70" } });

    // Amount should update to 700 (70% of 1000)
    expect(screen.getByText("700")).toBeInTheDocument();
    
    // The other is still at 50 from before the switch
    expect(screen.getByText("500")).toBeInTheDocument();
    
    // Total should show error state as it's > 100%
    expect(screen.getByText("Total Allocated: 120.00%")).toBeInTheDocument();
  });
});
