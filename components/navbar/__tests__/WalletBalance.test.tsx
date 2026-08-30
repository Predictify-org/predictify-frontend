import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("@/context/WalletContext", () => ({
  useWalletContext: jest.fn(),
}));

jest.mock("@/hooks/useStellarBalance.hook", () => ({
  useStellarBalance: jest.fn(),
}));

jest.mock("@/context/PrivacyContext", () => ({
  usePrivacy: jest.fn(),
}));

jest.mock("@/utils/maskAmount", () => ({
  maskAmount: jest.fn(() => "••••"),
}));

import { WalletBalance } from "../WalletBalance";
import { useWalletContext } from "@/context/WalletContext";
import { useStellarBalance } from "@/hooks/useStellarBalance.hook";
import { usePrivacy } from "@/context/PrivacyContext";

const mockUseWalletContext = useWalletContext as jest.Mock;
const mockUseStellarBalance = useStellarBalance as jest.Mock;
const mockUsePrivacy = usePrivacy as jest.Mock;

function mockWalletConnected(address = "GA5C3TNI3KQY3Y3X3X3X3X3X3X3X3X3X3X3X3X3X3X") {
  mockUseWalletContext.mockReturnValue({
    address,
    connected: true,
    isLoading: false,
  });
}

function mockWalletDisconnected() {
  mockUseWalletContext.mockReturnValue({
    address: null,
    connected: false,
    isLoading: false,
  });
}

function mockBalance(balance: string | null, isLoading = false) {
  mockUseStellarBalance.mockReturnValue({ balance, isLoading, error: null });
}

function mockLoadingBalance() {
  mockUseStellarBalance.mockReturnValue({ balance: null, isLoading: true, error: null });
}

function mockPrivacy(hideBalances = false) {
  mockUsePrivacy.mockReturnValue({ hideBalances, setHideBalances: jest.fn() });
}

describe("WalletBalance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrivacy(false);
  });

  it("renders nothing when wallet is not connected", () => {
    mockWalletDisconnected();
    mockBalance(null);
    const { container } = render(<WalletBalance />);
    expect(container.firstChild).toBeNull();
  });

  it("renders loading skeleton when fetching initial balance", () => {
    mockWalletConnected();
    mockLoadingBalance();
    render(<WalletBalance />);
    expect(screen.getByLabelText("Loading wallet balance")).toBeInTheDocument();
  });

  it("renders formatted balance when data is available", () => {
    mockWalletConnected();
    mockBalance("1250.5000000");
    render(<WalletBalance />);
    expect(screen.getByLabelText("Wallet balance: 1,250.50 XLM")).toBeInTheDocument();
    expect(screen.getByText("1,250.50")).toBeInTheDocument();
    expect(screen.getByText("XLM")).toBeInTheDocument();
  });

  it("renders zero balance when account returns 0", () => {
    mockWalletConnected();
    mockBalance("0.0000000");
    render(<WalletBalance />);
    expect(screen.getByLabelText("Wallet balance: 0.00 XLM")).toBeInTheDocument();
    expect(screen.getByText("0.00")).toBeInTheDocument();
  });

  it("hides balance when hideBalances is true", () => {
    mockWalletConnected();
    mockPrivacy(true);
    mockBalance("5000.0000000");
    render(<WalletBalance />);
    expect(screen.getByLabelText("Wallet balance hidden")).toBeInTheDocument();
    expect(screen.getByText("••••")).toBeInTheDocument();
  });

  it("renders nothing when balance is null after loading completes", () => {
    mockWalletConnected();
    mockBalance(null);
    const { container } = render(<WalletBalance />);
    expect(container.firstChild).toBeNull();
  });

  it("applies custom className", () => {
    mockWalletConnected();
    mockBalance("100.0000000");
    const { container } = render(<WalletBalance className="custom-class" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("custom-class");
  });

  it("handles very large balance formatting", () => {
    mockWalletConnected();
    mockBalance("1234567.8900000");
    render(<WalletBalance />);
    expect(screen.getByText("1,234,567.89")).toBeInTheDocument();
  });

  it("handles tiny balance formatting", () => {
    mockWalletConnected();
    mockBalance("0.0000100");
    render(<WalletBalance />);
    expect(screen.getByText("0.00")).toBeInTheDocument();
  });
});
