import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import NewEventPage from "./page"

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
}))

describe("NewEventPage focus order", () => {
  it("tabs through fields in the correct visual reading order", async () => {
    const user = userEvent.setup()
    render(<NewEventPage />)

    // Start tabbing
    await user.tab()
    expect(screen.getByLabelText(/event title/i)).toHaveFocus()

    await user.tab()
    expect(screen.getByLabelText(/description/i)).toHaveFocus()

    await user.tab()
    // Select is tricky because Radix UI uses a hidden button.
    // Let's just check the id or name if possible, or skip to the next
    // The select trigger usually has role="combobox"
    expect(screen.getByRole("combobox", { name: /category/i })).toHaveFocus()

    // Add more expectations to see what currently happens
    // By keeping this minimal first, we can run it and see the output!
  })
})
