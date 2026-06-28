import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Input } from "../input"

/* Helper to narrow the return type for floating-layout assertions */
function getLabel(input: HTMLElement): HTMLElement | null {
  const id = input.getAttribute("id")
  return id ? screen.queryByLabelText(new RegExp(`^${id}$`)) : null
}

describe("Input – default variant", () => {
  it("renders a plain <input> with no wrapper", () => {
    const { container } = render(<Input placeholder="test" />)
    const input = container.querySelector("input")
    expect(input).toBeInTheDocument()
    // No parent <div> wrapper from the floating branch
    expect(container.children[0]?.tagName).toBe("INPUT")
  })

  it("preserves original classes", () => {
    render(<Input data-testid="inp" />)
    const input = screen.getByTestId("inp")
    expect(input).toHaveClass("flex")
    expect(input).toHaveClass("h-10")
    expect(input).toHaveClass("rounded-md")
    expect(input).toHaveClass("border-input")
  })

  it("forwards ref to the <input> element", () => {
    const ref = { current: null as HTMLInputElement | null }
    render(<Input ref={ref} data-testid="inp" />)
    expect(ref.current).toBe(screen.getByTestId("inp"))
  })

  it("accepts additional className", () => {
    render(<Input className="extra-class" data-testid="inp" />)
    expect(screen.getByTestId("inp")).toHaveClass("extra-class")
  })
})

describe("Input – floating variant", () => {
  it("renders a Label associated with the input via htmlFor/id", () => {
    render(<Input variant="floating" label="Email" id="email" />)
    const input = screen.getByLabelText("Email")
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe("INPUT")
    expect(input).toHaveAttribute("id", "email")
  })

  it("positions the label with floating classes at rest", () => {
    render(<Input variant="floating" label="Name" />)
    const label = screen.getByText("Name")
    expect(label).toHaveClass("top-1/2")
    expect(label).toHaveClass("-translate-y-1/2")
    expect(label).toHaveClass("text-sm")
    expect(label).toHaveClass("text-muted-foreground")
  })

  it("has peer classes that float the label on focus/value", () => {
    render(<Input variant="floating" label="Name" />)
    const label = screen.getByText("Name")
    // These classes are always present; they activate when the peer input
    // is focused or has a non-empty value.
    expect(label).toHaveClass("peer-focus:top-1.5")
    expect(label).toHaveClass("peer-focus:text-xs")
    expect(label).toHaveClass("peer-focus:text-primary")
    expect(label).toHaveClass("peer-[:not(:placeholder-shown)]:top-1.5")
    expect(label).toHaveClass("peer-[:not(:placeholder-shown)]:text-xs")
    expect(label).toHaveClass("peer-[:not(:placeholder-shown)]:text-primary")
  })

  it("sets pointer-events-none on the label so clicks reach the input", () => {
    render(<Input variant="floating" label="Name" />)
    expect(screen.getByText("Name")).toHaveClass("pointer-events-none")
  })

  it("renders an animated underline indicator inside the container", () => {
    const { container } = render(<Input variant="floating" label="Name" />)
    const underline = container.querySelector("span[aria-hidden='true']")
    expect(underline).toBeInTheDocument()
    expect(underline).toHaveClass("peer-focus:w-full")
    expect(underline).toHaveClass("duration-200")
  })

  it("generates an id when none is passed", () => {
    render(<Input variant="floating" label="Auto ID" />)
    const input = screen.getByLabelText("Auto ID")
    expect(input).toHaveAttribute("id")
    expect(input.getAttribute("id")).toBeTruthy()
  })

  it("adds aria-invalid when error is set", () => {
    render(<Input variant="floating" label="Field" error="Required" />)
    expect(screen.getByLabelText("Field")).toHaveAttribute(
      "aria-invalid",
      "true",
    )
  })

  it("renders an error message below the input", () => {
    render(
      <Input variant="floating" label="Field" error="This field is required" />,
    )
    expect(screen.getByText("This field is required")).toBeInTheDocument()
    expect(screen.getByText("This field is required")).toHaveRole("alert")
  })
})

describe("Input – success / error state", () => {
  it("shows a green CheckCircle2 icon when success is true", () => {
    const { container } = render(
      <Input variant="floating" label="Field" success />,
    )
    const icon = container.querySelector(".text-green-500 svg")
    expect(icon).toBeInTheDocument()
  })

  it("shows a red XCircle icon when error is true", () => {
    const { container } = render(
      <Input variant="floating" label="Field" error />,
    )
    const icon = container.querySelector(".text-destructive svg")
    expect(icon).toBeInTheDocument()
  })

  it("does not render success icon for default variant", () => {
    const { container } = render(<Input success data-testid="inp" />)
    // default variant does not wrap — success is only for floating
    expect(container.querySelector(".text-green-500")).not.toBeInTheDocument()
  })
})

describe("Input – help tooltip", () => {
  it("renders a help button next to the label", () => {
    render(
      <Input variant="floating" label="Field" helpText="Some helpful info" />,
    )
    const btn = screen.getByLabelText("Some helpful info")
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute("type", "button")
    expect(btn).toHaveAttribute("tabindex", "0")
  })

  it("the help button can receive keyboard focus", async () => {
    const user = userEvent.setup()
    render(
      <Input variant="floating" label="Field" helpText="Helpful info" />,
    )
    const btn = screen.getByLabelText("Helpful info")
    // Input comes first in DOM order, so tab twice to reach the button
    await user.tab()
    await user.tab()
    expect(btn).toHaveFocus()
  })
})

describe("Input – reduced motion", () => {
  it("label has motion-reduce:transition-none", () => {
    render(<Input variant="floating" label="Name" />)
    const label = screen.getByText("Name")
    expect(label).toHaveClass("motion-reduce:transition-none")
  })

  it("underline has motion-reduce:transition-none and motion-reduce:w-full", () => {
    const { container } = render(<Input variant="floating" label="Name" />)
    const underline = container.querySelector("span[aria-hidden='true']")
    expect(underline).toHaveClass("motion-reduce:transition-none")
    // Snaps to full width when motion is reduced
    expect(underline).toHaveClass("motion-reduce:w-full")
  })
})
