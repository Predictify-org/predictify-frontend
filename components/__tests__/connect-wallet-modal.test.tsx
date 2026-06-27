import { render, screen, waitFor } from "@testing-library/react";
import { ConnectWalletModal } from "../connect-wallet-modal";
import { useWallet } from "@/hooks/useWallet.hook";
import { getKit } from "@/constants/wallet-kits.constant";

// Mock stellar-wallets-kit to prevent ESM import errors in Jest
jest.mock("@creit.tech/stellar-wallets-kit", () => ({
  WalletNetwork: { PUBLIC: "Public", TESTNET: "Testnet" },
  FREIGHTER_ID: "freighter",
  LOBSTR_ID: "lobstr",
  XBULL_ID: "xbull",
  ALBEDO_ID: "albedo",
  RABET_ID: "rabet",
}));

// Mock the hooks and constants
jest.mock("@/hooks/useWallet.hook");
jest.mock("@/constants/wallet-kits.constant");

describe("ConnectWalletModal disabled-state rendering", () => {
  beforeEach(() => {
    (useWallet as jest.Mock).mockReturnValue({
      connectWallet: jest.fn(),
      disconnectWallet: jest.fn(),
      isConnected: false,
      walletAddress: null,
      walletName: null,
    });
  });

  it("should render disabled wallets with 'Not installed' text and 'Install' link when not available", async () => {
    // Mock getKit to return some available and some unavailable wallets
    const mockGetSupportedWallets = jest.fn().mockResolvedValue([
      { id: "freighter", isAvailable: false },
      { id: "lobstr", isAvailable: true },
    ]);

    (getKit as jest.Mock).mockReturnValue({
      getSupportedWallets: mockGetSupportedWallets,
    });

    render(
      <ConnectWalletModal
        isOpen={true}
        onOpenChange={jest.fn()}
      />
    );

    // Wait for the async wallet availability check to finish
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Freighter/i })).toBeDisabled();
    });

    const freighterButton = screen.getByRole("button", { name: /Freighter/i });
    expect(freighterButton).toBeDisabled();
    expect(screen.getByText("Not installed")).toBeInTheDocument();
    
    // Check if install link is rendered
    const installLinks = screen.getAllByRole("link", { name: /Install/i });
    expect(installLinks.length).toBeGreaterThan(0);
    expect(installLinks[0]).toHaveAttribute("href", "https://freighter.app/");

    // Check LOBSTR (mocked as available)
    const lobstrButton = screen.getByRole("button", { name: /LOBSTR/i });
    expect(lobstrButton).not.toBeDisabled();
  });
});
