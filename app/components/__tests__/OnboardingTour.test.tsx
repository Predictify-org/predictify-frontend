import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OnboardingTour, type OnboardingStep } from "../OnboardingTour"

const STEPS: OnboardingStep[] = [
  { id: "markets", title: "Browse markets", description: "See every open market.", target: "#markets" },
  { id: "bet", title: "Place a bet", description: "Pick an outcome and stake.", target: "#bet" },
  { id: "wallet", title: "Connect a wallet", description: "Fund your account.", target: "#wallet" },
]

/**
 * jsdom has no `matchMedia`, and both `useReducedMotion` and `useMediaQuery`
 * call it on mount. `wide` drives the `(min-width: 640px)` query.
 */
function mockMatchMedia({ reducedMotion = false, wide = true } = {}) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reducedMotion : wide,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }))
}

/**
 * jsdom performs no layout, so every `getBoundingClientRect()` is zero-sized —
 * which the component reads as "no resolvable target". Mounting a target with a
 * stubbed rect is what exercises the anchored branch.
 */
const mountedTargets: HTMLElement[] = []

function mountTarget(id: string, rect: Partial<DOMRect> = {}) {
  const element = document.createElement("div")
  element.id = id
  document.body.appendChild(element)
  mountedTargets.push(element)
  element.getBoundingClientRect = () =>
    ({ top: 100, left: 100, width: 200, height: 50, right: 300, bottom: 150, x: 100, y: 100, toJSON: () => ({}), ...rect }) as DOMRect
  return element
}

function renderTour(props: Partial<React.ComponentProps<typeof OnboardingTour>> = {}) {
  const onClose = jest.fn()
  const utils = render(<OnboardingTour steps={STEPS} open onClose={onClose} {...props} />)
  return { ...utils, onClose }
}

/** Controlled harness with a real trigger, for focus-return assertions. */
function TourHarness({ steps = STEPS }: { steps?: OnboardingStep[] }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Start tour</button>
      <OnboardingTour steps={steps} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

describe("OnboardingTour", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMatchMedia()
  })

  afterEach(() => {
    // Remove only the elements this suite added. Clearing all of `document.body`
    // would tear out RTL's container and the tour's portal before RTL's own
    // cleanup unmounts them, which surfaces as an AggregateError.
    mountedTargets.splice(0).forEach((element) => element.remove())
    document.body.style.overflow = ""
  })

  describe("rendering", () => {
    it("renders nothing when closed", () => {
      renderTour({ open: false })
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("renders nothing when there are no steps", () => {
      renderTour({ steps: [] })
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("renders the first step as a labelled modal dialog", () => {
      renderTour()
      const dialog = screen.getByRole("dialog")

      expect(dialog).toHaveAttribute("aria-modal", "true")
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Browse markets")
      expect(screen.getByText("See every open market.")).toBeInTheDocument()
      expect(screen.getByText("Step 1 of 3")).toBeInTheDocument()
    })

    it("wires aria-labelledby and aria-describedby to the step content", () => {
      renderTour()
      const dialog = screen.getByRole("dialog")

      expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)).toHaveTextContent(
        "Browse markets"
      )
      expect(document.getElementById(dialog.getAttribute("aria-describedby")!)).toHaveTextContent(
        "See every open market."
      )
    })

    it("applies a custom className to the tooltip", () => {
      renderTour({ className: "custom-tour" })
      expect(screen.getByRole("dialog")).toHaveClass("custom-tour")
    })
  })

  describe("navigation", () => {
    it("advances with Next and reports the change", () => {
      const onStepChange = jest.fn()
      renderTour({ onStepChange })

      fireEvent.click(screen.getByRole("button", { name: "Next" }))

      expect(screen.getByText("Step 2 of 3")).toBeInTheDocument()
      expect(onStepChange).toHaveBeenCalledWith(1, STEPS[1])
    })

    it("hides Back on the first step and shows it afterwards", () => {
      renderTour()
      expect(screen.queryByRole("button", { name: /back/i })).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole("button", { name: "Next" }))
      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument()
    })

    it("goes back to the previous step", () => {
      renderTour()
      fireEvent.click(screen.getByRole("button", { name: "Next" }))
      fireEvent.click(screen.getByRole("button", { name: /back/i }))

      expect(screen.getByText("Step 1 of 3")).toBeInTheDocument()
    })

    it("shows Finish on the last step and closes with it", () => {
      const { onClose } = renderTour({ initialStep: 2 })

      const finish = screen.getByRole("button", { name: "Finish" })
      expect(finish).toBeInTheDocument()

      fireEvent.click(finish)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("clamps an out-of-range initialStep", () => {
      const { unmount } = renderTour({ initialStep: 99 })
      expect(screen.getByText("Step 3 of 3")).toBeInTheDocument()
      unmount()

      renderTour({ initialStep: -5 })
      expect(screen.getByText("Step 1 of 3")).toBeInTheDocument()
    })
  })

  describe("dismissal", () => {
    it("closes on Escape", () => {
      const { onClose } = renderTour()
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("closes when Skip tour is clicked", () => {
      const { onClose } = renderTour()
      fireEvent.click(screen.getByRole("button", { name: /skip tour/i }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("closes when the close button is clicked", () => {
      const { onClose } = renderTour()
      fireEvent.click(screen.getByRole("button", { name: /close tour/i }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("closes when the backdrop is clicked", () => {
      const { onClose } = renderTour()
      fireEvent.click(screen.getAllByTestId("onboarding-tour-backdrop")[0])
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe("keyboard navigation", () => {
    it("moves between steps with arrow keys", () => {
      renderTour()
      const dialog = screen.getByRole("dialog")

      fireEvent.keyDown(dialog, { key: "ArrowRight" })
      expect(screen.getByText("Step 2 of 3")).toBeInTheDocument()

      fireEvent.keyDown(dialog, { key: "ArrowLeft" })
      expect(screen.getByText("Step 1 of 3")).toBeInTheDocument()
    })

    it("jumps to the last and first step with End and Home", () => {
      renderTour()
      const dialog = screen.getByRole("dialog")

      fireEvent.keyDown(dialog, { key: "End" })
      expect(screen.getByText("Step 3 of 3")).toBeInTheDocument()

      fireEvent.keyDown(dialog, { key: "Home" })
      expect(screen.getByText("Step 1 of 3")).toBeInTheDocument()
    })

    it("does not step past the last step with ArrowRight", () => {
      const { onClose } = renderTour({ initialStep: 2 })
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("ignores unrelated keys", () => {
      const { onClose } = renderTour()
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "a" })

      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByText("Step 1 of 3")).toBeInTheDocument()
    })
  })

  describe("anchored placement", () => {
    // jsdom's viewport is 1024x768; the target below leaves room on every side.
    const TARGET_RECT = { top: 300, left: 400, width: 200, height: 50 }

    function renderAnchored(
      placement: OnboardingStep["placement"],
      rect: Partial<DOMRect> = TARGET_RECT
    ) {
      mountTarget("anchor", rect)
      renderTour({
        steps: [{ id: "anchored", title: "Anchored", description: "Beside the target.", target: "#anchor", placement }],
      })
      return screen.getByRole("dialog")
    }

    it("places the tooltip above the target for placement 'top'", () => {
      // 300 (top) - 8 (padding) - 12 (offset) - 200 (estimated height)
      expect(renderAnchored("top").style.top).toBe("80px")
    })

    it("places the tooltip below the target for placement 'bottom'", () => {
      // 300 (top) + 50 (height) + 8 (padding) + 12 (offset)
      expect(renderAnchored("bottom").style.top).toBe("370px")
    })

    it("places the tooltip left of the target for placement 'left'", () => {
      // 400 (left) - 8 (padding) - 12 (offset) - 320 (width)
      expect(renderAnchored("left").style.left).toBe("60px")
    })

    it("places the tooltip right of the target for placement 'right'", () => {
      // 400 (left) + 200 (width) + 8 (padding) + 12 (offset)
      expect(renderAnchored("right").style.left).toBe("620px")
    })

    it("flips to a side with room when the preferred side would overflow", () => {
      // Only 50px above the target — not enough for the tooltip, so 'top' flips
      // to 'bottom': 50 (top) + 50 (height) + 8 (padding) + 12 (offset).
      const dialog = renderAnchored("top", { ...TARGET_RECT, top: 50 })
      expect(dialog.style.top).toBe("120px")
    })

    it("does not anchor below the sm breakpoint", () => {
      mockMatchMedia({ wide: false })
      const dialog = renderAnchored("bottom")

      expect(dialog.style.top).toBe("")
      expect(dialog).toHaveClass("bottom-0")
    })
  })

  describe("focus flow", () => {
    it("focuses the step heading on open", () => {
      renderTour()
      expect(screen.getByRole("heading", { level: 2 })).toHaveFocus()
    })

    it("moves focus back to the heading after a step change", () => {
      renderTour()
      fireEvent.click(screen.getByRole("button", { name: "Next" }))

      const heading = screen.getByRole("heading", { level: 2 })
      expect(heading).toHaveTextContent("Place a bet")
      expect(heading).toHaveFocus()
    })

    it("wraps Tab from the last control back to the first", () => {
      renderTour()
      const dialog = screen.getByRole("dialog")
      const next = screen.getByRole("button", { name: "Next" })
      const close = screen.getByRole("button", { name: /close tour/i })

      next.focus()
      fireEvent.keyDown(dialog, { key: "Tab" })

      expect(close).toHaveFocus()
    })

    it("wraps Shift+Tab from the first control back to the last", () => {
      renderTour()
      const dialog = screen.getByRole("dialog")
      const next = screen.getByRole("button", { name: "Next" })
      const close = screen.getByRole("button", { name: /close tour/i })

      close.focus()
      fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true })

      expect(next).toHaveFocus()
    })

    it("keeps Shift+Tab from the heading inside the tooltip", () => {
      renderTour()
      const dialog = screen.getByRole("dialog")

      expect(screen.getByRole("heading", { level: 2 })).toHaveFocus()
      fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true })

      expect(screen.getByRole("button", { name: "Next" })).toHaveFocus()
    })

    it("returns focus to the trigger when the tour closes", async () => {
      const user = userEvent.setup()
      render(<TourHarness />)

      const trigger = screen.getByRole("button", { name: "Start tour" })
      await user.click(trigger)
      expect(screen.getByRole("heading", { level: 2 })).toHaveFocus()

      await user.click(screen.getByRole("button", { name: /skip tour/i }))

      await waitFor(() => expect(trigger).toHaveFocus())
    })
  })

  describe("screen reader announcements", () => {
    it("announces the current step through a polite live region", async () => {
      renderTour()
      const liveRegion = screen.getByRole("status")

      expect(liveRegion).toHaveAttribute("aria-live", "polite")
      await waitFor(() =>
        expect(liveRegion).toHaveTextContent("Step 1 of 3: Browse markets")
      )
    })

    it("re-announces after navigating to another step", async () => {
      renderTour()
      fireEvent.click(screen.getByRole("button", { name: "Next" }))

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent("Step 2 of 3: Place a bet")
      )
    })
  })

  describe("spotlight and fallback", () => {
    it("anchors to a target that has a layout box", () => {
      mountTarget("markets")
      renderTour()

      expect(screen.getByRole("dialog")).toHaveAttribute("data-variant", "anchored")
      expect(screen.getByTestId("onboarding-tour-spotlight")).toBeInTheDocument()
      // Four dim panels leave the target itself uncovered and clickable.
      expect(screen.getAllByTestId("onboarding-tour-backdrop")).toHaveLength(4)
    })

    it("falls back to a centered card when the target selector matches nothing", () => {
      renderTour()

      expect(screen.getByRole("dialog")).toHaveAttribute("data-variant", "centered")
      expect(screen.queryByTestId("onboarding-tour-spotlight")).not.toBeInTheDocument()
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Browse markets")
    })

    it("falls back to a centered card for a step with no target at all", () => {
      renderTour({ steps: [{ id: "intro", title: "Welcome", description: "Let's begin." }] })
      expect(screen.getByRole("dialog")).toHaveAttribute("data-variant", "centered")
    })

    it("does not throw on a malformed target selector", () => {
      expect(() =>
        renderTour({ steps: [{ id: "bad", title: "Oops", description: "Still usable.", target: "###" }] })
      ).not.toThrow()

      expect(screen.getByRole("dialog")).toHaveAttribute("data-variant", "centered")
    })

    it("falls back to a centered card when the target has no layout box", () => {
      mountTarget("markets", { width: 0, height: 0 })
      renderTour()

      expect(screen.getByRole("dialog")).toHaveAttribute("data-variant", "centered")
    })

    it("re-measures the target on resize", () => {
      const target = mountTarget("markets")
      renderTour()

      const before = screen.getByTestId("onboarding-tour-spotlight").style.top
      target.getBoundingClientRect = () =>
        ({ top: 400, left: 100, width: 200, height: 50, right: 300, bottom: 450, x: 100, y: 400, toJSON: () => ({}) }) as DOMRect

      act(() => {
        window.dispatchEvent(new Event("resize"))
      })

      expect(screen.getByTestId("onboarding-tour-spotlight").style.top).not.toBe(before)
    })
  })

  describe("reduced motion", () => {
    it("drops transition and animation classes when reduced motion is preferred", () => {
      mockMatchMedia({ reducedMotion: true })
      renderTour()

      const dialog = screen.getByRole("dialog")
      const content = screen.getByRole("heading", { level: 2 }).parentElement!

      expect(dialog.className).not.toContain("transition-all")
      expect(content.className).not.toContain("animate-in")
    })

    it("keeps transitions when reduced motion is not preferred", () => {
      mockMatchMedia({ reducedMotion: false })
      renderTour()

      const content = screen.getByRole("heading", { level: 2 }).parentElement!
      expect(content.className).toContain("animate-in")
    })
  })

  describe("body scroll lock", () => {
    it("locks scrolling while open and restores it on close", () => {
      const { unmount } = renderTour()
      expect(document.body.style.overflow).toBe("hidden")

      unmount()
      expect(document.body.style.overflow).toBe("")
    })

    it("does not lock scrolling while closed", () => {
      renderTour({ open: false })
      expect(document.body.style.overflow).toBe("")
    })
  })
})
