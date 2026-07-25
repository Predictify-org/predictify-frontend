import React from "react";
import { render, screen, act } from "@testing-library/react";
import { CountdownChip, calculateTimeRemaining } from "../CountdownChip";

describe("CountdownChip", () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it("renders with static timeLeft prop", () => {
    render(<CountdownChip timeLeft="3 days" label="Closes in" />);
    const timer = screen.getByRole("timer");
    expect(timer).toBeInTheDocument();
    expect(timer).toHaveTextContent("Closes in");
    expect(timer).toHaveTextContent("3 days");
    expect(timer).toHaveAttribute("aria-label", "Closes in: 3 days");
  });

  it("calculates time remaining accurately", () => {
    const future = new Date(Date.now() + (2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 15 * 60 * 1000 + 45 * 1000));
    const rem = calculateTimeRemaining(future);
    expect(rem.days).toBe(2);
    expect(rem.hours).toBe(3);
    expect(rem.minutes).toBe(15);
    expect(rem.seconds).toBe(45);
    expect(rem.isExpired).toBe(false);
  });

  it("renders live countdown with targetDate", () => {
    jest.useFakeTimers();
    const target = new Date(Date.now() + 5000); // 5 seconds ahead

    render(<CountdownChip targetDate={target} label="Time left" />);

    const timer = screen.getByRole("timer");
    expect(timer).toBeInTheDocument();
    expect(timer).toHaveTextContent("5s");

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(timer).toHaveTextContent("3s");
  });

  it("triggers onEnd callback when timer expires", () => {
    jest.useFakeTimers();
    const onEnd = jest.fn();
    const target = new Date(Date.now() + 2000);

    render(<CountdownChip targetDate={target} onEnd={onEnd} />);

    expect(onEnd).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onEnd).toHaveBeenCalled();
    expect(screen.getByRole("timer")).toHaveTextContent("Closed");
  });

  it("displays urgent visual status when target is less than 24 hours away", () => {
    const target = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours ahead
    render(<CountdownChip targetDate={target} />);

    const timer = screen.getByRole("timer");
    expect(timer).toHaveClass("text-amber-700");
    expect(screen.getByTestId("urgent-pulse-indicator")).toBeInTheDocument();
  });

  it("applies motion-safe classes for reduced motion compatibility", () => {
    const target = new Date(Date.now() + 10000);
    const { container } = render(<CountdownChip targetDate={target} />);

    const pingDot = container.querySelector(".motion-safe\\:animate-ping");
    expect(pingDot).toBeInTheDocument();
  });

  it("renders custom variants and accepts custom className", () => {
    const { container } = render(
      <CountdownChip timeLeft="12 hours" variant="hero" className="my-custom-countdown" />
    );

    const timer = screen.getByRole("timer");
    expect(timer).toHaveClass("my-custom-countdown");
    expect(timer).toHaveClass("text-body-md");
  });

  it("hides icon when showIcon is false", () => {
    const { container } = render(<CountdownChip timeLeft="1 day" showIcon={false} />);
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });
});
