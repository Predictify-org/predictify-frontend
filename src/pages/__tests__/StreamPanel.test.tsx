import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StreamPanel, StreamStatus } from "../StreamPanel";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const STATUSES: StreamStatus[] = [
  "connected",
  "connecting",
  "disconnected",
  "reconnecting",
  "error",
];

describe("StreamPanel Aria-Live Region", () => {
  it.each(STATUSES)(
    'announces stream status "%s" via aria-live polite region',
    (status) => {
      render(<StreamPanel status={status} />);
      act(() => jest.advanceTimersByTime(50));
      const region = screen.getByRole("status");
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute("aria-live", "polite");
      expect(region).toHaveAttribute("aria-atomic", "true");
      expect(region).toHaveClass("sr-only");
    }
  );

  it.each([
    ["connected", "Stream connected"],
    ["connecting", "Stream connecting"],
    ["disconnected", "Stream disconnected"],
    ["reconnecting", "Stream reconnecting"],
    ["error", "Stream error"],
  ] as [StreamStatus, string][])(
    'renders the message "%s" for status "%s"',
    (status, expectedMessage) => {
      render(<StreamPanel status={status} />);
      act(() => jest.advanceTimersByTime(50));
      const region = screen.getByRole("status");
      expect(region).toHaveTextContent(expectedMessage);
    }
  );
});

describe("StreamPanel Visual Rendering", () => {
  it("renders the status label text", () => {
    render(<StreamPanel status="connected" />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("renders a custom label when provided", () => {
    render(<StreamPanel status="connected" label="My Stream" />);
    expect(screen.getByText("My Stream")).toBeInTheDocument();
  });

  it("has a status indicator dot with aria-hidden", () => {
    render(<StreamPanel status="connected" />);
    const dot = document.querySelector(".stream-panel span[aria-hidden='true']");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("rounded-full");
  });

  it("applies correct color class for each status", () => {
    const colorMap: Record<StreamStatus, string> = {
      connected: "bg-green-500",
      connecting: "bg-yellow-500",
      disconnected: "bg-gray-400",
      reconnecting: "bg-blue-500",
      error: "bg-red-500",
    };

    for (const status of STATUSES) {
      const { unmount } = render(<StreamPanel status={status} />);
      const dot = document.querySelector(
        ".stream-panel span[aria-hidden='true']"
      );
      expect(dot).toHaveClass(colorMap[status]);
      unmount();
    }
  });
});

describe("StreamPanel Accessibility (WCAG 2.1 AA)", () => {
  it("has role='status' for assistive technology", () => {
    render(<StreamPanel status="error" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("announces status changes without stealing focus", () => {
    const { rerender } = render(<StreamPanel status="connecting" />);
    act(() => jest.advanceTimersByTime(50));
    expect(screen.getByRole("status")).toHaveTextContent("Stream connecting");

    rerender(<StreamPanel status="connected" />);
    act(() => jest.advanceTimersByTime(50));
    expect(screen.getByRole("status")).toHaveTextContent("Stream connected");

    rerender(<StreamPanel status="error" />);
    act(() => jest.advanceTimersByTime(50));
    expect(screen.getByRole("status")).toHaveTextContent("Stream error");
  });
});
