import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { RecommendationsStrip } from "../RecommendationsStrip"
import type { Bet } from "@/lib/types"

function betIn(color: Bet["category"]["color"]): Pick<Bet, "category"> {
  return { category: { name: color, color } }
}

/** jsdom reports 0 for scroll/client width, so overflow never appears unless we fake it. */
function mockOverflow(container: HTMLElement) {
  Object.defineProperty(container, "scrollWidth", { value: 2000, configurable: true })
  Object.defineProperty(container, "clientWidth", { value: 500, configurable: true })
  Object.defineProperty(container, "scrollLeft", { value: 0, writable: true, configurable: true })
  container.scrollTo = jest.fn(({ left }: { left: number }) => {
    Object.defineProperty(container, "scrollLeft", { value: left, writable: true, configurable: true })
  }) as unknown as typeof container.scrollTo
}

describe("RecommendationsStrip", () => {
  describe("empty state (new user, no bets)", () => {
    it("shows the empty state instead of a strip", () => {
      render(<RecommendationsStrip bets={[]} />)
      expect(screen.getByText("No suggestions yet")).toBeInTheDocument()
      expect(screen.queryByRole("region", { name: /carousel/i })).not.toBeInTheDocument()
    })

    it("renders a clickable chip for every recommendation category", () => {
      render(<RecommendationsStrip bets={[]} />)
      for (const label of ["Football", "Politics", "Crypto", "Stocks", "Entertainment", "Sports"]) {
        expect(screen.getByRole("button", { name: label })).toBeInTheDocument()
      }
    })

    it("populates the strip once a category chip is clicked (functional CTA)", () => {
      render(<RecommendationsStrip bets={[]} />)

      fireEvent.click(screen.getByRole("button", { name: "Crypto" }))

      expect(screen.queryByText("No suggestions yet")).not.toBeInTheDocument()
      const region = screen.getByRole("region", { name: /carousel/i })
      expect(region).toBeInTheDocument()
      expect(screen.getAllByText("Crypto").length).toBeGreaterThan(0)
    })
  })

  describe("populated state (derived from bet history)", () => {
    it("recommends markets from the user's top bet categories", () => {
      const bets = [betIn("football"), betIn("football"), betIn("stocks")]
      render(<RecommendationsStrip bets={bets} />)

      expect(screen.getByRole("region", { name: /carousel/i })).toBeInTheDocument()
      expect(screen.getAllByText("Suggested").length).toBeGreaterThan(0)
      // "politics" never appears in this user's bets, so it shouldn't be recommended.
      expect(screen.queryByText("Politics")).not.toBeInTheDocument()
    })

    it("renders each recommended market as a link", () => {
      render(<RecommendationsStrip bets={[betIn("crypto")]} />)
      const links = screen.getAllByRole("link")
      expect(links.length).toBeGreaterThan(0)
      links.forEach((link) => expect(link).toHaveAttribute("href"))
    })
  })

  describe("keyboard scrolling", () => {
    it("scrolls right on ArrowRight and left on ArrowLeft when content overflows", () => {
      render(<RecommendationsStrip bets={[betIn("crypto")]} />)
      const region = screen.getByRole("region", { name: /carousel/i })
      mockOverflow(region)

      // Establish canScrollRight=true by simulating the overflow being detected.
      fireEvent.scroll(region)
      fireEvent.keyDown(region, { key: "ArrowRight" })
      expect(region.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 500, behavior: "smooth" }))

      fireEvent.scroll(region)
      fireEvent.keyDown(region, { key: "ArrowLeft" })
      expect(region.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 0, behavior: "smooth" }))
    })

    it("is a tabbable region", () => {
      render(<RecommendationsStrip bets={[betIn("crypto")]} />)
      expect(screen.getByRole("region", { name: /carousel/i })).toHaveAttribute("tabIndex", "0")
    })
  })
})
