/**
 * @jest-environment jsdom
 */

import { act, render, screen } from "@testing-library/react";
import ActivityPage from "./page";

// Fake timers let us control setTimeout without actually waiting.
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe("ActivityPage", () => {
  it("shows the loading skeleton while data is fetching", () => {
    render(<ActivityPage />);

    // Skeleton is aria-hidden so we find it by the sr-only live region text.
    expect(screen.getByText(/loading activity feed/i)).toBeInTheDocument();
  });

  it("renders the page heading and description", () => {
    render(<ActivityPage />);

    expect(
      screen.getByRole("heading", { name: /track every event/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/every transaction, status update/i),
    ).toBeInTheDocument();
  });

  it("renders the activity feed heading", () => {
    render(<ActivityPage />);

    expect(
      screen.getByRole("heading", { name: /activity feed/i }),
    ).toBeInTheDocument();
  });

  it("transitions to the populated state after the simulated load", async () => {
    render(<ActivityPage />);

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(
      screen.getByText(/new stream created for project alpha/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/wallet connected/i)).toBeInTheDocument();
    expect(screen.getByText(/design retainer stream settled/i)).toBeInTheDocument();
  });

  it("shows timeline date groups once populated", async () => {
    render(<ActivityPage />);

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
  });

  it("uses aria-busy=true on the feed section while loading", () => {
    render(<ActivityPage />);

    const section = screen.getByRole("region", { name: /activity feed/i });
    expect(section).toHaveAttribute("aria-busy", "true");
  });

  it("clears aria-busy once data is loaded", async () => {
    render(<ActivityPage />);

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    const section = screen.getByRole("region", { name: /activity feed/i });
    expect(section).toHaveAttribute("aria-busy", "false");
  });

  it("cleans up the timeout on unmount during loading", () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    const { unmount } = render(<ActivityPage />);
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
