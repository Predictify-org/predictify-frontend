import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OddsHistoryChart } from "../OddsHistoryChart";
import type { OddsPoint } from "@/lib/market-history";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("recharts", () => {
  const actual = jest.requireActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 600, height: 256 }}>
        {children}
      </div>
    ),
  };
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
});

const mockPush = jest.fn();

function mockMatchMedia(prefersReducedMotion = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: prefersReducedMotion && query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMatchMedia(false);
  (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  (usePathname as jest.Mock).mockReturnValue("/markets/test-market");
  (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams("tab=odds"));
});

const SAMPLE_SERIES: OddsPoint[] = [
  { t: Date.UTC(2026, 5, 1, 0, 0), probability: 40 },
  { t: Date.UTC(2026, 5, 2, 0, 0), probability: 55.5 },
  { t: Date.UTC(2026, 5, 3, 0, 0), probability: 62 },
];

describe("OddsHistoryChart", () => {
  it("defaults to 7D range and renders chart summary and accessible data table", async () => {
    const fetchHistory = jest.fn().mockResolvedValue(SAMPLE_SERIES);
    render(<OddsHistoryChart marketId="test-market" fetchHistory={fetchHistory} />);

    const radio7D = screen.getByRole("radio", { name: "7D" });
    expect(radio7D).toHaveAttribute("aria-checked", "true");

    await waitFor(() => {
      expect(fetchHistory).toHaveBeenCalledWith("test-market", "7D", undefined);
    });

    const region = await screen.findByRole("region", {
      name: /Odds history chart \(7D\): start 40\.0%, end 62\.0%, min 40\.0%, max 62\.0%\./i,
    });
    expect(region).toBeInTheDocument();

    // Accessible data table is present in the DOM for screen readers
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(screen.getByText("40.0%")).toBeInTheDocument();
    expect(screen.getByText("55.5%")).toBeInTheDocument();
  });

  it("falls back to 7D when URL range param is invalid", async () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("tab=odds&range=99Y")
    );
    const fetchHistory = jest.fn().mockResolvedValue(SAMPLE_SERIES);
    render(<OddsHistoryChart marketId="test-market" fetchHistory={fetchHistory} />);

    expect(screen.getByRole("radio", { name: "7D" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await waitFor(() => {
      expect(fetchHistory).toHaveBeenCalledWith("test-market", "7D", undefined);
    });
  });

  it("updates URL with selected range while preserving ?tab=", async () => {
    const user = userEvent.setup();
    const fetchHistory = jest.fn().mockResolvedValue(SAMPLE_SERIES);
    render(<OddsHistoryChart marketId="test-market" fetchHistory={fetchHistory} />);

    await screen.findByRole("table");
    await user.click(screen.getByRole("radio", { name: "30D" }));

    expect(mockPush).toHaveBeenCalledWith(
      "/markets/test-market?tab=odds&range=30D",
      { scroll: false }
    );
  });

  it("supports keyboard navigation across the range radiogroup", async () => {
    const user = userEvent.setup();
    const fetchHistory = jest.fn().mockResolvedValue(SAMPLE_SERIES);
    render(<OddsHistoryChart marketId="test-market" fetchHistory={fetchHistory} />);

    const radio7D = screen.getByRole("radio", { name: "7D" });
    radio7D.focus();
    await user.keyboard("{ArrowRight}");

    expect(mockPush).toHaveBeenCalledWith(
      "/markets/test-market?tab=odds&range=30D",
      { scroll: false }
    );
  });

  it("toggles visual data table visibility", async () => {
    const user = userEvent.setup();
    const fetchHistory = jest.fn().mockResolvedValue(SAMPLE_SERIES);
    render(<OddsHistoryChart marketId="test-market" fetchHistory={fetchHistory} />);

    const toggleBtn = await screen.findByRole("button", {
      name: /show data table/i,
    });
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");

    await user.click(toggleBtn);
    expect(
      screen.getByRole("button", { name: /hide data table/i })
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("shows empty state for empty series or unknown market id", async () => {
    const fetchHistory = jest.fn().mockResolvedValue([]);
    render(<OddsHistoryChart marketId="not-found" fetchHistory={fetchHistory} />);

    expect(
      await screen.findByText(/no odds history available/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows error state and retries when Try again is clicked", async () => {
    const user = userEvent.setup();
    const fetchHistory = jest
      .fn()
      .mockRejectedValueOnce(new Error("Network offline"))
      .mockResolvedValueOnce(SAMPLE_SERIES);

    render(<OddsHistoryChart marketId="test-market" fetchHistory={fetchHistory} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to load odds history/i
    );
    expect(screen.getByText("Network offline")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));
    await waitFor(() => {
      expect(fetchHistory).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });

  it("renders single data point and flat series cleanly", async () => {
    const singlePoint: OddsPoint[] = [
      { t: Date.UTC(2026, 5, 1, 12, 0), probability: 50 },
    ];
    const fetchHistory = jest.fn().mockResolvedValue(singlePoint);
    render(<OddsHistoryChart marketId="single-pt" fetchHistory={fetchHistory} />);

    expect(
      await screen.findByRole("region", {
        name: /start 50\.0%, end 50\.0%, min 50\.0%, max 50\.0%/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/0\.0% \(7D\)/i)).toBeInTheDocument();
  });

  it("respects prefers-reduced-motion during loading state", () => {
    mockMatchMedia(true);
    const pending = new Promise<OddsPoint[]>(() => {});
    const fetchHistory = jest.fn().mockReturnValue(pending);
    render(<OddsHistoryChart marketId="test-market" fetchHistory={fetchHistory} />);

    const status = screen.getByRole("status", { name: /loading odds history/i });
    expect(status.querySelector(".animate-pulse")).toBeNull();
  });
});
