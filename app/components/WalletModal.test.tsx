/**
 * @jest-environment jsdom
 */
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
    
    defaultProviders.forEach(provider => {
      expect(screen.getByText(provider.name)).toBeInTheDocument();
    });
  });

  it("orders providers based on MRU", () => {
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

  it("renders compat badges for providers", () => {
    render(<WalletModal isOpen={true} onClose={() => {}} onSelect={() => {}} />);

    expect(screen.getAllByText("Extension").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Web")).toBeInTheDocument();
    expect(screen.getAllByText("Mainnet").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Testnet").length).toBeGreaterThanOrEqual(1);
  });

  it("renders docs links with correct attributes", () => {
    render(<WalletModal isOpen={true} onClose={() => {}} onSelect={() => {}} />);

    const docsLinks = screen.getAllByText(/Docs/);
    expect(docsLinks.length).toBe(defaultProviders.length);

    docsLinks.forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    const freighterDocs = screen.getByLabelText("Freighter docs");
    expect(freighterDocs).toHaveAttribute("href", "https://freighter.app/");
  });

  it("does not select provider when docs link is clicked", () => {
    const handleSelect = jest.fn();
    const handleClose = jest.fn();

    render(<WalletModal isOpen={true} onClose={handleClose} onSelect={handleSelect} />);

    const freighterDocs = screen.getByLabelText("Freighter docs");
    fireEvent.click(freighterDocs);

    expect(handleSelect).not.toHaveBeenCalled();
    expect(handleClose).not.toHaveBeenCalled();
  });

  it("includes compat info in button aria-label", () => {
    render(<WalletModal isOpen={true} onClose={() => {}} onSelect={() => {}} />);

    expect(screen.getByLabelText("Freighter — Extension, Mainnet, Testnet")).toBeInTheDocument();
    expect(screen.getByLabelText("xBull — Extension, Mainnet, Testnet")).toBeInTheDocument();
    expect(screen.getByLabelText("Albedo — Web, Mainnet, Testnet")).toBeInTheDocument();
    expect(screen.getByLabelText("Rabet — Extension, Mainnet, Testnet")).toBeInTheDocument();
  });

  it("renders provider without compat information gracefully", () => {
    const handleSelect = jest.fn();

    render(
      <WalletModal
        isOpen={true}
        onClose={() => {}}
        onSelect={handleSelect}
      />
    );

    const buttons = screen.getAllByRole("button").filter(btn => btn.className === "wallet-provider-btn");
    expect(buttons.length).toBe(defaultProviders.length);

    buttons.forEach(btn => {
      expect(btn).toHaveAttribute("aria-label");
    });
  });
});
