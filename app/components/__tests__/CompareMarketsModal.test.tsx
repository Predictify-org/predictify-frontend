import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"

import { CompareMarketsModal, type CompareMarket } from "../CompareMarketsModal"

const markets: CompareMarket[] = [
  {
    id: "market-1",
    title: "Super Bowl Winner 2025",
    category: "Sports",
    deadline: "2025-06-09T12:00:00Z",
    totalPool: 15780.5,
    participants: 1245,
    topOutcome: "Kansas City Chiefs",
    topOdds: 2.5,
    resolutionCriteria:
      "Resolves to the team officially declared winner of Super Bowl LIX.",
    status: "open",
  },
  {
    id: "market-2",
    title: "AFC Championship Winner",
    category: "Sports",
    deadline: "2025-01-26T23:00:00Z",
    totalPool: 9800,
    participants: 842,
    topOutcome: "Baltimore Ravens",
    topOdds: 3.1,
    resolutionCriteria:
      "Resolves to the team officially declared winner of the AFC Championship game.",
    status: "closing",
  },
]

describe("CompareMarketsModal", () => {
  it("renders the default compare trigger", () => {
    render(<CompareMarketsModal markets={markets} />)

    expect(
      screen.getByRole("button", { name: /compare markets/i })
    ).toBeInTheDocument()
  })

  it("opens an accessible dialog with both market panels", () => {
    render(<CompareMarketsModal markets={markets} />)

    fireEvent.click(screen.getByRole("button", { name: /compare markets/i }))

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(
      screen.getByText(/review two markets side by side/i)
    ).toBeInTheDocument()
    expect(screen.getByText("Super Bowl Winner 2025")).toBeInTheDocument()
    expect(screen.getByText("AFC Championship Winner")).toBeInTheDocument()
    expect(
      screen.getByText((content) => content.includes("15,781"))
    ).toBeInTheDocument()
    expect(screen.getByText("1,245")).toBeInTheDocument()
    expect(screen.getByText(/Kansas City Chiefs/i)).toBeInTheDocument()
  })

  it("renders a custom trigger when provided", () => {
    render(
      <CompareMarketsModal
        markets={markets}
        trigger={<button type="button">Open comparison</button>}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /open comparison/i }))

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Compare markets")).toBeInTheDocument()
  })

  it("shows an empty state when fewer than two markets are supplied", () => {
    render(<CompareMarketsModal markets={[markets[0]]} />)

    fireEvent.click(screen.getByRole("button", { name: /compare markets/i }))

    expect(screen.getByText(/select two markets to compare/i)).toBeInTheDocument()
  })
})
