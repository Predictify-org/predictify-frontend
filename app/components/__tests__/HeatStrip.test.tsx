import React from "react"
import { render, screen } from "@testing-library/react"
import { HeatStrip } from "../HeatStrip"

const SAMPLE_24H = [
  12, 8, 5, 3, 2, 4, 10, 22, 45, 68, 82, 90,
  95, 88, 92, 85, 72, 65, 58, 50, 42, 35, 28, 18,
]

describe("HeatStrip", () => {
  it("renders 24 blocks for 24 data points", () => {
    const { container } = render(<HeatStrip data={SAMPLE_24H} />)
    const blocks = container.querySelectorAll("div[style]")
    expect(blocks.length).toBe(24)
  })

  it("returns null for empty data array", () => {
    const { container } = render(<HeatStrip data={[]} />)
    expect(container.innerHTML).toBe("")
  })

  it("returns null for nullish data", () => {
    const { container } = render(<HeatStrip data={null as unknown as number[]} />)
    expect(container.innerHTML).toBe("")
  })

  it("returns null for undefined data", () => {
    const { container } = render(<HeatStrip data={undefined as unknown as number[]} />)
    expect(container.innerHTML).toBe("")
  })

  it("has a semantic role of img", () => {
    render(<HeatStrip data={SAMPLE_24H} />)
    expect(screen.getByRole("img")).toBeInTheDocument()
  })

  it("has an aria-label describing 24-hour activity", () => {
    render(<HeatStrip data={SAMPLE_24H} />)
    const el = screen.getByRole("img")
    expect(el).toHaveAttribute("aria-label")
    expect(el.getAttribute("aria-label")).toContain("24-hour activity")
    expect(el.getAttribute("aria-label")).toContain("Hour 1: 12%")
  })

  it("contains a screen-reader-only summary", () => {
    render(<HeatStrip data={SAMPLE_24H} />)
    expect(screen.getByText(/24-hour activity heat map/i)).toBeInTheDocument()
    expect(screen.getByText(/Values range from/i)).toHaveClass("sr-only")
  })

  it("normalizes out-of-range and invalid values before rendering", () => {
    const { container } = render(<HeatStrip data={[120, -10, Number.NaN, 42]} />)
    const blocks = container.querySelectorAll("div[style]")
    expect(blocks).toHaveLength(3)
  })

  it("applies custom className", () => {
    const { container } = render(
      <HeatStrip data={SAMPLE_24H} className="my-custom-class" />,
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain("my-custom-class")
  })

  it("applies data-testid attribute", () => {
    render(<HeatStrip data={SAMPLE_24H} data-testid="heat-strip-test" />)
    expect(screen.getByTestId("heat-strip-test")).toBeInTheDocument()
  })
})
