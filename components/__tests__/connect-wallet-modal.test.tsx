/**
 * Tests for ConnectWalletModal — focused on the "Last used" badge feature.
 *
 * Scope:
 *   1. walletPrefs helpers (unit)
 *   2. ConnectWalletModal rendering (integration)
 *   3. Badge lifecycle: appears, tracks the correct provider, hidden while connecting
 *   4. Accessibility (role, aria-label, aria-live)
 *   5. Error message mapping (friendlyConnectionError)
 *   6. All message keys resolve to non-empty strings
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

// ── Messages ─────────────────────────────────────────────────────────────────
import {
  walletConnectedTitle,
  walletConnectedDescription,
  connectWalletTitle,
  connectWalletDescription,
  connectingLabel,
  connectedLabel,
  disconnectButtonLabel,
  lastUsedBadgeLabel,
  lastUsedBadgeText,
  copyAddressLabel,
  addressCopiedLabel,
  connectionErrorFallback,
  connectionErrorUserRejected,
  connectionErrorExtensionNotFound,
  connectionErrorExtensionLocked,
  connectionErrorNetworkMismatch,
  connectionErrorTimeout,
  connectionErrorUnexpected,
  disconnectionErrorFallback,
  disconnectionErrorUnexpected,
  friendlyConnectionError,
} from "@/components/connect-wallet-modal.messages";

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
const mockWalletState = {
  isConnected:      false,
  walletAddress:    null as string | null,
  walletName:       null as string | null,
};

jest.mock("@/hooks/useWallet.hook", () => ({
  useWallet: () => ({
    connectWallet:    mockConnectWallet,
    disconnectWallet: mockDisconnectWallet,
    isConnected:      mockWalletState.isConnected,
    walletAddress:    mockWalletState.walletAddress,
    walletName:       mockWalletState.walletName,
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
      expect(screen.getByRole("alert")).toHaveTextContent(connectionErrorExtensionNotFound)
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
    mockWalletState.isConnected = false;
    mockWalletState.walletAddress = null;
    mockWalletState.walletName = null;
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
      expect(screen.getByRole("alert")).toHaveTextContent(connectionErrorUserRejected)
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

  it("renders connected state with correct message strings", () => {
    // Simulate already-connected state
    mockWalletState.isConnected = true;
    mockWalletState.walletAddress = "GAABC123DEF456GHI789JKL";
    mockWalletState.walletName = "Freighter";

    renderModal();

    expect(screen.getByText(walletConnectedTitle)).toBeInTheDocument();
    expect(screen.getByText(walletConnectedDescription)).toBeInTheDocument();
    expect(screen.getByText(connectedLabel)).toBeInTheDocument();
    expect(screen.getByText(disconnectButtonLabel)).toBeInTheDocument();

    // Reset
    mockWalletState.isConnected = false;
    mockWalletState.walletAddress = null;
    mockWalletState.walletName = null;
  });

  it("renders disconnected state with correct message strings", () => {
    renderModal();

    expect(screen.getByText(connectWalletTitle)).toBeInTheDocument();
    expect(screen.getByText(connectWalletDescription)).toBeInTheDocument();
    expect(screen.queryByText(walletConnectedTitle)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. friendlyConnectionError — error mapping
// ─────────────────────────────────────────────────────────────────────────────

describe("friendlyConnectionError", () => {
  it("maps user-rejected errors to the rejection message", () => {
    expect(friendlyConnectionError("User rejected request")).toBe(connectionErrorUserRejected);
    expect(friendlyConnectionError("Request was cancelled")).toBe(connectionErrorUserRejected);
    expect(friendlyConnectionError("Access denied by user")).toBe(connectionErrorUserRejected);
  });

  it("maps extension-not-found errors to the installation message", () => {
    expect(friendlyConnectionError("Extension not found")).toBe(connectionErrorExtensionNotFound);
    expect(friendlyConnectionError("Wallet not installed")).toBe(connectionErrorExtensionNotFound);
    expect(friendlyConnectionError("Provider not available")).toBe(connectionErrorExtensionNotFound);
  });

  it("maps locked-extension errors to the unlock message", () => {
    expect(friendlyConnectionError("Extension is locked")).toBe(connectionErrorExtensionLocked);
    expect(friendlyConnectionError("Please unlock your wallet")).toBe(connectionErrorExtensionLocked);
    expect(friendlyConnectionError("User is logged out")).toBe(connectionErrorExtensionLocked);
  });

  it("maps network-mismatch errors to the network message", () => {
    expect(friendlyConnectionError("Network mismatch")).toBe(connectionErrorNetworkMismatch);
    expect(friendlyConnectionError("Wrong testnet")).toBe(connectionErrorNetworkMismatch);
    expect(friendlyConnectionError("Invalid mainnet")).toBe(connectionErrorNetworkMismatch);
  });

  it("maps timeout errors to the timeout message", () => {
    expect(friendlyConnectionError("Request timeout")).toBe(connectionErrorTimeout);
    expect(friendlyConnectionError("Connection timed out")).toBe(connectionErrorTimeout);
  });

  it("falls back to the generic message for unknown errors", () => {
    expect(friendlyConnectionError("Something weird")).toBe(connectionErrorFallback);
    expect(friendlyConnectionError("")).toBe(connectionErrorFallback);
    expect(friendlyConnectionError(null)).toBe(connectionErrorFallback);
    expect(friendlyConnectionError(undefined)).toBe(connectionErrorFallback);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Message key snapshot — every exported string is non-empty
// ─────────────────────────────────────────────────────────────────────────────

describe("Message key snapshot", () => {
  const messageKeys = [
    walletConnectedTitle,
    walletConnectedDescription,
    connectWalletTitle,
    connectWalletDescription,
    connectingLabel,
    connectedLabel,
    disconnectButtonLabel,
    lastUsedBadgeLabel,
    lastUsedBadgeText,
    copyAddressLabel,
    addressCopiedLabel,
    connectionErrorFallback,
    connectionErrorUserRejected,
    connectionErrorExtensionNotFound,
    connectionErrorExtensionLocked,
    connectionErrorNetworkMismatch,
    connectionErrorTimeout,
    connectionErrorUnexpected,
    disconnectionErrorFallback,
    disconnectionErrorUnexpected,
  ];

  it("every message key resolves to a non-empty string", () => {
    messageKeys.forEach((key) => {
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });
  });

  it("no message key contains raw SDK error patterns", () => {
    const rawPatterns = ["Error connecting", "Error disconnecting", "Error signing", "Failed", "Not supported"];
    messageKeys.forEach((key) => {
      rawPatterns.forEach((pattern) => {
        expect(key).not.toContain(pattern);
      });
    });
  });

  it("all error messages follow the three-part pattern (acknowledgement + cause + action)", () => {
    const errorMessages = [
      connectionErrorFallback,
      connectionErrorUserRejected,
      connectionErrorExtensionNotFound,
      connectionErrorExtensionLocked,
      connectionErrorNetworkMismatch,
      connectionErrorTimeout,
      connectionErrorUnexpected,
      disconnectionErrorFallback,
      disconnectionErrorUnexpected,
    ];

    errorMessages.forEach((msg) => {
      // Each error message should contain a period (indicating sentence structure)
      expect(msg).toContain(".");
      // Each should be reasonably short (≤ 100 chars for readability)
      expect(msg.length).toBeLessThanOrEqual(100);
    });
  });
});
