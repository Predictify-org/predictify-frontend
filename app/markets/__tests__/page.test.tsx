import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import MarketsPage from "../page";

// ── next/navigation ────────────────────────────────────────────────────────
// The page syncs filters to the URL via router.replace; capture the calls and
// drive the initial query string from `mockSearchParams`.
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, prefetch: jest.fn() }),
  usePathname: () => "/markets",
  useSearchParams: () => mockSearchParams,
}));

// ── live region ────────────────────────────────────────────────────────────
// The real hook is a module-level store; stubbing it keeps the assertion on the
// announcement payload local to this suite.
const mockAnnounce = jest.fn();
jest.mock("@/hooks/use-global-live-region", () => ({
  useGlobalLiveRegion: () => ({ announcements: [], announce: mockAnnounce }),
}));

// next/link needs a router in tests
jest.mock("next/link", () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

beforeEach(() => {
  mockReplace.mockClear();
  mockPush.mockClear();
  mockAnnounce.mockClear();
  mockSearchParams = new URLSearchParams();
});

const searchbox = () => screen.getByRole("searchbox", { name: /search markets/i });

describe("MarketsPage — empty state", () => {
  it("renders markets when no filters are active", () => {
    render(<MarketsPage />);
    expect(screen.getByText(/will argentina win/i)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows empty state when search has no matches", async () => {
    const user = userEvent.setup();
    render(<MarketsPage />);

    await user.type(searchbox(), "zzznomatch");

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/no markets match your search/i)).toBeInTheDocument();
  });

  it("clears filters and restores results on 'Clear all filters' click", async () => {
    const user = userEvent.setup();
    render(<MarketsPage />);

    await user.type(searchbox(), "zzznomatch");
    expect(screen.getByRole("status")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear all filters/i }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(/will argentina win/i)).toBeInTheDocument();
    expect(searchbox()).toHaveValue("");
  });

  it("empty state has role=status and aria-live=polite for accessibility", async () => {
    const user = userEvent.setup();
    render(<MarketsPage />);

    await user.type(searchbox(), "zzznomatch");

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});

describe("MarketsPage — URL-backed filters", () => {
  it("hydrates search and category from the query string", () => {
    mockSearchParams = new URLSearchParams("q=argentina&category=Football");

    render(<MarketsPage />);

    expect(searchbox()).toHaveValue("argentina");
    expect(screen.getByRole("combobox", { name: /filter by category/i })).toHaveTextContent(
      "Football",
    );
    expect(screen.getByText(/will argentina win/i)).toBeInTheDocument();
    expect(screen.queryByText(/will brazil reach/i)).not.toBeInTheDocument();
  });

  it("falls back to 'all' for an unknown category param instead of hiding every market", () => {
    mockSearchParams = new URLSearchParams("category=NotARealCategory");

    render(<MarketsPage />);

    expect(screen.getByRole("combobox", { name: /filter by category/i })).toHaveTextContent(
      /all categories/i,
    );
    expect(screen.getByText(/will argentina win/i)).toBeInTheDocument();
    expect(screen.getByText(/will brazil reach/i)).toBeInTheDocument();
  });

  it("writes ?q= with router.replace after the search debounce, never router.push", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: (ms: number) => jest.advanceTimersByTime(ms) });
    try {
      render(<MarketsPage />);

      await user.type(searchbox(), "argentina");
      // Still inside the debounce window: no URL write yet.
      expect(mockReplace).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace.mock.calls[0][0]).toBe("/markets?q=argentina");
      expect(mockPush).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("clears the query string immediately when the empty-state button resets filters", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: (ms: number) => jest.advanceTimersByTime(ms) });
    try {
      mockSearchParams = new URLSearchParams("q=zzznomatch&category=Football");
      render(<MarketsPage />);

      expect(screen.getByRole("status")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /clear all filters/i }));

      expect(mockReplace).toHaveBeenCalledWith("/markets", { scroll: false });
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("MarketsPage — result announcements", () => {
  it("announces the matching count politely, once per change", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: (ms: number) => jest.advanceTimersByTime(ms) });
    try {
      render(<MarketsPage />);

      // The initial render is not a change, so the live region stays quiet.
      expect(mockAnnounce).not.toHaveBeenCalled();

      await user.type(searchbox(), "arg");

      expect(mockAnnounce).toHaveBeenCalledTimes(1);
      expect(mockAnnounce).toHaveBeenCalledWith({
        message: "1 market found",
        priority: "polite",
      });

      // A trailing space trims to the same query: the count is unchanged, so
      // there must be no second announcement.
      await user.type(searchbox(), " ");
      await waitFor(() => expect(searchbox()).toHaveValue("arg "));
      expect(mockAnnounce).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
