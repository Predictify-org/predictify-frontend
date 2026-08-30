import { render, screen } from "@testing-library/react"
import { Badge } from "../badge"

describe("Badge Component", () => {
  it("renders with default variant and default md size", () => {
    render(<Badge>Default Badge</Badge>)
    const badge = screen.getByText("Default Badge")
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass("bg-primary")
    expect(badge).toHaveClass("text-xs")
  })

  it.each([
    ["info", "bg-blue-500/10"],
    ["success", "bg-green-500/10"],
    ["warning", "bg-amber-500/10"],
    ["danger", "bg-red-500/10"],
    ["neutral", "bg-slate-500/10"],
  ])("applies correct styles for variant %s", (variant, expectedClass) => {
    render(<Badge variant={variant as any}>Badge</Badge>)
    const badge = screen.getByText("Badge")
    expect(badge).toHaveClass(expectedClass)
  })

  it.each([
    ["sm", "text-[10px]"],
    ["md", "text-xs"],
    ["lg", "text-sm"],
  ])("applies correct styles for size %s", (size, expectedClass) => {
    render(<Badge size={size as any}>Badge</Badge>)
    const badge = screen.getByText("Badge")
    expect(badge).toHaveClass(expectedClass)
  })
})
