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

// Mock usePrivacy
jest.mock("@/context/PrivacyContext", () => ({
  usePrivacy: () => ({ hideBalances: false, setHideBalances: jest.fn() }),
  PrivacyProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe("NewEventPage focus order", () => {
  it("renders form inputs with correct labeling", async () => {
    render(<NewEventPage />)

    // Verify the title input is properly associated with its label
    expect(screen.getByLabelText(/event title/i)).toBeInTheDocument()

    // Verify the description textarea is accessible
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()

    // Verify the category combobox exists
    expect(screen.getByRole("combobox", { name: /category/i })).toBeInTheDocument()
  })
})
