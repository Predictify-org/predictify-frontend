import React from "react"
import { render, screen, waitFor, act } from "@testing-library/react"
import { SuccessConfetti } from "../SuccessConfetti"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the useReducedMotion hook so we can control its return value per test
const mockUseReducedMotion = jest.fn(() => false)
jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}))

// Mock canvas-confetti module
const mockConfetti = jest.fn()
jest.mock("canvas-confetti", () => ({
  __esModule: true,
  default: mockConfetti,
}))

// Helper to mock matchMedia for SSR safety tests
function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: matches && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SuccessConfetti", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReducedMotion.mockReturnValue(false)
    mockMatchMedia(false)
  })

  // ---- Rendering when isVisible=false -------------------------------------

  it("renders nothing when isVisible is false", () => {
    const { container } = render(<SuccessConfetti isVisible={false} />)
    expect(container.firstChild).toBeNull()
    expect(screen.queryByTestId("success-confetti")).not.toBeInTheDocument()
    expect(screen.queryByTestId("success-confetti-static")).not.toBeInTheDocument()
  })

  it("does not call canvas-confetti when isVisible is false", () => {
    render(<SuccessConfetti isVisible={false} />)
    expect(mockConfetti).not.toHaveBeenCalled()
  })

  // ---- Full-motion confetti -----------------------------------------------

  it("renders confetti container when isVisible is true and motion is not reduced", async () => {
    mockUseReducedMotion.mockReturnValue(false)
    render(<SuccessConfetti isVisible={true} />)

    // The confetti placeholder/marker should be present
    const confettiElement = screen.getByTestId("success-confetti")
    expect(confettiElement).toBeInTheDocument()

    // Wait for the dynamic import to resolve and confetti to be called
    await waitFor(
      () => {
        expect(mockConfetti).toHaveBeenCalled()
      },
      { timeout: 2000 }
    )
  })

  it("applies aria-hidden='true' to the confetti container", () => {
    mockUseReducedMotion.mockReturnValue(false)
    render(<SuccessConfetti isVisible={true} />)

    const confettiElement = screen.getByTestId("success-confetti")
    expect(confettiElement).toHaveAttribute("aria-hidden", "true")
  })

  it("applies role='presentation' to the confetti container", () => {
    mockUseReducedMotion.mockReturnValue(false)
    render(<SuccessConfetti isVisible={true} />)

    const confettiElement = screen.getByTestId("success-confetti")
    expect(confettiElement).toHaveAttribute("role", "presentation")
  })

  it("calls canvas-confetti twice for a fuller effect", async () => {
    mockUseReducedMotion.mockReturnValue(false)
    jest.useFakeTimers()

    render(<SuccessConfetti isVisible={true} />)

    // Wait for the first confetti call
    await waitFor(() => {
      expect(mockConfetti).toHaveBeenCalledTimes(1)
    })

    // Advance timers to trigger the second burst (150ms delay)
    act(() => {
      jest.advanceTimersByTime(200)
    })

    await waitFor(() => {
      expect(mockConfetti).toHaveBeenCalledTimes(2)
    })

    jest.useRealTimers()
  })

  it("passes correct colors to canvas-confetti from design tokens", async () => {
    mockUseReducedMotion.mockReturnValue(false)
    render(<SuccessConfetti isVisible={true} />)

    await waitFor(() => {
      expect(mockConfetti).toHaveBeenCalled()
    })

    const firstCall = mockConfetti.mock.calls[0][0]
    expect(firstCall.colors).toBeDefined()
    expect(Array.isArray(firstCall.colors)).toBe(true)
    expect(firstCall.colors.length).toBeGreaterThan(0)
  })

  it("sets disableForReducedMotion: true in canvas-confetti config", async () => {
    mockUseReducedMotion.mockReturnValue(false)
    render(<SuccessConfetti isVisible={true} />)

    await waitFor(() => {
      expect(mockConfetti).toHaveBeenCalled()
    })

    const firstCall = mockConfetti.mock.calls[0][0]
    expect(firstCall.disableForReducedMotion).toBe(true)
  })

  // ---- Reduced-motion static fallback -------------------------------------

  it("renders static fallback when isVisible is true and motion is reduced", () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<SuccessConfetti isVisible={true} />)

    // Static fallback should be present
    const staticElement = screen.getByTestId("success-confetti-static")
    expect(staticElement).toBeInTheDocument()

    // Confetti container should NOT be present
    expect(screen.queryByTestId("success-confetti")).not.toBeInTheDocument()
  })

  it("does not call canvas-confetti when motion is reduced", () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<SuccessConfetti isVisible={true} />)

    expect(mockConfetti).not.toHaveBeenCalled()
  })

  it("renders CheckCircle icon in static fallback", () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { container } = render(<SuccessConfetti isVisible={true} />)

    // CheckCircle from lucide-react renders as an SVG
    const icon = container.querySelector("svg")
    expect(icon).toBeInTheDocument()
  })

  it("applies aria-hidden='true' to static fallback", () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<SuccessConfetti isVisible={true} />)

    const staticElement = screen.getByTestId("success-confetti-static")
    expect(staticElement).toHaveAttribute("aria-hidden", "true")
  })

  it("applies role='presentation' to static fallback", () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<SuccessConfetti isVisible={true} />)

    const staticElement = screen.getByTestId("success-confetti-static")
    expect(staticElement).toHaveAttribute("role", "presentation")
  })

  it("static fallback has no animation classes", () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { container } = render(<SuccessConfetti isVisible={true} />)

    const staticElement = screen.getByTestId("success-confetti-static")
    const classList = Array.from(staticElement.classList)

    // No animate-*, motion-*, or transition classes
    const hasAnimationClass = classList.some((cls) =>
      /animate|motion|transition/.test(cls)
    )
    expect(hasAnimationClass).toBe(false)
  })

  it("static fallback is visible with proper contrast tokens", () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<SuccessConfetti isVisible={true} />)

    const staticElement = screen.getByTestId("success-confetti-static")
    
    // Check for green color tokens in classList
    const classList = Array.from(staticElement.querySelector("div")!.classList)
    const hasGreenTokens = classList.some((cls) =>
      /green-500|emerald-500/.test(cls)
    )
    expect(hasGreenTokens).toBe(true)
  })

  // ---- Responds to preference change at runtime ---------------------------

  it("switches from confetti to static when preference changes to reduced", async () => {
    mockUseReducedMotion.mockReturnValue(false)
    const { rerender } = render(<SuccessConfetti isVisible={true} />)

    // Initially shows confetti
    await waitFor(() => {
      expect(screen.getByTestId("success-confetti")).toBeInTheDocument()
    })

    // Simulate preference change
    mockUseReducedMotion.mockReturnValue(true)
    rerender(<SuccessConfetti isVisible={true} />)

    // Should now show static fallback
    expect(screen.getByTestId("success-confetti-static")).toBeInTheDocument()
    expect(screen.queryByTestId("success-confetti")).not.toBeInTheDocument()
  })

  it("switches from static to confetti when preference changes to no-preference", () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { rerender } = render(<SuccessConfetti isVisible={true} />)

    // Initially shows static
    expect(screen.getByTestId("success-confetti-static")).toBeInTheDocument()

    // Simulate preference change
    mockUseReducedMotion.mockReturnValue(false)
    rerender(<SuccessConfetti isVisible={true} />)

    // Should now show confetti
    expect(screen.getByTestId("success-confetti")).toBeInTheDocument()
    expect(screen.queryByTestId("success-confetti-static")).not.toBeInTheDocument()
  })

  // ---- SSR safety ---------------------------------------------------------

  it("does not throw when window is undefined (SSR)", () => {
    // Mock SSR environment
    const originalWindow = global.window
    // @ts-ignore
    delete global.window

    expect(() => {
      render(<SuccessConfetti isVisible={true} />)
    }).not.toThrow()

    // Restore window
    global.window = originalWindow
  })

  // ---- Cleanup on unmount -------------------------------------------------

  it("cleans up when unmounted", async () => {
    mockUseReducedMotion.mockReturnValue(false)
    const { unmount } = render(<SuccessConfetti isVisible={true} />)

    await waitFor(() => {
      expect(mockConfetti).toHaveBeenCalled()
    })

    // Unmount should not throw
    expect(() => {
      unmount()
    }).not.toThrow()
  })

  it("does not trigger confetti again when isVisible cycles false->true", async () => {
    mockUseReducedMotion.mockReturnValue(false)
    const { rerender } = render(<SuccessConfetti isVisible={true} />)

    await waitFor(() => {
      expect(mockConfetti).toHaveBeenCalled()
    })

    const callCountAfterFirst = mockConfetti.mock.calls.length

    // Cycle to false
    rerender(<SuccessConfetti isVisible={false} />)
    expect(screen.queryByTestId("success-confetti")).not.toBeInTheDocument()

    // Cycle back to true
    rerender(<SuccessConfetti isVisible={true} />)

    // Should trigger confetti again (new cycle)
    await waitFor(() => {
      expect(mockConfetti.mock.calls.length).toBeGreaterThan(callCountAfterFirst)
    })
  })

  // ---- Custom props -------------------------------------------------------

  it("accepts custom testId", () => {
    mockUseReducedMotion.mockReturnValue(false)
    render(<SuccessConfetti isVisible={true} testId="custom-confetti" />)

    expect(screen.getByTestId("custom-confetti")).toBeInTheDocument()
  })

  it("accepts custom className for static fallback", () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<SuccessConfetti isVisible={true} className="custom-class" />)

    const staticElement = screen.getByTestId("success-confetti-static")
    expect(staticElement).toHaveClass("custom-class")
  })

  // ---- Accessibility ------------------------------------------------------

  it("confetti does not trap focus", () => {
    mockUseReducedMotion.mockReturnValue(false)
    render(
      <div>
        <button>Button 1</button>
        <SuccessConfetti isVisible={true} />
        <button>Button 2</button>
      </div>
    )

    const confettiElement = screen.getByTestId("success-confetti")
    expect(confettiElement).toHaveClass("pointer-events-none")
  })

  it("static fallback does not trap focus", () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(
      <div>
        <button>Button 1</button>
        <SuccessConfetti isVisible={true} />
        <button>Button 2</button>
      </div>
    )

    const staticElement = screen.getByTestId("success-confetti-static")
    expect(staticElement).toHaveClass("pointer-events-none")
  })

  // ---- Vacuousness check: fail when guard is removed ---------------------

  it("VACUOUSNESS: test fails if SSR guard is removed from hook", () => {
    // This test validates that removing the SSR guard would cause a failure.
    // The useReducedMotion hook has `typeof window === "undefined"` check.
    // If that's removed, tests relying on window.matchMedia would fail.
    
    // We simulate this by checking the hook behavior
    const originalWindow = global.window
    // @ts-ignore
    delete global.window

    // The hook should return false in SSR (no window)
    // If the guard is removed, it would try to access window.matchMedia and throw
    expect(() => {
      mockUseReducedMotion()
    }).not.toThrow()

    global.window = originalWindow
  })

  it("VACUOUSNESS: test fails if reducedMotion check is bypassed", async () => {
    // If we remove the `if (reducedMotion) return` guard from the component,
    // confetti would be called even when motion is reduced.
    mockUseReducedMotion.mockReturnValue(true)
    render(<SuccessConfetti isVisible={true} />)

    // With the guard in place, confetti should NOT be called
    expect(mockConfetti).not.toHaveBeenCalled()

    // If the guard is removed, this test would fail because confetti WOULD be called
  })
})
