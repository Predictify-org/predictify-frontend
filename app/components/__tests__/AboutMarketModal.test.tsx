import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { AboutMarketModal } from "@/app/components/AboutMarketModal"

const defaultProps = {
  marketTitle: "Super Bowl Winner 2025",
  category: "Sports",
  description:
    "Predict which team will win the Super Bowl LIX scheduled to be played on February 9, 2025.",
  resolutionCriteria:
    "The market resolves to the official championship winner after the final whistle and source verification.",
  deadlineLabel: "Feb 9, 2025",
}

describe("AboutMarketModal", () => {
  it("opens an accessible dialog with market context and resolution criteria", () => {
    render(<AboutMarketModal {...defaultProps} />)

    fireEvent.click(
      screen.getByRole("button", { name: /about this market/i })
    )

    expect(
      screen.getByRole("dialog", { name: /about this market/i })
    ).toBeInTheDocument()
    expect(screen.getByText("Super Bowl Winner 2025")).toBeInTheDocument()
    expect(screen.getByText("Sports")).toBeInTheDocument()
    expect(screen.getAllByText(/official championship winner/i)).toHaveLength(2)
    expect(screen.getByText(/screen reader summary/i)).toBeInTheDocument()
  })
})
