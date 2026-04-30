import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import SplashScreen from "./SplashScreen";

describe("SplashScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the splash screen with logo, title, and tagline", () => {
    render(<SplashScreen />);

    expect(screen.getByAltText("StreamPay logo")).toBeInTheDocument();
    expect(screen.getByText("Stream")).toBeInTheDocument();
    expect(screen.getByText("Pay")).toBeInTheDocument();
    expect(
      screen.getByText("Real-time payments on Stellar")
    ).toBeInTheDocument();
  });

  it("has accessible loading status role", () => {
    render(<SplashScreen />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Loading StreamPay"
    );
  });

  it("adds exit class after display duration", () => {
    render(<SplashScreen />);
    const splash = screen.getByRole("status");

    expect(splash).not.toHaveClass("splash-screen--exit");

    act(() => {
      jest.advanceTimersByTime(2400);
    });

    expect(splash).toHaveClass("splash-screen--exit");
  });

  it("unmounts after fade-out transition completes", () => {
    render(<SplashScreen />);

    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2400 + 600);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders three decorative background orbs", () => {
    const { container } = render(<SplashScreen />);
    const orbs = container.querySelectorAll(".splash-orb");
    expect(orbs).toHaveLength(3);

    orbs.forEach((orb) => {
      expect(orb).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("renders the loading bar indicator", () => {
    const { container } = render(<SplashScreen />);
    expect(container.querySelector(".splash-loader")).toBeInTheDocument();
    expect(container.querySelector(".splash-loader__bar")).toBeInTheDocument();
  });
});
