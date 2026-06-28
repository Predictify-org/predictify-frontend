import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { ResumeCard } from "../ResumeCard"
import { saveInProgressPrediction } from "@/lib/state/inProgress"

const sample = {
  id: "draft-1",
  marketId: "eth-weekly-close",
  marketTitle: "Will ETH close above $4,000 this week?",
  href: "/events/eth-weekly-close",
  step: "sign" as const,
  stakeAmount: "$100.00",
  savedAt: Date.now(),
}

describe("ResumeCard", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("renders the resume card when an in-progress prediction exists", () => {
    saveInProgressPrediction(sample)
    render(<ResumeCard />)

    expect(screen.getByText("Resume your last prediction")).toBeInTheDocument()
    expect(screen.getByText(sample.marketTitle)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /resume/i })).toHaveAttribute("href", sample.href)
  })

  it("dismisses the card when the close button is clicked", () => {
    saveInProgressPrediction(sample)
    render(<ResumeCard />)

    fireEvent.click(screen.getByRole("button", { name: /dismiss resume prediction card/i }))

    expect(screen.queryByText("Resume your last prediction")).not.toBeInTheDocument()
  })

  it("renders nothing when there is no visible in-progress prediction", () => {
    const { container } = render(<ResumeCard />)
    expect(container).toBeEmptyDOMElement()
  })
})
