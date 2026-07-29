import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletReconnectBanner } from "@/components/WalletReconnectBanner";
import {
  reconnectBannerTitle,
  reconnectBannerDescription,
  reconnectButtonLabel,
  dismissButtonLabel,
  reconnectAriaLabel,
  dismissAriaLabel,
} from "@/components/wallet-reconnect-banner.messages";

const HAS_CONNECTED_KEY = "predictify_has_connected";

const mockConnectWallet = jest.fn();
const mockWalletState = { isConnected: false };

jest.mock("@/hooks/useWallet.hook", () => ({
  useWallet: () => ({
    connectWallet: mockConnectWallet,
    disconnectWallet: jest.fn(),
    isConnected: mockWalletState.isConnected,
    walletAddress: null,
    walletName: null,
    isConnecting: false,
    error: null,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockWalletState.isConnected = false;
});

describe("WalletReconnectBanner", () => {
  // ─── Visibility ───────────────────────────────────────────────────────

  describe("Visibility", () => {
    it("does not render when wallet is connected", () => {
      mockWalletState.isConnected = true;
      const { container } = render(<WalletReconnectBanner />);
      expect(container.firstChild).toBeNull();
    });

    it("does not render when localStorage has no previous-connection flag", () => {
      const { container } = render(<WalletReconnectBanner />);
      expect(container.firstChild).toBeNull();
    });

    it("renders when previously connected and currently disconnected", () => {
      localStorage.setItem(HAS_CONNECTED_KEY, "true");
      render(<WalletReconnectBanner />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(reconnectBannerTitle)).toBeInTheDocument();
      expect(screen.getByText(reconnectBannerDescription)).toBeInTheDocument();
    });

    it("hides when wallet reconnects after banner was shown", () => {
      localStorage.setItem(HAS_CONNECTED_KEY, "true");
      mockWalletState.isConnected = false;
      const { rerender } = render(<WalletReconnectBanner />);
      expect(screen.getByRole("alert")).toBeInTheDocument();

      mockWalletState.isConnected = true;
      rerender(<WalletReconnectBanner />);
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("hides when dismiss button is clicked", async () => {
      localStorage.setItem(HAS_CONNECTED_KEY, "true");
      render(<WalletReconnectBanner />);
      expect(screen.getByRole("alert")).toBeInTheDocument();

      await userEvent.click(
        screen.getByRole("button", { name: dismissAriaLabel })
      );
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("does not show after intentional disconnect within the session", () => {
      mockWalletState.isConnected = true;
      const { rerender } = render(<WalletReconnectBanner />);

      mockWalletState.isConnected = false;
      rerender(<WalletReconnectBanner />);
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("does not reappear on remount after intentional disconnect clears the flag", () => {
      mockWalletState.isConnected = true;
      const { rerender, unmount } = render(<WalletReconnectBanner />);

      mockWalletState.isConnected = false;
      rerender(<WalletReconnectBanner />);

      unmount();

      const { container } = render(<WalletReconnectBanner />);
      expect(container.firstChild).toBeNull();
    });
  });

  // ─── Interaction ──────────────────────────────────────────────────────

  describe("Interaction", () => {
    it("calls onReconnect when reconnect button is clicked", async () => {
      const onReconnect = jest.fn();
      localStorage.setItem(HAS_CONNECTED_KEY, "true");
      render(<WalletReconnectBanner onReconnect={onReconnect} />);

      await userEvent.click(
        screen.getByRole("button", { name: reconnectAriaLabel })
      );
      expect(onReconnect).toHaveBeenCalledTimes(1);
    });

    it("shows the reconnect button with correct label", () => {
      localStorage.setItem(HAS_CONNECTED_KEY, "true");
      render(<WalletReconnectBanner />);

      const btn = screen.getByRole("button", { name: reconnectAriaLabel });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveTextContent(reconnectButtonLabel);
    });

    it("shows the dismiss button with correct label", () => {
      localStorage.setItem(HAS_CONNECTED_KEY, "true");
      render(<WalletReconnectBanner />);

      const btn = screen.getByRole("button", { name: dismissAriaLabel });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveTextContent(dismissButtonLabel);
    });
  });

  // ─── localStorage management ──────────────────────────────────────────

  describe("localStorage management", () => {
    it("sets the flag on mount when wallet is connected", () => {
      mockWalletState.isConnected = true;
      render(<WalletReconnectBanner />);
      expect(localStorage.getItem(HAS_CONNECTED_KEY)).toBe("true");
    });

    it("removes the flag when wallet disconnects (intentional)", () => {
      mockWalletState.isConnected = true;
      const { rerender } = render(<WalletReconnectBanner />);

      mockWalletState.isConnected = false;
      rerender(<WalletReconnectBanner />);
      expect(localStorage.getItem(HAS_CONNECTED_KEY)).toBeNull();
    });

    it("re-sets the flag on reconnect after a disconnect", () => {
      localStorage.setItem(HAS_CONNECTED_KEY, "true");
      mockWalletState.isConnected = false;
      const { rerender } = render(<WalletReconnectBanner />);
      expect(screen.getByRole("alert")).toBeInTheDocument();

      mockWalletState.isConnected = true;
      rerender(<WalletReconnectBanner />);
      expect(localStorage.getItem(HAS_CONNECTED_KEY)).toBe("true");
    });

    it("does not crash when localStorage throws", () => {
      const origGetItem = localStorage.getItem;
      const origSetItem = localStorage.setItem;
      const origRemoveItem = localStorage.removeItem;

      localStorage.getItem = jest.fn(() => { throw new Error("storage unavailable"); });
      localStorage.setItem = jest.fn(() => { throw new Error("storage unavailable"); });
      localStorage.removeItem = jest.fn(() => { throw new Error("storage unavailable"); });

      expect(() => render(<WalletReconnectBanner />)).not.toThrow();

      localStorage.getItem = origGetItem;
      localStorage.setItem = origSetItem;
      localStorage.removeItem = origRemoveItem;
    });
  });

  // ─── Accessibility ────────────────────────────────────────────────────

  describe("Accessibility", () => {
    it("has role alert", () => {
      localStorage.setItem(HAS_CONNECTED_KEY, "true");
      render(<WalletReconnectBanner />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("has aria-live polite", () => {
      localStorage.setItem(HAS_CONNECTED_KEY, "true");
      render(<WalletReconnectBanner />);
      expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
    });

    it("hides decorative icons from assistive technology", () => {
      localStorage.setItem(HAS_CONNECTED_KEY, "true");
      const { container } = render(<WalletReconnectBanner />);
      container.querySelectorAll("svg").forEach((svg) => {
        expect(svg).toHaveAttribute("aria-hidden", "true");
      });
    });

    it("gives the reconnect button a descriptive aria-label", () => {
      localStorage.setItem(HAS_CONNECTED_KEY, "true");
      render(<WalletReconnectBanner />);
      expect(
        screen.getByRole("button", { name: reconnectAriaLabel })
      ).toBeInTheDocument();
    });

    it("gives the dismiss button a descriptive aria-label", () => {
      localStorage.setItem(HAS_CONNECTED_KEY, "true");
      render(<WalletReconnectBanner />);
      expect(
        screen.getByRole("button", { name: dismissAriaLabel })
      ).toBeInTheDocument();
    });
  });

  // ─── Styling ──────────────────────────────────────────────────────────

  describe("Styling", () => {
    it("has amber warning variant classes for both light and dark mode", () => {
      localStorage.setItem(HAS_CONNECTED_KEY, "true");
      render(<WalletReconnectBanner />);
      const alert = screen.getByRole("alert");
      expect(alert.className).toContain("dark:");
      expect(alert.className).toContain("amber");
    });

    it("applies custom className to the outer wrapper", () => {
      localStorage.setItem(HAS_CONNECTED_KEY, "true");
      const { container } = render(
        <WalletReconnectBanner className="my-custom-class" />
      );
      const outer = container.firstChild as HTMLElement;
      expect(outer.className).toContain("my-custom-class");
    });

    it("has responsive layout classes on the description row", () => {
      localStorage.setItem(HAS_CONNECTED_KEY, "true");
      render(<WalletReconnectBanner />);
      expect(
        document.querySelector(".sm\\:flex-row")
      ).toBeInTheDocument();
    });
  });

  // ─── Message keys ─────────────────────────────────────────────────────

  describe("Message keys", () => {
    const messages = [
      reconnectBannerTitle,
      reconnectBannerDescription,
      reconnectButtonLabel,
      dismissButtonLabel,
      reconnectAriaLabel,
      dismissAriaLabel,
    ];

    it("every message resolves to a non-empty string", () => {
      messages.forEach((msg) => {
        expect(typeof msg).toBe("string");
        expect(msg.length).toBeGreaterThan(0);
      });
    });
  });
});
