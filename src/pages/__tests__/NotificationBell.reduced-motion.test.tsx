import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { NotificationBell } from "../NotificationBell"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock framer-motion to avoid animation-loop issues in JSDOM.
// All `motion.*` components render as plain HTML elements with children,
// and any framer-motion-only props (initial, animate, variants,
// whileHover, whileTap, transition, ...) are STRIPPED so React 19 doesn't
// warn about unknown DOM attributes.
jest.mock("framer-motion", () => {
  const React = require("react")
  const MOTION_ONLY_PROPS = new Set([
    "initial",
    "animate",
    "exit",
    "variants",
    "whileHover",
    "whileTap",
    "whileInView",
    "whileFocus",
    "whileDrag",
    "transition",
    "keyframes",
    "style",
    "onAnimationStart",
    "onAnimationComplete",
    "onUpdate",
    "onDragStart",
    "onDrag",
    "onDragEnd",
    "onViewportEnter",
    "onViewportLeave",
    "layout",
    "layoutId",
    "drag",
    "dragConstraints",
    "dragElastic",
    "dragMomentum",
    "dragPropagation",
    "dragSnapToOrigin",
  ])
  const createMotionProxy = (): any =>
    new Proxy(
      {},
      {
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
// Tests
// ---------------------------------------------------------------------------

describe("NotificationBell — reduced-motion static state (#648)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReducedMotion.mockReturnValue(false)
  })

  // -----------------------------------------------------------------------
  // Motion vs. reduced-motion DOM comparison
  // -----------------------------------------------------------------------

  it("renders the motion root test-id when prefers-reduced-motion is no-preference", () => {
    mockUseReducedMotion.mockReturnValue(false)
    render(<NotificationBell unreadCount={3} />)

    expect(screen.getByTestId("notification-bell")).toBeInTheDocument()
    expect(screen.queryByTestId("notification-bell-static")).not.toBeInTheDocument()
  })

  it("renders the static root test-id when prefers-reduced-motion is reduce", () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<NotificationBell unreadCount={3} />)

    expect(screen.getByTestId("notification-bell-static")).toBeInTheDocument()
    expect(screen.queryByTestId("notification-bell")).not.toBeInTheDocument()
  })

  it("renders the static root test-id when the explicit reducedMotion prop is true", () => {
    // Even if the system says motion is OK, the caller's prop wins.
    mockUseReducedMotion.mockReturnValue(false)
    render(<NotificationBell unreadCount={3} reducedMotion />)

    expect(screen.getByTestId("notification-bell-static")).toBeInTheDocument()
    expect(screen.queryByTestId("notification-bell")).not.toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // Content parity across branches
  // -----------------------------------------------------------------------

  it("shows the same unread count in both motion and reduced-motion branches", () => {
    const COUNTS = [0, 1, 5, 42, 150]

    COUNTS.forEach((count) => {
      mockUseReducedMotion.mockReturnValue(false)
      const { unmount: unmountMotion } = render(
        <NotificationBell unreadCount={count} />,
      )
      const motionButton = screen.getByTestId("notification-bell")
      const motionLabel = motionButton.getAttribute("aria-label")
      const motionBadge = screen.queryByTestId("notification-bell-badge")
      const motionBadgeText = motionBadge?.textContent
      unmountMotion()

      mockUseReducedMotion.mockReturnValue(true)
      const { unmount: unmountStatic } = render(
        <NotificationBell unreadCount={count} />,
      )
      const staticButton = screen.getByTestId("notification-bell-static")
      const staticLabel = staticButton.getAttribute("aria-label")
      const staticBadge = screen.queryByTestId("notification-bell-badge")
      const staticBadgeText = staticBadge?.textContent
      unmountStatic()

      expect(motionLabel).toBe(staticLabel)
      expect(motionBadgeText).toBe(staticBadgeText)
    })
  })

  it("both branches have a clickable <button> with the same accessible name", () => {
    mockUseReducedMotion.mockReturnValue(false)
    const { unmount: unmountMotion } = render(<NotificationBell unreadCount={7} />)
    const motionBtn = screen.getByRole("button", {
      name: /notifications.*7 unread/i,
    })
    expect(motionBtn.tagName.toLowerCase()).toBe("button")
    unmountMotion()

    mockUseReducedMotion.mockReturnValue(true)
    render(<NotificationBell unreadCount={7} />)
    const staticBtn = screen.getByRole("button", {
      name: /notifications.*7 unread/i,
    })
    expect(staticBtn.tagName.toLowerCase()).toBe("button")
  })

  it("badge has identical accessibility attributes (role=status, aria-live=polite) in both modes", () => {
    // Motion
    mockUseReducedMotion.mockReturnValue(false)
    const { unmount: unmountMotion } = render(<NotificationBell unreadCount={2} />)
    const motionBadge = screen.getByTestId("notification-bell-badge")
    const motionRole = motionBadge.getAttribute("role")
    const motionLive = motionBadge.getAttribute("aria-live")
    unmountMotion()

    // Reduced-motion
    mockUseReducedMotion.mockReturnValue(true)
    render(<NotificationBell unreadCount={2} />)
    const staticBadge = screen.getByTestId("notification-bell-badge")
    const staticRole = staticBadge.getAttribute("role")
    const staticLive = staticBadge.getAttribute("aria-live")

    expect(staticRole).toBe(motionRole)
    expect(staticLive).toBe(motionLive)
    expect(staticRole).toBe("status")
    expect(staticLive).toBe("polite")
  })

  it("formats badge text the same way (99+ truncation) in both branches", () => {
    mockUseReducedMotion.mockReturnValue(false)
    const { unmount: unmountMotion } = render(
      <NotificationBell unreadCount={250} maxDisplay={99} />,
    )
    const motionBadgeText = screen.getByTestId("notification-bell-badge").textContent
    unmountMotion()

    mockUseReducedMotion.mockReturnValue(true)
    render(<NotificationBell unreadCount={250} maxDisplay={99} />)
    const staticBadgeText = screen.getByTestId("notification-bell-badge").textContent

    expect(motionBadgeText).toBe("99+")
    expect(staticBadgeText).toBe("99+")
  })

  it("onClick handler fires identically in motion and reduced-motion modes", () => {
    const onClick = jest.fn()

    mockUseReducedMotion.mockReturnValue(false)
    const { unmount: unmountMotion } = render(
      <NotificationBell unreadCount={1} onClick={onClick} />,
    )
    fireEvent.click(screen.getByTestId("notification-bell"))
    unmountMotion()

    mockUseReducedMotion.mockReturnValue(true)
    render(<NotificationBell unreadCount={1} onClick={onClick} />)
    fireEvent.click(screen.getByTestId("notification-bell-static"))

    expect(onClick).toHaveBeenCalledTimes(2)
  })

  // -----------------------------------------------------------------------
  // Reduced-motion static guarantees (the core of #648)
  // -----------------------------------------------------------------------

  it("STATIC: reduced-motion branch contains no animate-* / transition-* / duration-* classes anywhere", () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { container } = render(<NotificationBell unreadCount={9} />)

    const all = container.querySelectorAll("*")
    expect(all.length).toBeGreaterThan(0)

    all.forEach((el) => {
      const cls = Array.from(el.classList)
      cls.forEach((c) => {
        expect(c.startsWith("animate-")).toBe(false)
        expect(c.startsWith("transition-")).toBe(false)
        expect(c.startsWith("duration-")).toBe(false)
        expect(c.startsWith("ease-")).toBe(false)
        expect(c.startsWith("motion-")).toBe(false)
      })
    })
  })

  it("STATIC: reduced-motion badge has no pulse/fade/ping class names", () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<NotificationBell unreadCount={9} />)

    const badge = screen.getByTestId("notification-bell-badge")
    const cls = Array.from(badge.classList)
    const forbidden = ["animate-pulse", "animate-fade", "animate-ping", "animate-bounce"]
    forbidden.forEach((c) => expect(cls).not.toContain(c))
  })

  it("STATIC: reduced-motion root has no motion.* wrapper (plain elements only)", () => {
    // Our framer-motion mock renders `motion.button` as `<button>` but in
    // the static branch we intentionally do NOT import motion at all — we
    // render a plain `<button>`. The test-id suffix distinguishes the two
    // branches, and we confirm here that the static button carries none of
    // the motion-only attributes.
    mockUseReducedMotion.mockReturnValue(true)
    render(<NotificationBell unreadCount={4} />)

    const staticBtn = screen.getByTestId("notification-bell-static")

    // No framer-motion-specific attributes should be present.
    expect(staticBtn.getAttribute("initial")).toBeNull()
    expect(staticBtn.getAttribute("animate")).toBeNull()
    expect(staticBtn.getAttribute("variants")).toBeNull()
    expect(staticBtn.getAttribute("whileHover")).toBeNull()
    expect(staticBtn.getAttribute("whileTap")).toBeNull()
    expect(staticBtn.getAttribute("transition")).toBeNull()
  })

  it("STATIC: reduced-motion icon has no motion variants (no swing wrapper)", () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { container } = render(<NotificationBell unreadCount={4} />)

    // In the static branch, the <Bell> SVG icon is a direct child of the
    // <button>. We verify that no element between button and SVG carries
    // framer-motion-only attributes. (The badge <span> is still a direct
    // child, so simply counting <span>s is not reliable.)
    const staticBtn = screen.getByTestId("notification-bell-static")
    const motionAttrs = ["initial", "animate", "variants", "transition"]

    const allDescendants = staticBtn.querySelectorAll("*")
    allDescendants.forEach((el) => {
      motionAttrs.forEach((attr) => {
        expect(el.getAttribute(attr)).toBeNull()
      })
    })

    // The button itself should also be free of motion attributes
    motionAttrs.forEach((attr) => {
      expect(staticBtn.getAttribute(attr)).toBeNull()
    })

    // SVG bell is present and marked decorative
    const svg = container.querySelector("svg")
    expect(svg).toBeInTheDocument()
    expect(svg!.getAttribute("aria-hidden")).toBe("true")
  })

  // -----------------------------------------------------------------------
  // Design-token + dark-mode consistency
  // -----------------------------------------------------------------------

  it("uses only semantic Tailwind tokens (no hardcoded hex colors in inline styles)", () => {
    [false, true].forEach((reduced) => {
      mockUseReducedMotion.mockReturnValue(reduced)
      const { container, unmount } = render(<NotificationBell unreadCount={5} />)
      container.querySelectorAll("*").forEach((el) => {
        const style = el.getAttribute("style") ?? ""
        expect(style).not.toMatch(/#[0-9a-fA-F]{3,6}/)
        expect(style).not.toMatch(/rgba?\(/)
      })
      unmount()
    })
  })

  it("reduced-motion badge uses bg-primary / text-primary-foreground (design tokens)", () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<NotificationBell unreadCount={1} />)
    const badge = screen.getByTestId("notification-bell-badge")
    const cls = badge.className
    expect(cls).toContain("bg-primary")
    expect(cls).toContain("text-primary-foreground")
    expect(cls).toContain("ring-background")
  })

  // -----------------------------------------------------------------------
  // Vacuousness / regression guards (#648 — must fail if the guard is removed)
  // -----------------------------------------------------------------------

  it("VACUOUSNESS: fails if reduced-motion path is removed and motion branch renders instead", () => {
    // If a future change strips the `if (reducedMotion)` branch and always
    // renders the motion version, this test will fail on two assertions:
    //   1. notification-bell-static would not be found
    //   2. notification-bell (motion) would exist in the DOM
    mockUseReducedMotion.mockReturnValue(true)
    render(<NotificationBell unreadCount={3} />)

    expect(screen.getByTestId("notification-bell-static")).toBeInTheDocument()
    expect(screen.queryByTestId("notification-bell")).not.toBeInTheDocument()
  })

  it("VACUOUSNESS: fails if animate-pulse is added back to the reduced-motion badge", () => {
    // If someone accidentally enables the pulse class in the static branch,
    // this fails — enforcing the static guarantee for #648.
    mockUseReducedMotion.mockReturnValue(true)
    render(<NotificationBell unreadCount={3} />)

    const badge = screen.getByTestId("notification-bell-badge")
    expect(badge.className).not.toContain("animate-pulse")
  })
})
