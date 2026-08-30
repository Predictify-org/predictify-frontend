import React from "react"
import { render, screen } from "@testing-library/react"
import { SuccessConfetti } from "../SuccessConfetti"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the useReducedMotion hook
const mockUseReducedMotion = jest.fn(() => false)
jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}))

// Mock canvas-confetti
const mockConfetti = jest.fn()
jest.mock("canvas-confetti", () => ({
  __esModule: true,
  default: mockConfetti,
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SuccessConfetti — reduced-motion specific tests", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReducedMotion.mockReturnValue(false)
  })

  // ---- Motion enabled vs. motion reduced comparison -----------------------

  it("renders different DOM structures for motion vs. reduced-motion", () => {
    // Motion enabled
    mockUseReducedMotion.mockReturnValue(false)
    const { container: motionContainer, unmount: unmountMotion } = render(
      <SuccessConfetti isVisible={true} />
    )
    const motionElement = screen.getByTestId("success-confetti")
    expect(motionElement).toBeInTheDocument()
    expect(screen.queryByTestId("success-confetti-static")).not.toBeInTheDocument()
    unmountMotion()

    // Motion reduced
    mockUseReducedMotion.mockReturnValue(true)
    const { container: reducedContainer } = render(
      <SuccessConfetti isVisible={true} />
    )
    const staticElement = screen.getByTestId("success-confetti-static")
    expect(staticElement).toBeInTheDocument()
    expect(screen.queryByTestId("success-confetti")).not.toBeInTheDocument()

    // Verify different structures
    expect(motionContainer.innerHTML).not.toBe(reducedContainer.innerHTML)
  })

  it("static fallback contains visible content (not just a placeholder)", () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { container } = render(<SuccessConfetti isVisible={true} />)

    // Should have an SVG icon (CheckCircle)
    const icon = container.querySelector("svg")
    expect(icon).toBeInTheDocument()

    // Should have visual styling classes
    const staticElement = screen.getByTestId("success-confetti-static")
    const classList = Array.from(staticElement.classList)
    
    // Check for positioning and visual classes
    expect(classList).toContain("fixed")
    expect(classList.some((cls) => /z-/.test(cls))).toBe(true)
    
    // Inner div should have gradient and border
    const innerDiv = staticElement.querySelector("div")
    expect(innerDiv).toBeInTheDocument()
    const innerClasses = Array.from(innerDiv!.classList)
    expect(innerClasses.some((cls) => /gradient/.test(cls))).toBe(true)
    expect(innerClasses.some((cls) => /border/.test(cls))).toBe(true)
  })

  it("static fallback is at least as visually prominent as confetti", () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<SuccessConfetti isVisible={true} />)

    const staticElement = screen.getByTestId("success-confetti-static")
    
    // Should be fixed positioned (visible on screen)
    expect(staticElement).toHaveClass("fixed")
    
    // Should have high z-index (on top of content)
    expect(staticElement.className).toMatch(/z-\d+/)
    
    // Should not be hidden or transparent
    expect(staticElement).toBeVisible()
    
    // Inner content should have size
    const innerDiv = staticElement.querySelector("div")
    expect(innerDiv).toHaveClass("w-20")
    expect(innerDiv).toHaveClass("h-20")
  })

  // ---- No animation whatsoever in reduced-motion mode ---------------------

  it("static fallback contains zero animation properties", () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { container } = render(<SuccessConfetti isVisible={true} />)

    // Get all elements in the static fallback
    const allElements = container.querySelectorAll("*")
    
    allElements.forEach((element) => {
      const classList = Array.from(element.classList)
      
      // No animate-* classes
      expect(classList.every((cls) => !cls.startsWith("animate-"))).toBe(true)
      
      // No motion-* classes
      expect(classList.every((cls) => !cls.startsWith("motion-"))).toBe(true)
      
      // No transition-* classes
      expect(classList.every((cls) => !cls.startsWith("transition-"))).toBe(true)
      
      // No duration-* classes
      expect(classList.every((cls) => !cls.startsWith("duration-"))).toBe(true)
    })
  })

  it("static fallback does not flash, pulse, or move in any way", () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { container } = render(<SuccessConfetti isVisible={true} />)

    const allElements = container.querySelectorAll("*")
    
    allElements.forEach((element) => {
      const classList = Array.from(element.classList)
      
      // Check for common animation utility classes
      const animationKeywords = [
        "fade",
        "slide",
        "pulse",
        "bounce",
        "spin",
        "ping",
        "flash",
        "shake",
        "wiggle",
        "scale",
        "rotate",
      ]
      
      animationKeywords.forEach((keyword) => {
        expect(
          classList.every((cls) => !cls.toLowerCase().includes(keyword))
        ).toBe(true)
      })
    })
  })

  // ---- Accessibility comparison -------------------------------------------

  it("both motion and reduced-motion paths have identical accessibility attributes", () => {
    // Motion enabled
    mockUseReducedMotion.mockReturnValue(false)
    const { unmount: unmountMotion } = render(<SuccessConfetti isVisible={true} />)
    const motionElement = screen.getByTestId("success-confetti")
    const motionAriaHidden = motionElement.getAttribute("aria-hidden")
    const motionRole = motionElement.getAttribute("role")
    unmountMotion()

    // Motion reduced
    mockUseReducedMotion.mockReturnValue(true)
    render(<SuccessConfetti isVisible={true} />)
    const staticElement = screen.getByTestId("success-confetti-static")
    const staticAriaHidden = staticElement.getAttribute("aria-hidden")
    const staticRole = staticElement.getAttribute("role")

    // Both should have the same accessibility attributes
    expect(motionAriaHidden).toBe(staticAriaHidden)
    expect(motionRole).toBe(staticRole)
  })

  it("both paths are marked as decorative (not announced by screen readers)", () => {
    // Motion enabled
    mockUseReducedMotion.mockReturnValue(false)
    const { unmount } = render(<SuccessConfetti isVisible={true} />)
    const motionElement = screen.getByTestId("success-confetti")
    expect(motionElement).toHaveAttribute("aria-hidden", "true")
    expect(motionElement).toHaveAttribute("role", "presentation")
    unmount()

    // Motion reduced
    mockUseReducedMotion.mockReturnValue(true)
    render(<SuccessConfetti isVisible={true} />)
    const staticElement = screen.getByTestId("success-confetti-static")
    expect(staticElement).toHaveAttribute("aria-hidden", "true")
    expect(staticElement).toHaveAttribute("role", "presentation")
  })

  // ---- Dark mode compatibility --------------------------------------------

  it("static fallback uses theme-aware color tokens (works in dark mode)", () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { container } = render(<SuccessConfetti isVisible={true} />)

    // Find elements with color classes
    const icon = container.querySelector("svg")
    expect(icon).toHaveClass("text-green-500")
    expect(icon).toHaveClass("dark:text-green-400")

    // Inner div should use theme-aware classes
    const innerDiv = container.querySelector("div > div")
    const classList = Array.from(innerDiv!.classList)
    
    // Should use token-based colors, not hardcoded values
    expect(classList.some((cls) => /green-500|emerald-500/.test(cls))).toBe(true)
  })

  it("does not use hardcoded color values in static fallback", () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { container } = render(<SuccessConfetti isVisible={true} />)

    // Get inline styles from all elements
    const allElements = container.querySelectorAll("*")
    
    allElements.forEach((element) => {
      const style = element.getAttribute("style")
      
      if (style) {
        // No hardcoded hex colors
        expect(style).not.toMatch(/#[0-9a-fA-F]{3,6}/)
        
        // No hardcoded rgb/rgba colors
        expect(style).not.toMatch(/rgba?\([0-9,\s]+\)/)
        
        // No hardcoded hsl/hsla colors (unless they reference CSS vars)
        if (style.includes("hsl")) {
          expect(style).toMatch(/var\(--/)
        }
      }
    })
  })

  // ---- Vacuousness checks -------------------------------------------------

  it("VACUOUSNESS: test fails if reduced-motion guard is removed", () => {
    // This test ensures the reduced-motion check is actually enforced.
    // If the `if (reducedMotion) { return <StaticFallback /> }` guard
    // is removed, confetti would be called even when motion is reduced.
    
    mockUseReducedMotion.mockReturnValue(true)
    render(<SuccessConfetti isVisible={true} />)

    // With the guard: confetti should NOT be called
    expect(mockConfetti).not.toHaveBeenCalled()
    
    // With the guard: static fallback SHOULD be rendered
    expect(screen.getByTestId("success-confetti-static")).toBeInTheDocument()
    
    // If the guard is removed:
    // - mockConfetti WOULD be called (test fails on line 217)
    // - Static fallback would NOT be rendered (test fails on line 220)
  })

  it("VACUOUSNESS: test fails if static fallback has animation classes", () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { container } = render(<SuccessConfetti isVisible={true} />)

    const allElements = container.querySelectorAll("*")
    
    // If someone adds animation classes to the static fallback,
    // this test will fail, ensuring the static fallback stays static.
    allElements.forEach((element) => {
      const classList = Array.from(element.classList)
      
      const animationClasses = classList.filter((cls) =>
        /animate-|transition-|duration-/.test(cls)
      )
      
      expect(animationClasses).toHaveLength(0)
    })
  })
})
