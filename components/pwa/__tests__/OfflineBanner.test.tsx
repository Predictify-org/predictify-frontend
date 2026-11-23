import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OfflineBanner } from "../OfflineBanner";

vi.mock("@/hooks/use-global-live-region", () => ({
  announce: vi.fn(),
}));

describe("OfflineBanner", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("renders nothing when online", () => {
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the banner when offline event fires", () => {
    render(<OfflineBanner />);
    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it("hides the banner when online event fires after offline", () => {
    render(<OfflineBanner />);
    act(() => { window.dispatchEvent(new Event("offline")); });
    act(() => { window.dispatchEvent(new Event("online")); });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows banner immediately when mounted offline", () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    render(<OfflineBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
