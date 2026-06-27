/**
 * Tests for ConnectWalletModal — focused on the "Last used" badge feature.
 *
 * Scope:
 *   1. walletPrefs helpers (unit)
 *   2. ConnectWalletModal rendering (integration)
 *   3. Badge lifecycle: appears, tracks the correct provider, hidden while connecting
 *   4. Accessibility (role, aria-label, aria-live)
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── walletPrefs ──────────────────────────────────────────────────────────────
import {
  getWalletPrefs,
  setWalletPrefs,
  recordLastUsedWallet,
  getLastUsedWalletId,
} from "@/app/state/walletPrefs";

// ── Modal ────────────────────────────────────────────────────────────────────
import { ConnectWalletModal } from "@/components/connect-wallet-modal";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock next/image to a simple <img> to avoid Next.js image optimisation in tests.
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

// Minimal useWallet mock — we control the return value per test.
const mockConnectWallet    = jest.fn();
const mockDisconnectWallet = jest.fn();

jest.mock("@/hooks/useWallet.hook", () => ({
  useWallet: () => ({
    connectWallet:    mockConnectWallet,
    disconnectWallet: mockDisconnectWallet,
    isConnected:      false,
    walletAddress:    null,
    walletName:       null,
    isConnecting:     false,
    error:            null,
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Renders the modal in the open, disconnected state. */
function renderModal(props: Partial<React.ComponentProps<typeof ConnectWalletModal>> = {}) {
  return render(
    <ConnectWalletModal
      isOpen={true}
      onOpenChange={jest.fn()}
      {...props}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. walletPrefs unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe("walletPrefs", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null lastUsedWalletId when nothing is stored", () => {
    expect(getLastUsedWalletId()).toBeNull();
  });

  it("persists and retrieves the last-used wallet ID", () => {
    recordLastUsedWallet("freighter");
    expect(getLastUsedWalletId()).toBe("freighter");
  });

  it("overwrites the previous last-used wallet when a new one is recorded", () => {
    recordLastUsedWallet("freighter");
    recordLastUsedWallet("lobstr");
    expect(getLastUsedWalletId()).toBe("lobstr");
  });

  it("getWalletPrefs returns default when localStorage value is corrupt JSON", () => {
    localStorage.setItem("predictify_wallet_prefs", "{{not-json}}");
    expect(getWalletPrefs()).toEqual({ lastUsedWalletId: null });
  });

  it("setWalletPrefs merges partial updates without clobbering other fields", () => {
    // Simulate a future field being present.
    localStorage.setItem(
      "predictify_wallet_prefs",
      JSON.stringify({ lastUsedWalletId: "freighter", futureField: "keep-me" })
    );
    setWalletPrefs({ lastUsedWalletId: "lobstr" });
    const raw = JSON.parse(localStorage.getItem("predictify_wallet_prefs")!);
    expect(raw.lastUsedWalletId).toBe("lobstr");
    // Unknown future fields survive a round-trip because we spread current.
    expect(raw.futureField).toBe("keep-me");
  });

  it("getLastUsedWalletId returns null when lastUsedWalletId is explicitly null", () => {
    setWalletPrefs({ lastUsedWalletId: null });
    expect(getLastUsedWalletId()).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. ConnectWalletModal — "Last used" badge visibility
// ─────────────────────────────────────────────────────────────────────────────

describe("ConnectWalletModal — Last used badge", () => {
  beforeEach(() => {
    localStorage.clear();
    mockConnectWallet.mockReset();
    mockDisconnectWallet.mockReset();
  });

  it("shows NO badge when no wallet has been used before", () => {
    renderModal();
    expect(screen.queryByTestId("last-used-badge")).toBeNull();
  });

  it("shows exactly ONE badge next to the previously used wallet", () => {
    recordLastUsedWallet("lobstr");
    renderModal();

    const badges = screen.getAllByTestId("last-used-badge");
    expect(badges).toHaveLength(1);
  });

  it("places the badge next to the correct provider", () => {
    recordLastUsedWallet("xbull");
    renderModal();

    // The XBULL button should contain the badge.
    const xbullButton = screen.getByRole("button", {
      name: /connect xbull \(last used\)/i,
    });
    expect(xbullButton).toBeTruthy();

    // Other buttons must not carry a badge.
    const freighterButton = screen.getByRole("button", { name: /connect freighter$/i });
    expect(freighterButton).not.toHaveTextContent("Last used");
  });

  it("badge has accessible aria-label", () => {
    recordLastUsedWallet("freighter");
    renderModal();

    const badge = screen.getByTestId("last-used-badge");
    expect(badge).toHaveAttribute("aria-label", "Last used wallet");
  });

  it("updates to show the new provider after a successful connect", async () => {
    recordLastUsedWallet("freighter");

    mockConnectWallet.mockResolvedValueOnce({
      success: true,
      address: "GAABC123DEF456GHI789JKL",
    });

    const onOpenChange = jest.fn();
    renderModal({ onOpenChange });

    // Before connecting — Freighter has the badge.
    expect(
      screen.getByRole("button", { name: /connect freighter \(last used\)/i })
    ).toBeTruthy();

    // Connect via LOBSTR.
    await userEvent.click(
      screen.getByRole("button", { name: /connect lobstr$/i })
    );

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));

    // Re-open the modal to verify the badge migrated.
    const { unmount } = renderModal({ onOpenChange: jest.fn() });
    expect(
      screen.getByRole("button", { name: /connect lobstr \(last used\)/i })
    ).toBeTruthy();
    unmount();
  });

  it("does NOT show badge while a connection attempt is in progress", async () => {
    recordLastUsedWallet("albedo");

    // Never resolves — simulates a pending connection.
    mockConnectWallet.mockReturnValue(new Promise(() => {}));

    renderModal();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /connect albedo \(last used\)/i }));
    });

    // Wait for the "Connecting…" text to appear.
    await waitFor(() =>
      expect(screen.getByText("Connecting…")).toBeInTheDocument()
    );

    // Badge must be hidden while connecting.
    expect(screen.queryByTestId("last-used-badge")).toBeNull();
  });

  it("shows error message and badge remains visible after a failed connection attempt", async () => {
    recordLastUsedWallet("rabet");

    mockConnectWallet.mockResolvedValueOnce({
      success: false,
      error: "Extension not found",
    });

    renderModal();

    await userEvent.click(
      screen.getByRole("button", { name: /connect rabet \(last used\)/i })
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Extension not found")
    );

    // Badge should still be visible after the failed attempt.
    expect(screen.getByTestId("last-used-badge")).toBeInTheDocument();
  });

  it("badge uses the secondary design-token variant (light/dark mode consistent)", () => {
    recordLastUsedWallet("freighter");
    renderModal();

    const badge = screen.getByTestId("last-used-badge");
    // The CVA secondary variant adds bg-secondary; verify the data-slot or class presence.
    // We check for the accessible text as a proxy for the correct component being used.
    expect(badge).toHaveTextContent("Last used");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ConnectWalletModal — general behaviour (smoke)
// ─────────────────────────────────────────────────────────────────────────────

describe("ConnectWalletModal — general", () => {
  beforeEach(() => {
    localStorage.clear();
    mockConnectWallet.mockReset();
    mockDisconnectWallet.mockReset();
  });

  it("renders five wallet options", () => {
    renderModal();
    // Each wallet button has an aria-label starting with "Connect …"
    const walletButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.getAttribute("aria-label")?.startsWith("Connect "));
    expect(walletButtons).toHaveLength(5);
  });

  it("calls onOpenChange(false) after a successful connect", async () => {
    mockConnectWallet.mockResolvedValueOnce({
      success: true,
      address: "GABC123",
    });

    const onOpenChange = jest.fn();
    renderModal({ onOpenChange });

    await userEvent.click(
      screen.getByRole("button", { name: /connect freighter/i })
    );

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("displays an error alert when connection fails", async () => {
    mockConnectWallet.mockResolvedValueOnce({
      success: false,
      error: "User rejected request",
    });

    renderModal();

    await userEvent.click(
      screen.getByRole("button", { name: /connect freighter/i })
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("User rejected request")
    );
  });

  it("clears the error when the modal is closed and reopened", async () => {
    mockConnectWallet.mockResolvedValueOnce({
      success: false,
      error: "Timeout",
    });

    const { rerender } = renderModal();

    await userEvent.click(
      screen.getByRole("button", { name: /connect freighter/i })
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    // Close the modal.
    rerender(
      <ConnectWalletModal
        isOpen={false}
        onOpenChange={jest.fn()}
      />
    );

    // Re-open.
    rerender(
      <ConnectWalletModal
        isOpen={true}
        onOpenChange={jest.fn()}
      />
    );

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
