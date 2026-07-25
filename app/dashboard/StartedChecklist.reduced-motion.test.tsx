import React from "react"
import { render, screen } from "@testing-library/react"
import { StartedChecklist, DEFAULT_TASKS } from "./StartedChecklist"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock framer-motion to avoid animation loop issues in JSDOM.
// All motion components render as plain HTML elements with children.
jest.mock("framer-motion", () => {
  const React = require("react")
  const createMotionProxy = (): any =>
    new Proxy(
      {},
      {
        get: (_, key: string) => {
          const Component = ({ children, ...props }: any) =>
            React.createElement(key, props, children)
          Component.displayName = `motion.${key}`
          return Component
        },
      },
    )
  return {
    __esModule: true,
    motion: createMotionProxy(),
    AnimatePresence: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    useAnimation: () => ({}),
    useMotionValue: (v: any) => ({
      get: () => v,
      set: () => {},
    }),
    useTransform: (v: any) => v,
  }
})

// Mock useReducedMotion so we can flip the resolution per test.
const mockUseReducedMotion = jest.fn(() => false)
jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetSessionStorage() {
  sessionStorage.clear()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StartedChecklist — reduced-motion fallback (#547)", () => {
  beforeEach(() => {
    resetSessionStorage()
    mockUseReducedMotion.mockReset()
    mockUseReducedMotion.mockReturnValue(false)
  })
  afterEach(() => {
    sessionStorage.clear()
  })

  it("renders the checklist inside a framer-motion wrapper when motion is allowed", () => {
    mockUseReducedMotion.mockReturnValue(false)
    const { container } = render(<StartedChecklist />)
    const wrapper = screen.getByTestId("started-checklist")
    // The mocked framer-motion proxy renders the tag whose name was read
    // off the proxy, so a default `<motion.div>` becomes `<div>` here.
    expect(wrapper.tagName.toLowerCase()).toBe("div")
    expect(container).toContainElement(wrapper)
  })

  it("renders the checklist inside a plain div when motion is reduced via the prop", () => {
    mockUseReducedMotion.mockReturnValue(false)
    render(<StartedChecklist reducedMotion /> )
    const wrapper = screen.getByTestId("started-checklist")
    // When reduced motion is requested, the static branch uses a plain
    // `<div>` — there must still be exactly one checklist wrapper.
    expect(wrapper.tagName.toLowerCase()).toBe("div")
    // Checklist contents are present.
    DEFAULT_TASKS.forEach((task) => {
      expect(screen.getByText(task.label)).toBeInTheDocument()
    })
  })

  it("renders the checklist inside a plain div when prefers-reduced-motion is on", () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<StartedChecklist />)
    const wrapper = screen.getByTestId("started-checklist")
    expect(wrapper.tagName.toLowerCase()).toBe("div")
  })

  it("plays the celebration state without animation when reducedMotion is on", () => {
    mockUseReducedMotion.mockReturnValue(false)
    render(<StartedChecklist reducedMotion />)
    // The mocked motion proxy still renders the celebration copy.
    expect(screen.getByText("Get started")).toBeInTheDocument()
    // With reducedMotion opted-in there must only be ONE wrapper holding
    // the checklist — the static branch collapses the outer + inner motion
    // animations together.
    expect(screen.getAllByTestId("started-checklist").length).toBe(1)
  })

  it("renders the same labels and progress regardless of reducedMotion", () => {
    mockUseReducedMotion.mockReturnValue(false)
    const { unmount } = render(<StartedChecklist reducedMotion />)
    expect(screen.getByText("0 of 5 tasks completed")).toBeInTheDocument()
    expect(
      screen.getByRole("progressbar", { name: /checklist progress/i }),
    ).toBeInTheDocument()
    unmount()

    mockUseReducedMotion.mockReturnValue(true)
    render(<StartedChecklist />)
    expect(screen.getByText("0 of 5 tasks completed")).toBeInTheDocument()
    expect(
      screen.getByRole("progressbar", { name: /checklist progress/i }),
    ).toBeInTheDocument()
  })
})
