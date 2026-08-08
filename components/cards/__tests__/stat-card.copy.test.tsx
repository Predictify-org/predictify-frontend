import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { StatCard } from "../stat-card"

// Mock the toast hook
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

describe("StatCard — Issue #770: Copy-to-clipboard affordance", () => {
  const mockStat = { label: "Volume", value: "$4,325.49" }

  it("renders a copy button in the success state", () => {
    render(
      <StatCard
        stat={mockStat}
        index={0}
        status="success"
      />
    )

    const copyButton = screen.getByRole("button", {
      name: /Copy Volume value \$4,325\.49/i,
    })
    expect(copyButton).toBeInTheDocument()
  })

  it("does not render a copy button in empty/loading/error states", () => {
    const { rerender } = render(
      <StatCard index={0} status="empty" emptyVariant="volume" />
    )
    expect(screen.queryByLabelText(/Copy .* value/i)).not.toBeInTheDocument()

    rerender(<StatCard index={0} status="loading" />)
    expect(screen.queryByLabelText(/Copy .* value/i)).not.toBeInTheDocument()

    rerender(<StatCard index={0} status="error" onRetry={jest.fn()} />)
    expect(screen.queryByLabelText(/Copy .* value/i)).not.toBeInTheDocument()
  })

  it("shows the copied state (aria-pressed) after a successful click", async () => {
    // Provide a working clipboard for the browser API
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      configurable: true,
    })

    const user = userEvent.setup()
    render(
      <StatCard
        stat={mockStat}
        index={0}
        status="success"
      />
    )

    const copyButton = screen.getByRole("button", {
      name: /Copy Volume value \$4,325\.49/i,
    })
    expect(copyButton).toHaveAttribute("aria-pressed", "false")

    await user.click(copyButton)
    expect(copyButton).toHaveAttribute("aria-pressed", "true")
  })

  it("has proper keyboard-accessible attributes", () => {
    render(
      <StatCard
        stat={mockStat}
        index={0}
        status="success"
      />
    )

    const copyButton = screen.getByRole("button", {
      name: /Copy Volume value \$4,325\.49/i,
    })

    // Button is a native <button> element, naturally keyboard-accessible
    expect(copyButton.tagName).toBe("BUTTON")
    expect(copyButton).toHaveAttribute("type", "button")
    expect(copyButton).toHaveAttribute("title", "Copy value")
    // The button has focus-visible styling for keyboard users
    expect(copyButton.className).toMatch(/focus-visible:outline-none/)
    expect(copyButton.className).toMatch(/focus-visible:ring-2/)
  })

  it("does not crash when clipboard API is unavailable", async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, "clipboard", { value: undefined })

    render(
      <StatCard
        stat={mockStat}
        index={0}
        status="success"
      />
    )

    const copyButton = screen.getByRole("button", {
      name: /Copy Volume value \$4,325\.49/i,
    })
    await user.click(copyButton)

    // No crash; aria-pressed should remain false (clipboard unavailable)
    expect(copyButton).toHaveAttribute("aria-pressed", "false")
  })
})