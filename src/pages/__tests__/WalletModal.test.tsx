import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WalletModal } from "../WalletModal";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock next/image to avoid Next.js image optimization issues in Jest
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

// Mock wallet-kits.constant to avoid ESM stellar-wallets-kit import issue
jest.mock("@/constants/wallet-kits.constant", () => ({
  getKit: jest.fn(() => ({
    getSupportedWallets: jest.fn().mockResolvedValue([]),
  })),
}));

// Mock useReducedMotion hook
const mockUseReducedMotion = jest.fn(() => false);
jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

// Mock useWallet hook — default to a connected wallet so the copy
// address button (and its tooltip) is rendered.
const mockWallet = {
  connectWallet: jest.fn(),
  disconnectWallet: jest.fn(),
  isConnected: true,
  walletAddress: "GDQERJZWU...AbCd1234",
  walletName: "Freighter",
  isConnecting: false,
  error: null,
};
jest.mock("@/hooks/useWallet.hook", () => ({
  useWallet: () => mockWallet,
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("WalletModal — reduced-motion fallback (#633)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseReducedMotion.mockReset();
    mockUseReducedMotion.mockReturnValue(false);
  });

  it("renders dialog content with default entrance/exit animations when motion is allowed", () => {
    mockUseReducedMotion.mockReturnValue(false);
    render(<WalletModal isOpen={true} onOpenChange={jest.fn()} />);

    // Radix Dialog content gets role="dialog"
    const dialogContent = screen.getByRole("dialog");
    expect(dialogContent).toBeInTheDocument();

    // Verify it contains standard Radix animation classes
    expect(dialogContent.className).toContain("data-[state=open]:animate-in");
    expect(dialogContent.className).toContain("duration-200");
    expect(dialogContent.className).not.toContain("duration-0");
    expect(dialogContent.className).not.toContain("transition-none");
  });

  it("renders dialog content statically (duration-0 transition-none) when reducedMotion prop is true", () => {
    mockUseReducedMotion.mockReturnValue(false);
    render(<WalletModal isOpen={true} onOpenChange={jest.fn()} reducedMotion={true} />);

    const dialogContent = screen.getByRole("dialog");
    expect(dialogContent).toBeInTheDocument();

    expect(dialogContent.className).toContain("duration-0");
    expect(dialogContent.className).toContain("transition-none");
    expect(dialogContent.className).not.toContain("data-[state=open]:animate-in");
    expect(dialogContent.className).not.toContain("duration-200");
  });

  it("renders dialog content statically (duration-0 transition-none) when prefers-reduced-motion is active", () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<WalletModal isOpen={true} onOpenChange={jest.fn()} />);

    const dialogContent = screen.getByRole("dialog");
    expect(dialogContent).toBeInTheDocument();

    expect(dialogContent.className).toContain("duration-0");
    expect(dialogContent.className).toContain("transition-none");
    expect(dialogContent.className).not.toContain("data-[state=open]:animate-in");
    expect(dialogContent.className).not.toContain("duration-200");
  });
});

describe("WalletModal — copy-address tooltip (#783)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseReducedMotion.mockReset();
    mockUseReducedMotion.mockReturnValue(false);
  });

  it("renders a copy button with a tooltip trigger when a wallet is connected", () => {
    render(<WalletModal isOpen={true} onOpenChange={jest.fn()} />);

    // The copy address button is present when connected
    const copyButton = screen.getByRole("button", { name: /copy wallet address/i });
    expect(copyButton).toBeInTheDocument();
  });

  it("shows 'Copy wallet address' tooltip content when the tooltip is opened", async () => {
    render(<WalletModal isOpen={true} onOpenChange={jest.fn()} />);

    const copyButton = screen.getByRole("button", { name: /copy wallet address/i });

    // Focus the trigger (Radix tooltip opens on focus / hover)
    fireEvent.focus(copyButton);

    // The tooltip content should become visible
    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Copy wallet address");
  });
});