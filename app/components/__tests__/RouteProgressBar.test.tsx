import { render, screen } from "@testing-library/react";
import { usePathname, useSearchParams } from "next/navigation";
import { RouteProgressBar } from "../RouteProgressBar";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe("RouteProgressBar", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (usePathname as jest.Mock).mockReturnValue("/");
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("appears during route changes and disappears after the transition completes", () => {
    const { rerender } = render(<RouteProgressBar />);

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    (usePathname as jest.Mock).mockReturnValue("/markets");
    rerender(<RouteProgressBar />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "20");

    jest.advanceTimersByTime(150);
    expect(bar).toHaveAttribute("aria-valuenow", "70");

    jest.advanceTimersByTime(250);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
