/**
 * @jest-environment jsdom
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  DEFAULT_TOAST_DURATION_MS,
  MAX_VISIBLE_TOASTS,
  ToastProvider,
} from "./ToastProvider";
import { useToast } from "../hooks/useToast";

function ToastHarness() {
  const { toast, dismiss, dismissAll, success, error, warning, info } = useToast();

  return (
    <div>
      <button
        type="button"
        onClick={() => toast({ message: "Generic toast", severity: "info" })}
      >
        Show generic
      </button>
      <button type="button" onClick={() => success("Saved successfully")}>
        Show success
      </button>
      <button type="button" onClick={() => error("Something failed")}>
        Show error
      </button>
      <button type="button" onClick={() => warning("Check your input")}>
        Show warning
      </button>
      <button type="button" onClick={() => info("Heads up")}>
        Show info
      </button>
      <button
        type="button"
        onClick={() =>
          toast({
            message: "Retry available",
            severity: "error",
            action: { label: "Retry", onClick: jest.fn() },
          })
        }
      >
        Show action toast
      </button>
      <button type="button" onClick={() => dismiss("missing-id")}>
        Dismiss missing
      </button>
      <button type="button" onClick={() => dismissAll()}>
        Dismiss all
      </button>
      <button
        type="button"
        onClick={() => {
          for (let index = 0; index < MAX_VISIBLE_TOASTS + 2; index += 1) {
            toast({ message: `Toast ${index + 1}`, severity: "info" });
          }
        }}
      >
        Flood queue
      </button>
    </div>
  );
}

function renderToastHarness() {
  return render(
    <ToastProvider>
      <ToastHarness />
    </ToastProvider>
  );
}

describe("ToastProvider", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("enqueues a toast with role=status and aria-live polite", () => {
    renderToastHarness();

    fireEvent.click(screen.getByRole("button", { name: /show generic/i }));

    const toast = screen.getByRole("status");
    expect(toast).toHaveAttribute("aria-live", "polite");
    expect(toast).toHaveAttribute("aria-atomic", "true");
    expect(screen.getByText("Generic toast")).toBeInTheDocument();
  });

  it("renders severity-specific icons and styles", () => {
    renderToastHarness();

    fireEvent.click(screen.getByRole("button", { name: /show success/i }));
    fireEvent.click(screen.getByRole("button", { name: /show error/i }));
    fireEvent.click(screen.getByRole("button", { name: /show warning/i }));
    fireEvent.click(screen.getByRole("button", { name: /show info/i }));

    expect(screen.getByText("Saved successfully").closest("[data-severity='success']")).toBeTruthy();
    expect(screen.getByText("Something failed").closest("[data-severity='error']")).toBeTruthy();
    expect(screen.getByText("Check your input").closest("[data-severity='warning']")).toBeTruthy();
    expect(screen.getByText("Heads up").closest("[data-severity='info']")).toBeTruthy();
  });

  it("dismisses a toast manually and via action click", () => {
    renderToastHarness();

    fireEvent.click(screen.getByRole("button", { name: /show action toast/i }));
    expect(screen.getByText("Retry available")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(screen.queryByText("Retry available")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show generic/i }));
    fireEvent.click(screen.getByRole("button", { name: /dismiss notification/i }));
    expect(screen.queryByText("Generic toast")).not.toBeInTheDocument();
  });

  it("auto-dismisses after the configured duration", () => {
    renderToastHarness();

    fireEvent.click(screen.getByRole("button", { name: /show generic/i }));
    expect(screen.getByText("Generic toast")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS + 100);
    });

    expect(screen.queryByText("Generic toast")).not.toBeInTheDocument();
  });

  it("limits visible toasts and reveals queued toasts after dismiss", () => {
    renderToastHarness();

    fireEvent.click(screen.getByRole("button", { name: /flood queue/i }));

    expect(screen.getAllByTestId("toast-item")).toHaveLength(MAX_VISIBLE_TOASTS);
    expect(screen.getByText(`Toast ${MAX_VISIBLE_TOASTS}`)).toBeInTheDocument();
    expect(screen.queryByText(`Toast ${MAX_VISIBLE_TOASTS + 1}`)).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /dismiss notification/i })[0]);

    expect(screen.getByText(`Toast ${MAX_VISIBLE_TOASTS + 1}`)).toBeInTheDocument();
    expect(screen.getAllByTestId("toast-item")).toHaveLength(MAX_VISIBLE_TOASTS);
  });

  it("clears all toasts", () => {
    renderToastHarness();

    fireEvent.click(screen.getByRole("button", { name: /show success/i }));
    fireEvent.click(screen.getByRole("button", { name: /show error/i }));
    fireEvent.click(screen.getByRole("button", { name: /dismiss all/i }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("useToast", () => {
  it("throws when used outside ToastProvider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<ToastHarness />)).toThrow(
      "useToast must be used within a ToastProvider"
    );

    consoleError.mockRestore();
  });
});
