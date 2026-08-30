import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import LoginPage from "./page"

const push = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}))

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  it("shows inline validation messages when required fields are empty", async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole("button", { name: /login/i }))

    expect(await screen.findByText("Email is required.")).toBeInTheDocument()
    expect(screen.getByText("Password is required.")).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("aria-invalid", "true")
  })

  it("reports invalid email format before submission", async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), "not-an-email")
    await user.type(screen.getByLabelText(/password/i), "secret123")
    await user.click(screen.getByRole("button", { name: /login/i }))

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument()
  })

  it("surfaces failed sign-in attempts with an accessible alert", async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), "admin@example.com")
    await user.type(screen.getByLabelText(/password/i), "wrong-password")
    await user.click(screen.getByRole("button", { name: /login/i }))

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /we could not sign you in with those credentials/i,
    )
    expect(push).not.toHaveBeenCalled()
  })
})

/**
 * FWC26 campaign stats — tabular-nums
 *
 * These tests verify that the GrantFox FWC26 campaign statistics banner is
 * rendered on the login page and that each numeric value element carries the
 * `tabular-nums` CSS class and the `data-numeric="true"` attribute.
 *
 * Why both?
 *   - `tabular-nums` is the Tailwind utility (font-variant-numeric: tabular-nums).
 *   - `data-numeric="true"` is the attribute-based CSS selector defined in
 *     src/styles/typography.css — it applies the same rule in plain-CSS contexts
 *     such as email templates or server-rendered markup without JS.
 *
 * Vertical digit alignment (tabular-nums) prevents layout reflow when numeric
 * values change in place, which is especially important for live counters that
 * may be wired to polling or websocket updates in future iterations.
 */
describe("LoginPage — FWC26 campaign stats (tabular-nums)", () => {
  it("renders the campaign statistics region with an accessible label", () => {
    render(<LoginPage />)

    const region = screen.getByRole("region", {
      name: /grantfox fwc26 campaign statistics/i,
    })
    expect(region).toBeInTheDocument()
  })

  it("renders the Participants stat with tabular-nums class and data-numeric attribute", () => {
    render(<LoginPage />)

    const el = screen.getByTestId("stat-participants")
    // Verify the value is displayed
    expect(el).toHaveTextContent("12,543")
    // tabular-nums Tailwind utility — font-variant-numeric: tabular-nums
    expect(el).toHaveClass("tabular-nums")
    // Attribute-based CSS opt-in (src/styles/typography.css)
    expect(el).toHaveAttribute("data-numeric", "true")
  })

  it("renders the Prize Pool stat with tabular-nums class and data-numeric attribute", () => {
    render(<LoginPage />)

    const el = screen.getByTestId("stat-prize-pool")
    expect(el).toHaveTextContent("50,000 XLM")
    expect(el).toHaveClass("tabular-nums")
    expect(el).toHaveAttribute("data-numeric", "true")
  })

  it("renders the Markets Open stat with tabular-nums class and data-numeric attribute", () => {
    render(<LoginPage />)

    const el = screen.getByTestId("stat-markets-open")
    expect(el).toHaveTextContent("128")
    expect(el).toHaveClass("tabular-nums")
    expect(el).toHaveAttribute("data-numeric", "true")
  })

  it("renders all three stat labels as definition terms", () => {
    render(<LoginPage />)

    // Labels are rendered as <dt> elements within a <dl>
    expect(screen.getByText("Participants")).toBeInTheDocument()
    expect(screen.getByText("Prize Pool")).toBeInTheDocument()
    expect(screen.getByText("Markets Open")).toBeInTheDocument()
  })

  it("every numeric stat element has both the tabular-nums class and data-numeric attribute", () => {
    render(<LoginPage />)

    const statTestIds = ["stat-participants", "stat-prize-pool", "stat-markets-open"]

    statTestIds.forEach((testId) => {
      const el = screen.getByTestId(testId)
      expect(el).toHaveClass("tabular-nums")
      expect(el).toHaveAttribute("data-numeric", "true")
    })
  })
})
