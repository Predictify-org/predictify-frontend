import React from "react";
import { render, screen } from "@testing-library/react";
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

// Mock useReducedMotion hook
const mockUseReducedMotion = jest.fn(() => false);
jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

// Mock useWallet hook
jest.mock("@/hooks/useWallet.hook", () => ({
  useWallet: () => ({
    connectWallet: jest.fn(),
    disconnectWallet: jest.fn(),
    isConnected: false,
    walletAddress: null,
    walletName: null,
    isConnecting: false,
    error: null,
  }),
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

    // Verify animation classes are stripped/bypassed and replaced with static classes
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

    // Verify system preference is respected and static fallback is applied
    expect(dialogContent.className).toContain("duration-0");
    expect(dialogContent.className).toContain("transition-none");
    expect(dialogContent.className).not.toContain("data-[state=open]:animate-in");
    expect(dialogContent.className).not.toContain("duration-200");
  });
});
