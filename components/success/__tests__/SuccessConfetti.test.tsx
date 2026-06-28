import React from "react"
import { render, screen } from "@testing-library/react"
import { SuccessConfetti } from "../SuccessConfetti"

function mockReducedMotion(reduced: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }))
}

describe("SuccessConfetti", () => {
  beforeEach(() => {
    mockReducedMotion(false)
  })

  it("renders animated confetti pieces when motion is allowed", () => {
    const { container } = render(<SuccessConfetti />)
    expect(container.querySelectorAll(".success-confetti-piece").length).toBeGreaterThan(0)
    expect(container.querySelector(".success-confetti-static")).not.toBeInTheDocument()
  })

  it("renders a static success icon under prefers-reduced-motion", () => {
    mockReducedMotion(true)
    render(<SuccessConfetti ariaLabel="Prediction confirmed" />)

    expect(screen.getByRole("img", { name: "Prediction confirmed" })).toBeInTheDocument()
    expect(document.querySelector(".success-confetti-piece")).not.toBeInTheDocument()
  })

  it("renders nothing when inactive", () => {
    const { container } = render(<SuccessConfetti active={false} />)
    expect(container).toBeEmptyDOMElement()
  })
})
