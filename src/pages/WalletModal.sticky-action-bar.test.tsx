import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import WalletModal from "./WalletModal";
import { useWallet } from "@/hooks/useWallet.hook";

// The real useWallet.hook + wallet-kits.constant modules pull in
// @creit.tech/stellar-wallets-kit, a pure-ESM package Jest can't parse
// without a transformIgnorePatterns change to the repo's jest config.
// Mocking both here keeps this test scoped to WalletModal's own markup.
jest.mock("@/hooks/useWallet.hook", () => ({
  useWallet: jest.fn(),
}));

jest.mock("@/constants/wallet-kits.constant", () => ({
  getKit: () => ({
    getSupportedWallets: () => Promise.resolve([]),
  }),
}));

jest.mock("@/app/state/walletPrefs", () => ({
  recordLastUsedWallet: jest.fn(),
  getLastUsedWalletId: () => null,
}));

describe("WalletModal sticky action bar", () => {
  beforeEach(() => {
    (useWallet as jest.Mock).mockReturnValue({
      connectWallet: jest.fn(),
      disconnectWallet: jest.fn().mockResolvedValue({ success: true }),
      isConnected: true,
      walletAddress: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOP",
      walletName: "Freighter",
    });
  });

  it("renders the disconnect action bar when connected", () => {
    render(<WalletModal isOpen onOpenChange={() => {}} />);
    expect(screen.getByTestId("wallet-modal-action-bar")).toBeInTheDocument();
  });

  it("keeps the action bar sticky to the bottom of the scrollable body", () => {
    render(<WalletModal isOpen onOpenChange={() => {}} />);
    const bar = screen.getByTestId("wallet-modal-action-bar");
    expect(bar).toHaveClass("sticky");
    expect(bar).toHaveClass("bottom-0");
  });

  it("grows a divider/shadow once the body has been scrolled", () => {
    render(<WalletModal isOpen onOpenChange={() => {}} />);
    const bar = screen.getByTestId("wallet-modal-action-bar");
    const body = bar.parentElement as HTMLElement;

    expect(bar).not.toHaveClass("border-t");

    Object.defineProperty(body, "scrollTop", { value: 40, configurable: true });
    fireEvent.scroll(body);

    expect(bar).toHaveClass("border-t");
  });

  it("does not render an action bar when no wallet is connected", () => {
    (useWallet as jest.Mock).mockReturnValue({
      connectWallet: jest.fn(),
      disconnectWallet: jest.fn(),
      isConnected: false,
      walletAddress: null,
      walletName: null,
    });
    render(<WalletModal isOpen onOpenChange={() => {}} />);
    expect(screen.queryByTestId("wallet-modal-action-bar")).not.toBeInTheDocument();
  });
});
