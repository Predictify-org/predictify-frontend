/**
 * @file CopyAddress.test.tsx
 * Tests for the CopyAddress universal copy-to-clipboard button.
 *
 * Coverage:
 * - Renders correctly with default and custom props
 * - Copies address to clipboard on click
 * - Copies address on keyboard activation (Enter)
 * - Toggles icon from Copy → Check after a successful copy
 * - Shows success toast on copy
 * - Shows error toast when Clipboard API fails
 * - Shows error toast when Clipboard API is unavailable
 * - Updates the aria-live region for screen readers
 * - Applies custom className, size, and variant props
 * - Icon-only mode (empty label) still has an accessible aria-label
 * - Resets to default state after resetDelay
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Toaster } from "@/components/ui/toaster";
import { CopyAddress } from "../CopyAddress";

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_ADDRESS = "GABC1234DEFG5678HIJK9012LMNO3456PQRS7890TUVW1234XYZ5678";

/**
 * Wrap the component in Toaster so toasts dispatched via useToast are
 * rendered into the DOM and can be asserted on.  Toaster contains both
 * ToastProvider (required by Radix) and ToastViewport (renders the list).
 */
function renderWithToaster(ui: React.ReactElement) {
  return render(
    <>
      {ui}
      <Toaster />
    </>
  );
}

/** Build and install a mock clipboard on navigator. */
function mockClipboard(impl: Partial<Clipboard> = {}) {
  const defaultImpl: Pick<Clipboard, "writeText"> = {
    writeText: jest.fn().mockResolvedValue(undefined),
  };
  Object.defineProperty(navigator, "clipboard", {
    value: { ...defaultImpl, ...impl },
    configurable: true,
    writable: true,
  });
  return navigator.clipboard as jest.Mocked<Clipboard>;
}

/**
 * Helper to get the CopyAddress button by its aria-label.
 * We use the aria-label because the Toaster renders its own close button,
 * making `getByRole("button")` ambiguous after the first copy action.
 */
function getCopyButton(address: string, label?: string) {
  const labelText = label !== undefined && label.trim().length > 0
    ? label
    : address;
  const ariaLabel = labelText.trim().length > 0
    ? `Copy ${labelText}`
    : `Copy address ${address}`;
  return screen.getByRole("button", { name: ariaLabel });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CopyAddress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The use-toast module holds module-level state; reset by re-rendering
    // a fresh tree for each test (handled by @testing-library/react's
    // cleanup which runs after each test automatically).
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders a button with the address as the default label", () => {
    mockClipboard();
    renderWithToaster(<CopyAddress address={TEST_ADDRESS} />);

    expect(
      screen.getByRole("button", { name: new RegExp(TEST_ADDRESS) })
    ).toBeInTheDocument();
    expect(screen.getByText(TEST_ADDRESS)).toBeInTheDocument();
  });

  it("renders a custom label when the `label` prop is supplied", () => {
    mockClipboard();
    renderWithToaster(<CopyAddress address={TEST_ADDRESS} label="Copy wallet" />);

    expect(
      screen.getByRole("button", { name: /copy wallet/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Copy wallet")).toBeInTheDocument();
  });

  it("renders an icon-only button when label is an empty string", () => {
    mockClipboard();
    renderWithToaster(<CopyAddress address={TEST_ADDRESS} label="" size="icon" />);

    const btn = screen.getByRole("button", {
      name: `Copy address ${TEST_ADDRESS}`,
    });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toHaveTextContent(TEST_ADDRESS);
  });

  it("applies a custom className to the button", () => {
    mockClipboard();
    renderWithToaster(
      <CopyAddress address={TEST_ADDRESS} className="my-custom-class" />
    );
    expect(
      screen.getByRole("button", { name: new RegExp(TEST_ADDRESS) })
    ).toHaveClass("my-custom-class");
  });

  // ── Clipboard interaction ──────────────────────────────────────────────────

  it("writes the address to the clipboard when clicked", async () => {
    const clipboard = mockClipboard();
    renderWithToaster(<CopyAddress address={TEST_ADDRESS} />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(TEST_ADDRESS) })
      );
    });

    expect(clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(clipboard.writeText).toHaveBeenCalledWith(TEST_ADDRESS);
  });

  it("writes the address when activated with the Enter key", async () => {
    const clipboard = mockClipboard();
    renderWithToaster(<CopyAddress address={TEST_ADDRESS} />);

    const btn = screen.getByRole("button", { name: new RegExp(TEST_ADDRESS) });
    btn.focus();

    await act(async () => {
      // Pressing Enter on a native <button> fires a click event.
      fireEvent.keyDown(btn, { key: "Enter", code: "Enter" });
      fireEvent.click(btn);
    });

    expect(clipboard.writeText).toHaveBeenCalledWith(TEST_ADDRESS);
  });

  // ── Visual feedback ────────────────────────────────────────────────────────

  it("transitions to the 'Copied' state after a successful copy", async () => {
    mockClipboard();
    renderWithToaster(<CopyAddress address={TEST_ADDRESS} label="Copy address" />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /copy address/i })
      );
    });

    expect(screen.getByText("Copied")).toBeInTheDocument();
  });

  it("aria-pressed is false initially and true after copy", async () => {
    mockClipboard();
    renderWithToaster(<CopyAddress address={TEST_ADDRESS} />);

    const btn = screen.getByRole("button", { name: new RegExp(TEST_ADDRESS) });
    expect(btn).toHaveAttribute("aria-pressed", "false");

    await act(async () => {
      fireEvent.click(btn);
    });

    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("resets back to the default state after resetDelay ms", async () => {
    jest.useFakeTimers();
    mockClipboard();

    renderWithToaster(
      <CopyAddress address={TEST_ADDRESS} label="Copy address" resetDelay={1500} />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy address/i }));
    });

    expect(screen.getByText("Copied")).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    expect(screen.getByText("Copy address")).toBeInTheDocument();

    jest.useRealTimers();
  });

  // ── Toast notifications ────────────────────────────────────────────────────

  it("shows a success toast after copying", async () => {
    mockClipboard();
    renderWithToaster(<CopyAddress address={TEST_ADDRESS} />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(TEST_ADDRESS) })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
      expect(
        screen.getByText("Address copied to clipboard.")
      ).toBeInTheDocument();
    });
  });

  it("shows an error toast when the Clipboard API rejects", async () => {
    mockClipboard({
      writeText: jest.fn().mockRejectedValue(new Error("NotAllowedError")),
    });

    renderWithToaster(<CopyAddress address={TEST_ADDRESS} />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(TEST_ADDRESS) })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Failed to copy")).toBeInTheDocument();
    });
  });

  it("shows an error toast when the Clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    renderWithToaster(<CopyAddress address={TEST_ADDRESS} />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(TEST_ADDRESS) })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Copy not supported")).toBeInTheDocument();
    });
  });

  // ── Screen-reader live region ──────────────────────────────────────────────

  it("announces 'Address copied to clipboard' via the aria-live region after copy", async () => {
    mockClipboard();
    renderWithToaster(<CopyAddress address={TEST_ADDRESS} />);

    // Initially the live region should be empty.
    const liveRegion = screen.getByText("", {
      selector: "[aria-live='polite']",
    });
    expect(liveRegion).toBeEmptyDOMElement();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(TEST_ADDRESS) })
      );
    });

    expect(liveRegion).toHaveTextContent("Address copied to clipboard");
  });
});
