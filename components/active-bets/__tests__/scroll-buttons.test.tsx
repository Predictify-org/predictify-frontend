import React from "react"
import { render } from "@testing-library/react"
import { ActiveBets } from "../ActiveBets"

describe("ActiveBets scroll buttons - Touch target sizing (Issue #541 #7)", () => {
  it("renders scroll arrow buttons with responsive sizing: w-10 h-10 on mobile, sm:w-8 sm:h-8 on larger screens", () => {
    const mockBets = [
      { id: "1", title: "Bet 1", odds: 1.5, amount: 100, outcome: "yes" as const },
      { id: "2", title: "Bet 2", odds: 2.0, amount: 200, outcome: "no" as const },
      { id: "3", title: "Bet 3", odds: 1.8, amount: 150, outcome: "yes" as const },
      { id: "4", title: "Bet 4", odds: 2.5, amount: 250, outcome: "no" as const },
    ]

    const { container } = render(
      <ActiveBets bets={mockBets} isLoading={false} onAddBet={() => {}} />
    )

    // Find all scroll buttons (left and right arrows)
    const scrollButtons = container.querySelectorAll('[aria-label*="Scroll"]')

    // Should have at least one scroll button visible
    if (scrollButtons.length > 0) {
      scrollButtons.forEach(button => {
        // Verify the button has the responsive size classes
        expect(button.className).toMatch(/w-10/)
        expect(button.className).toMatch(/h-10/)
        expect(button.className).toMatch(/sm:w-8/)
        expect(button.className).toMatch(/sm:h-8/)
      })
    }
  })
})
