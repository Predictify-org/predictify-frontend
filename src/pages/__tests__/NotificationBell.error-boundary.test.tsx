import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import {
  NotificationBell,
  NotificationBellErrorFallback,
  NotificationBellWithErrorBoundary,
} from "../NotificationBell"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock framer-motion to avoid animation-loop issues in JSDOM.
jest.mock("framer-motion", () => {
  const React = require("react")
  const MOTION_ONLY_PROPS = new Set([
    "initial", "animate", "exit", "variants",
    "whileHover", "whileTap", "whileInView", "whileFocus", "whileDrag",
    "transition", "keyframes", "style",
    "onAnimationStart", "onAnimationComplete", "onUpdate",
    "onDragStart", "onDrag", "onDragEnd",
    "onViewportEnter", "onViewportLeave",
    "layout", "layoutId",
    "drag", "dragConstraints", "dragElastic", "dragMomentum",
    "dragPropagation", "dragSnapToOrigin",
  ])
  const createMotionProxy = (): any =>
    new Proxy({}, {
      get: (_, key: string) => {
        const Component = ({ children, ...props }: any) => {
          const domProps: any = {}
          for (const k of Object.keys(props)) {
            if (!MOTION_ONLY_PROPS.has(k)) domProps[k] = props[k]
          }
          return React.createElement(key, domProps, children)
        }
        Component.displayName = `motion.${key}`
        return Component
      },
    })
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

// Mock useReducedMotion
const mockUseReducedMotion = jest.fn(() => false)
jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}))

// Mock Radix UI Tooltip to avoid portal/animation issues in JSDOM.
jest.mock("@radix-ui/react-tooltip", () => ({
  Provider: ({ children }: any) => children,
  Root: ({ children }: any) => children,
  Trigger: React.forwardRef(
    ({ children, asChild, ...props }: any, ref: any) => {
      // If asChild is true, we need to clone the child element and add props
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
          ...props,
          ref,
          "data-tooltip-trigger": "true",
        } as any)
      }
      return React.createElement("button", { ...props, ref }, children)
    },
  ),
  Content: React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement("div", { ...props, ref, "data-tooltip-content": "true" }, children),
  ),
}))

// ---------------------------------------------------------------------------
// Tests: NotificationBellErrorFallback
// ---------------------------------------------------------------------------

describe("NotificationBellErrorFallback", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders a button with the error test-id", () => {
    render(<NotificationBellErrorFallback />)
    expect(
      screen.getByTestId("notification-bell-error"),
    ).toBeInTheDocument()
  })

  it("renders an error indicator icon", () => {
    render(<NotificationBellErrorFallback />)
    expect(
      screen.getByTestId("notification-bell-error-indicator"),
    ).toBeInTheDocument()
  })

  it("has accessible label describing the error state", () => {
    render(<NotificationBellErrorFallback />)
    const btn = screen.getByTestId("notification-bell-error")
    expect(btn.getAttribute("aria-label")).toMatch(/notifications unavailable/i)
  })

  it("calls resetErrorBoundary when clicked", () => {
    const reset = jest.fn()
    render(<NotificationBellErrorFallback resetErrorBoundary={reset} />)
    fireEvent.click(screen.getByTestId("notification-bell-error"))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it("renders a semantic <button> element", () => {
    render(<NotificationBellErrorFallback />)
    const btn = screen.getByTestId("notification-bell-error")
    expect(btn.tagName.toLowerCase()).toBe("button")
  })

  it("uses only semantic Tailwind tokens (no hardcoded hex colors)", () => {
    const { container } = render(<NotificationBellErrorFallback />)
    container.querySelectorAll("*").forEach((el) => {
      const style = el.getAttribute("style") ?? ""
      expect(style).not.toMatch(/#[0-9a-fA-F]{3,6}/)
      expect(style).not.toMatch(/rgba?\(/)
    })
  })

  it("applies a custom test-id prefix when provided", () => {
    render(<NotificationBellErrorFallback testId="custom-error" />)
    expect(screen.getByTestId("custom-error")).toBeInTheDocument()
    expect(
      screen.getByTestId("custom-error-indicator"),
    ).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Tests: NotificationBellWithErrorBoundary
// ---------------------------------------------------------------------------

describe("NotificationBellWithErrorBoundary", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReducedMotion.mockReturnValue(false)
  })

  it("renders the NotificationBell when no error occurs", () => {
    render(<NotificationBellWithErrorBoundary unreadCount={3} />)
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument()
    expect(screen.queryByTestId("notification-bell-error")).not.toBeInTheDocument()
  })

  it("passes props through to the inner NotificationBell", () => {
    const onClick = jest.fn()
    render(
      <NotificationBellWithErrorBoundary
        unreadCount={5}
        onClick={onClick}
        maxDisplay={10}
      />,
    )
    const btn = screen.getByTestId("notification-bell")
    expect(btn).toBeInTheDocument()
    expect(btn.getAttribute("aria-label")).toMatch(/5 unread/)
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("renders children when the ErrorBoundary has no error", () => {
    render(<NotificationBellWithErrorBoundary unreadCount={0} />)
    // The normal bell (no badge) should be rendered
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument()
    expect(screen.queryByTestId("notification-bell-badge")).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Tests: Exports
// ---------------------------------------------------------------------------

describe("NotificationBell exports", () => {
  it("exports the raw NotificationBell component", () => {
    expect(NotificationBell).toBeDefined()
    expect(typeof NotificationBell).toBe("function")
  })

  it("exports the NotificationBellErrorFallback component", () => {
    expect(NotificationBellErrorFallback).toBeDefined()
    expect(typeof NotificationBellErrorFallback).toBe("function")
  })

  it("exports the NotificationBellWithErrorBoundary component", () => {
    expect(NotificationBellWithErrorBoundary).toBeDefined()
    expect(typeof NotificationBellWithErrorBoundary).toBe("function")
  })

  it("default export is NotificationBellWithErrorBoundary", () => {
    // The default export is the wrapper, so importing with default
    // gives the error-boundary-wrapped version
    const defaultExport = require("../NotificationBell").default
    expect(defaultExport).toBe(NotificationBellWithErrorBoundary)
  })
})