import { render, screen } from "@testing-library/react";
import { LiveTicker } from "../LiveTicker";
import "@testing-library/jest-dom";

const setReducedMotion = (matches: boolean) => {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)" ? matches : false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
};

describe("LiveTicker", () => {
  beforeEach(() => {
    setReducedMotion(false);
  });

  describe("Normal Motion", () => {
    it("renders the continuous marquee container when reduced motion is disabled", () => {
      render(<LiveTicker />);
      
      const tickerContainer = screen.getByTestId("live-ticker-marquee");
      expect(tickerContainer).toBeInTheDocument();
      expect(tickerContainer).toHaveAttribute("aria-hidden", "true");
      
      const marqueeElements = document.querySelectorAll(".animate-marquee");
      expect(marqueeElements.length).toBeGreaterThanOrEqual(2);
    });

    it("displays the mock events", () => {
      render(<LiveTicker />);
      const events = screen.getAllByText(/User 0x4F\.\.\. placed 500 XLM/i);
      expect(events.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Reduced Motion", () => {
    it("falls back to a static accessible region when reduced motion is enabled", () => {
      setReducedMotion(true);
      render(<LiveTicker />);
      
      expect(screen.queryByTestId("live-ticker-marquee")).not.toBeInTheDocument();
      
      const region = screen.getByRole("region", { name: "Recent Market Activity" });
      expect(region).toBeInTheDocument();
      
      const eventText = screen.getByText(/User 0x4F\.\.\. placed 500 XLM/i);
      expect(eventText).toBeInTheDocument();
      
      const staticLabel = screen.getByText(/Live Activity:/i);
      expect(staticLabel).toBeInTheDocument();
    });
  });
});
