import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { WalletModal } from "./WalletModal";
import { defaultProviders, setMRUWalletId } from "../state/walletPrefs";
import "@testing-library/jest-dom";

describe("WalletModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the modal when isOpen is true", () => {
    render(<WalletModal isOpen={true} onClose={() => {}} onSelect={() => {}} />);
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
    
    // Check if default providers are listed
    defaultProviders.forEach(provider => {
      expect(screen.getByText(provider.name)).toBeInTheDocument();
    });
  });

  it("orders providers based on MRU", () => {
    // Set Albedo as most recently used
    setMRUWalletId("albedo");

    render(<WalletModal isOpen={true} onClose={() => {}} onSelect={() => {}} />);
    
    const buttons = screen.getAllByRole("button").filter(btn => btn.className === "wallet-provider-btn");
    expect(buttons[0]).toHaveTextContent("Albedo");
  });

  it("calls onSelect and onClose when a provider is clicked, and updates MRU", () => {
    const handleSelect = jest.fn();
    const handleClose = jest.fn();

    render(<WalletModal isOpen={true} onClose={handleClose} onSelect={handleSelect} />);
    
    const xBullButton = screen.getByText("xBull");
    fireEvent.click(xBullButton);

    expect(handleSelect).toHaveBeenCalledWith("xbull");
    expect(handleClose).toHaveBeenCalled();
    expect(localStorage.getItem("streampay_mru_wallet")).toBe("xbull");
  });
});
