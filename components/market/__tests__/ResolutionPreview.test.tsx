import React from "react";
import { render, screen } from "@testing-library/react";
import { ResolutionPreview } from "../ResolutionPreview";

function buildData(
  probs: number[],
  baseTime = 1700000000000,
  intervalMs = 86400000
) {
  return probs.map((probability, i) => ({
    timestamp: baseTime + i * intervalMs,
    probability,
  }));
}

describe("ResolutionPreview", () => {
  it("renders with default mock data", () => {
    render(<ResolutionPreview />);
    expect(
      screen.getByRole("img", { name: /resolution preview/i })
    ).toBeInTheDocument();
  });

  it("renders with provided data", () => {
    const data = buildData([0.5, 0.55, 0.53, 0.58, 0.56]);
    render(<ResolutionPreview data={data} />);
    expect(
      screen.getByRole("img", { name: /resolution preview/i })
    ).toBeInTheDocument();
  });

  it("renders aria-label with high, low, current", () => {
    const data = buildData([0.2, 0.5, 0.8]);
    render(<ResolutionPreview data={data} />);
    const chart = screen.getByRole("img", { name: /resolution preview/i });
    expect(chart).toHaveAttribute(
      "aria-label",
      expect.stringContaining("high 80.0%")
    );
    expect(chart).toHaveAttribute(
      "aria-label",
      expect.stringContaining("low 20.0%")
    );
    expect(chart).toHaveAttribute(
      "aria-label",
      expect.stringContaining("current 80.0%")
    );
  });

  it("renders screen reader summary", () => {
    const data = buildData([0.3, 0.4, 0.35]);
    render(<ResolutionPreview data={data} />);
    expect(
      screen.getByText(/probability path/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/high: 40\.0%/i)).toBeInTheDocument();
    expect(screen.getByText(/low: 30\.0%/i)).toBeInTheDocument();
    expect(screen.getByText(/current: 35\.0%/i)).toBeInTheDocument();
  });

  it("handles single data point", () => {
    const data = buildData([0.75]);
    render(<ResolutionPreview data={data} />);
    const chart = screen.getByRole("img", { name: /resolution preview/i });
    expect(chart).toHaveAttribute(
      "aria-label",
      expect.stringContaining("high 75.0%")
    );
    expect(chart).toHaveAttribute(
      "aria-label",
      expect.stringContaining("low 75.0%")
    );
    expect(chart).toHaveAttribute(
      "aria-label",
      expect.stringContaining("current 75.0%")
    );
  });

  it("handles all-zero probabilities", () => {
    const data = buildData([0, 0, 0, 0, 0]);
    render(<ResolutionPreview data={data} />);
    const chart = screen.getByRole("img", { name: /resolution preview/i });
    expect(chart).toHaveAttribute(
      "aria-label",
      expect.stringContaining("high 0.0%")
    );
    expect(chart).toHaveAttribute(
      "aria-label",
      expect.stringContaining("low 0.0%")
    );
  });

  it("handles flat probability line", () => {
    const data = buildData([0.5, 0.5, 0.5, 0.5, 0.5]);
    render(<ResolutionPreview data={data} />);
    const chart = screen.getByRole("img", { name: /resolution preview/i });
    expect(chart).toHaveAttribute(
      "aria-label",
      expect.stringContaining("high 50.0%")
    );
    expect(chart).toHaveAttribute(
      "aria-label",
      expect.stringContaining("low 50.0%")
    );
  });

  it("handles empty data array", () => {
    render(<ResolutionPreview data={[]} />);
    const chart = screen.getByRole("img", { name: /resolution preview/i });
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAttribute(
      "aria-label",
      expect.stringContaining("high 0.0%")
    );
  });

  it("applies custom className", () => {
    const { container } = render(
      <ResolutionPreview data={buildData([0.5])} className="my-custom-class" />
    );
    const div = container.querySelector('[role="img"]');
    expect(div).toHaveClass("my-custom-class");
  });
});
