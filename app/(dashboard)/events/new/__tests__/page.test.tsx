import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewEventPage from "../page";
import { useWallet } from "@/hooks/useWallet.hook";
import { useTransaction } from "@/hooks/useTransaction.hook";
import { buildCreateMarketIntent } from "@/lib/transaction/create-market-intent";

// Radix popover/select interactions are slow when the whole suite runs in
// parallel; these tests wait on user-driven network-free UI only.
jest.setTimeout(20_000);

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock("@/components/connect-wallet-modal", () => ({
  ConnectWalletModal: () => null,
}));

jest.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect }: { onSelect: (date: Date) => void }) => {
    const React = require("react");
    return React.createElement(
      "button",
      {
        type: "button",
        onClick: () => onSelect(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      },
      "Choose a future date",
    );
  },
}));

jest.mock("@/hooks/useWallet.hook", () => ({
  useWallet: jest.fn(),
}));

jest.mock("@/hooks/useTransaction.hook", () => ({
  useTransaction: jest.fn(),
}));

jest.mock("@/lib/transaction/create-market-intent", () => ({
  buildCreateMarketIntent: jest.fn(),
}));

const mockUseWallet = useWallet as jest.Mock;
const mockUseTransaction = useTransaction as jest.Mock;
const mockBuildCreateMarketIntent = buildCreateMarketIntent as jest.Mock;

const WALLET = "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
const TITLE = "Will Argentina win the 2026 World Cup?";
const DESCRIPTION = "Resolves YES if Argentina wins the 2026 FIFA World Cup.";

let executeTransaction: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  executeTransaction = jest.fn().mockResolvedValue({ success: true, hash: "abc123" });

  mockUseWallet.mockReturnValue({
    isConnected: true,
    walletAddress: WALLET,
    isConnecting: false,
  });

  mockUseTransaction.mockReturnValue({
    executeTransaction,
    status: "idle",
    transactionHash: null,
    transactionError: null,
    failureType: null,
    resetTransaction: jest.fn(),
  });

  mockBuildCreateMarketIntent.mockResolvedValue({
    key: `${WALLET}:create_market:hash`,
    draftHash: "hash",
    buildXdr: jest.fn().mockResolvedValue("UNSIGNED_XDR"),
  });
});

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Event Title"), TITLE);
  await user.type(screen.getByLabelText("Description"), DESCRIPTION);

  await user.click(screen.getByLabelText("Category"));
  await user.click(await screen.findByRole("option", { name: "Sports" }));

  await user.click(screen.getByLabelText("Deadline"));
  await user.click(await screen.findByRole("button", { name: "Choose a future date" }));

  await user.type(screen.getByLabelText("Outcome 1"), "Yes");
  await user.type(screen.getByLabelText("New outcome"), "No");
  await user.click(screen.getByRole("button", { name: "Add outcome" }));
  expect(screen.getByLabelText("Outcome 2")).toHaveValue("No");
}

function form() {
  return screen.getByRole("form", { name: /create new prediction event/i });
}

describe("Create Event page", () => {
  it("shows inline errors and never submits an invalid draft", async () => {
    const user = userEvent.setup();
    render(<NewEventPage />);

    await user.click(screen.getByRole("button", { name: "Create Event" }));

    expect(await screen.findByText("Enter a title")).toBeInTheDocument();
    expect(screen.getByText("Enter a description")).toBeInTheDocument();
    expect(screen.getByText("Choose a deadline")).toBeInTheDocument();
    expect(screen.getByText("Add at least 2 outcomes")).toBeInTheDocument();
    expect(mockBuildCreateMarketIntent).not.toHaveBeenCalled();
    expect(executeTransaction).not.toHaveBeenCalled();
  });

  it("builds the intent and redirects only after a successful transaction", async () => {
    const user = userEvent.setup();
    render(<NewEventPage />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create Event" }));

    await waitFor(() => {
      expect(executeTransaction).toHaveBeenCalledTimes(1);
    });

    expect(mockBuildCreateMarketIntent).toHaveBeenCalledTimes(1);
    expect(mockBuildCreateMarketIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: TITLE,
        description: DESCRIPTION,
        category: "Sports",
        isPublic: true,
        featuredEvent: false,
        outcomes: [{ text: "Yes" }, { text: "No" }],
      }),
      WALLET,
    );
    expect(executeTransaction).toHaveBeenCalledWith(expect.any(Function));
    expect(mockPush).toHaveBeenCalledWith("/events");
  });

  it("submits exactly once on a double submit", async () => {
    const user = userEvent.setup();
    render(<NewEventPage />);

    await fillValidForm(user);
    fireEvent.submit(form());
    fireEvent.submit(form());

    await waitFor(() => {
      expect(executeTransaction).toHaveBeenCalledTimes(1);
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(executeTransaction).toHaveBeenCalledTimes(1);
    expect(mockBuildCreateMarketIntent).toHaveBeenCalledTimes(1);
  });

  it("keeps the draft and shows a recoverable error when the signature is rejected", async () => {
    executeTransaction.mockResolvedValue({
      success: false,
      failureType: "userRejected",
      error: "User rejected the request",
    });

    const user = userEvent.setup();
    render(<NewEventPage />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create Event" }));

    expect(
      await screen.findByText(/You rejected the signature request/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Event Title")).toHaveValue(TITLE);
    expect(screen.getByLabelText("Outcome 1")).toHaveValue("Yes");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("maps submission failures to their failure state", async () => {
    executeTransaction.mockResolvedValue({
      success: false,
      failureType: "submitFailed",
      error: "tx_bad_seq",
    });

    const user = userEvent.setup();
    render(<NewEventPage />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create Event" }));

    expect(await screen.findByText("Submission failed")).toBeInTheDocument();
    expect(screen.getByText(/tx_bad_seq/)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("reports build failures without calling executeTransaction", async () => {
    mockBuildCreateMarketIntent.mockRejectedValue(
      new Error("Set NEXT_PUBLIC_PREDICTIFY_CONTRACT_ID"),
    );

    const user = userEvent.setup();
    render(<NewEventPage />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create Event" }));

    expect(
      await screen.findByText("Could not prepare the transaction"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Set NEXT_PUBLIC_PREDICTIFY_CONTRACT_ID/),
    ).toBeInTheDocument();
    expect(executeTransaction).not.toHaveBeenCalled();
  });

  it("prompts to connect a wallet and disables submission when disconnected", () => {
    mockUseWallet.mockReturnValue({
      isConnected: false,
      walletAddress: null,
      isConnecting: false,
    });

    render(<NewEventPage />);

    expect(
      screen.getByText("Connect a wallet to create a market"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Event" })).toBeDisabled();
  });
});
