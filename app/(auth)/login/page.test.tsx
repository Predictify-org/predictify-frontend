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
