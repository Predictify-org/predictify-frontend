/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StreamProgress } from "./StreamProgress";

/** Installs a matchMedia mock that reports the given reduced-motion preference. */
function mockMatchMedia(prefersReduced: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? prefersReduced : false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

describe("StreamProgress reduced-motion fallback", () => {
  afterEach(() => {
    // @ts-expect-error reset between tests
    delete window.matchMedia;
  });

  it("animates the fill when reduced motion is not requested", () => {
    mockMatchMedia(false);
    render(<StreamProgress status="active" accruedAmount={50} totalAmount={100} />);

    const bar = screen.getByRole("progressbar");
    expect(bar.parentElement).toHaveClass("stream-progress--animated");
    expect(bar.parentElement).toHaveAttribute("data-reduced-motion", "false");

    const fill = bar.querySelector(".stream-progress__fill") as HTMLElement;
    expect(fill.style.transition).toBe("width 400ms ease");
  });

  it("renders a static fill when reduced motion is requested", () => {
    mockMatchMedia(true);
    render(<StreamProgress status="active" accruedAmount={50} totalAmount={100} />);

    const bar = screen.getByRole("progressbar");
    expect(bar.parentElement).toHaveClass("stream-progress--static");
    expect(bar.parentElement).toHaveAttribute("data-reduced-motion", "true");

    const fill = bar.querySelector(".stream-progress__fill") as HTMLElement;
    expect(fill.style.transition).toBe("none");
    // The fill is still positioned to reflect progress — only the motion is removed.
    expect(fill.style.width).toBe("50%");
  });

  it("preserves the accessible progress value regardless of motion preference", () => {
    mockMatchMedia(true);
    render(<StreamProgress status="active" accruedAmount={25} totalAmount={100} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
  });
});
