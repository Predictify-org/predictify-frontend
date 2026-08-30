import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LinkedAccounts from "@/src/legacy-pages/LinkedAccounts";

const mockConnectWallet = jest.fn();
const mockDisconnectWallet = jest.fn();
let connected = false;

jest.mock("@/context/WalletContext", () => ({
  useWalletContext: () => ({
    address: connected ? `G${"A".repeat(55)}` : null,
    name: connected ? "Freighter" : null,
    connected,
  }),
}));

jest.mock("@/hooks/useWallet.hook", () => ({
  useWallet: () => ({
    connectWallet: mockConnectWallet,
    disconnectWallet: mockDisconnectWallet,
    isConnecting: false,
    isDisconnecting: false,
    isOperationPending: false,
  }),
}));

jest.mock("@/hooks/useStellarBalance.hook", () => ({
  useStellarBalance: () => ({ balance: "1.0000000", isLoading: false }),
}));

jest.mock("@/lib/config", () => ({
  getClientConfig: () => ({ stellar: { network: "testnet" } }),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ fill: _fill, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

describe("LinkedAccounts wallet operation recovery", () => {
  beforeEach(() => {
    connected = false;
    mockConnectWallet.mockReset();
    mockDisconnectWallet.mockReset();
  });

  it("shows a deterministic recovery message after a failed connect", async () => {
    mockConnectWallet.mockResolvedValue({ success: false, error: "Unlock your wallet and try again.", errorKind: "wallet_locked" });
    render(<LinkedAccounts />);
    fireEvent.click(screen.getByRole("button", { name: /connect freighter wallet from available list/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Unlock your wallet and try again."));
    expect(screen.getByRole("alert")).toHaveTextContent("choose the action again to retry");
  });

  it("keeps the connected account visible and reports a partial disconnect failure", async () => {
    connected = true;
    mockDisconnectWallet.mockResolvedValue({ success: false, error: "The wallet could not be reached.", errorKind: "network" });
    render(<LinkedAccounts />);
    fireEvent.click(screen.getByRole("button", { name: /disconnect freighter wallet from card/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("The wallet could not be reached."));
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });
});
