import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CreatorPage from "../page";
import { useWalletContext } from "@/context/WalletContext";
import { useCreatorMarkets } from "@/hooks/useCreatorMarkets";
import { useTransaction } from "@/hooks/useTransaction.hook";
import type { CreatedMarket } from "@/lib/creator";

jest.mock("@/context/WalletContext", () => ({
  useWalletContext: jest.fn(),
}));

jest.mock("@/hooks/useCreatorMarkets", () => ({
  useCreatorMarkets: jest.fn(),
}));

jest.mock("@/hooks/useTransaction.hook", () => ({
  useTransaction: jest.fn(),
}));

jest.mock("@/components/connect-wallet-modal", () => ({
  ConnectWalletModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog">Connect wallet options</div> : null,
}));

const mockExecuteTransaction = jest.fn();
const mockResetTransaction = jest.fn();
const mockApplyConfirmedAction = jest.fn();
const mockAddress = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function makeMarket(overrides: Partial<CreatedMarket> = {}): CreatedMarket {
  return {
    id: "creator-market-1",
    title: "Will the market resolve?",
    status: "open",
    volume: "0",
    feeBps: 250,
    feesEarned: "0",
    createdAt: "2026-01-01T00:00:00.000Z",
    deadline: new Date(Date.now() + 86_400_000).toISOString(),
    ...overrides,
  };
}

function setWallet(connected = true) {
  (useWalletContext as jest.Mock).mockReturnValue({
    address: connected ? mockAddress : null,
    connected,
    isLoading: false,
  });
}

function setMarkets(markets: CreatedMarket[]) {
  (useCreatorMarkets as jest.Mock).mockReturnValue({
    markets,
    isLoading: false,
    error: null,
    applyConfirmedAction: mockApplyConfirmedAction,
  });
}

describe("Creator dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWallet();
    setMarkets([makeMarket()]);
    (useTransaction as jest.Mock).mockReturnValue({
      status: "idle",
      transactionError: null,
      executeTransaction: mockExecuteTransaction,
      resetTransaction: mockResetTransaction,
    });
    mockExecuteTransaction.mockResolvedValue({ success: true, hash: "tx-hash" });
    mockApplyConfirmedAction.mockResolvedValue(undefined);
  });

  it("shows a connect-wallet call to action while disconnected", () => {
    setWallet(false);
    render(<CreatorPage />);
    expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /connect wallet/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the create-market empty state", () => {
    setMarkets([]);
    render(<CreatorPage />);
    expect(screen.getByText("No markets yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create your first market" })).toHaveAttribute(
      "href",
      "/events/new"
    );
  });

  it("requires confirmation and executes a market action once", async () => {
    render(<CreatorPage />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel market" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mockExecuteTransaction).toHaveBeenCalledTimes(1);
      expect(mockApplyConfirmedAction).toHaveBeenCalledWith(
        "creator-market-1",
        "cancel_market"
      );
    });
    expect(await screen.findByText("Market cancelled successfully.")).toBeInTheDocument();
  });

  it("ignores a second confirm click while a transaction is running", async () => {
    let finishTransaction: ((result: { success: boolean; hash: string }) => void) | undefined;
    mockExecuteTransaction.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishTransaction = resolve;
        })
    );

    render(<CreatorPage />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel market" }));
    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    await waitFor(() => expect(mockExecuteTransaction).toHaveBeenCalledTimes(1));
    finishTransaction?.({ success: true, hash: "tx-hash" });
    await waitFor(() => expect(mockApplyConfirmedAction).toHaveBeenCalledTimes(1));
  });

  it("does not change market state after a rejected transaction", async () => {
    mockExecuteTransaction.mockResolvedValue({
      success: false,
      error: "Transaction rejected",
      failureType: "userRejected",
    });
    render(<CreatorPage />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel market" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mockExecuteTransaction).toHaveBeenCalledTimes(1);
      expect(mockApplyConfirmedAction).not.toHaveBeenCalled();
    });
    expect(await screen.findByText("Transaction rejected")).toBeInTheDocument();
  });
});
