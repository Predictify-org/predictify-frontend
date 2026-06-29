/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StreamPreview, computeTotal, type StreamPreviewData } from "./StreamPreview";

const BASE: StreamPreviewData = {
  recipient: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW",
  rate: "10",
  schedule: "day",
  durationIntervals: 7,
  token: "XLM",
  gasOnRecipient: false,
};

describe("computeTotal", () => {
  it("multiplies rate by duration", () => {
    expect(computeTotal("10", 7)).toBe("70");
  });

  it("respects Stellar 7-dp precision and trims trailing zeros", () => {
    expect(computeTotal("0.1", 3)).toBe("0.3");
  });

  it("returns a dash for invalid or non-positive rates", () => {
    expect(computeTotal("abc", 7)).toBe("—");
    expect(computeTotal("0", 7)).toBe("—");
    expect(computeTotal("10", 0)).toBe("—");
  });
});

describe("StreamPreview", () => {
  it("renders a labelled review region with the computed total", () => {
    render(<StreamPreview data={BASE} />);
    expect(screen.getByRole("group", { name: /review your stream/i })).toBeInTheDocument();
    expect(screen.getByText(/70 XLM/)).toBeInTheDocument();
  });

  it("shortens the recipient address but keeps the full value in the title", () => {
    render(<StreamPreview data={BASE} />);
    const dd = screen.getByText(/GABCDE…UVW/);
    expect(dd).toHaveAttribute("title", BASE.recipient);
  });

  it("pluralises the duration correctly", () => {
    const { rerender } = render(<StreamPreview data={{ ...BASE, durationIntervals: 1 }} />);
    expect(screen.getByText("1 day")).toBeInTheDocument();

    rerender(<StreamPreview data={{ ...BASE, durationIntervals: 7 }} />);
    expect(screen.getByText("7 days")).toBeInTheDocument();
  });

  it("shows who pays gas", () => {
    const { rerender } = render(<StreamPreview data={{ ...BASE, gasOnRecipient: true }} />);
    expect(screen.getByText(/recipient/i)).toBeInTheDocument();

    rerender(<StreamPreview data={{ ...BASE, gasOnRecipient: false }} />);
    expect(screen.getByText(/you \(sender\)/i)).toBeInTheDocument();
  });
});
