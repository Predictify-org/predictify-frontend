"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, ArrowRight, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LiveRegion } from "@/components/ui/live-region"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { useFocusReturn } from "@/app/hooks/useFocusReturn"

/** Breathing room in px between a highlighted element and the spotlight ring. */
const SPOTLIGHT_PADDING = 8
/** Gap in px between the spotlight ring and the anchored tooltip. */
const TOOLTIP_OFFSET = 12
/** Layout width in px the anchored tooltip is positioned against (matches `w-80`). */
const TOOLTIP_WIDTH = 320
/**
 * Height in px assumed for the tooltip when deciding whether a placement fits.
 * The real height is only known after paint, and a fixed estimate keeps the
 * flip decision stable instead of oscillating between two placements.
 */
const TOOLTIP_ESTIMATED_HEIGHT = 200
/** Minimum px kept between the tooltip and the viewport edge. */
const VIEWPORT_MARGIN = 16

/** Elements that can receive focus inside the tooltip, used by the focus trap. */
const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ")

/** Side of the target the tooltip is anchored to. */
export type OnboardingTourPlacement = "top" | "bottom" | "left" | "right"

/** A single stop in the tour. */
export interface OnboardingStep {
  /** Stable identifier. Used as the React key, so it must be unique per tour. */
  id: string
  /** Short heading. Focus moves here on every step change. */
  title: string
  /** Body copy explaining what the highlighted element does. */
  description: string
  /**
   * CSS selector for the element to spotlight. When omitted, when the selector
   * matches nothing, or when the match has no layout box, the step falls back
   * to a centered card over a full-screen dim.
   */
  target?: string
  /**
   * Preferred side to anchor the tooltip on. Automatically flips to a side with
   * enough room when the preferred one would overflow the viewport.
   * Defaults to `"bottom"`.
   */
  placement?: OnboardingTourPlacement
}

export interface OnboardingTourProps {
  /** Ordered steps. Rendering is skipped entirely when empty. */
  steps: OnboardingStep[]
  /** Whether the tour is visible. The component is fully controlled. */
  open: boolean
  /**
   * Called when the tour should close: the Finish button, the close button,
   * "Skip tour", the Escape key, or a click on the dimmed backdrop.
   */
  onClose: () => void
  /**
   * Called after the visible step changes, with the new index and step. Not
   * called for the initial step — only for subsequent navigation.
   */
  onStepChange?: (index: number, step: OnboardingStep) => void
  /** Step to open on. Clamped into range. Defaults to `0`. */
  initialStep?: number
  /** Extra classes for the tooltip surface. */
  className?: string
}

/** Viewport-relative box of the spotlit element. */
interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

/** Clamp `value` into the inclusive `[0, max]` range. */
function clampIndex(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(Math.trunc(value), 0), Math.max(max, 0))
}

/**
 * Pick the side to anchor the tooltip on, preferring `preferred` and falling
 * back to the first side with enough free space. When nothing fits — a target
 * filling the viewport, for instance — the preferred side is kept and the
 * caller clamps the tooltip back inside the viewport.
 */
function resolvePlacement(
  preferred: OnboardingTourPlacement,
  rect: SpotlightRect,
  viewportWidth: number,
  viewportHeight: number
): OnboardingTourPlacement {
  const space: Record<OnboardingTourPlacement, number> = {
    top: rect.top - SPOTLIGHT_PADDING,
    bottom: viewportHeight - (rect.top + rect.height + SPOTLIGHT_PADDING),
    left: rect.left - SPOTLIGHT_PADDING,
    right: viewportWidth - (rect.left + rect.width + SPOTLIGHT_PADDING),
  }

  const required = (placement: OnboardingTourPlacement) =>
    placement === "top" || placement === "bottom"
      ? TOOLTIP_ESTIMATED_HEIGHT + TOOLTIP_OFFSET
      : TOOLTIP_WIDTH + TOOLTIP_OFFSET

  if (space[preferred] >= required(preferred)) return preferred

  const fallbackOrder: OnboardingTourPlacement[] = ["bottom", "top", "right", "left"]
  return fallbackOrder.find((placement) => space[placement] >= required(placement)) ?? preferred
}

/** Absolute position for the anchored tooltip, clamped inside the viewport. */
function getTooltipPosition(
  rect: SpotlightRect,
  placement: OnboardingTourPlacement,
  viewportWidth: number,
  viewportHeight: number
): React.CSSProperties {
  let top: number
  let left: number

  switch (placement) {
    case "top":
      top = rect.top - SPOTLIGHT_PADDING - TOOLTIP_OFFSET - TOOLTIP_ESTIMATED_HEIGHT
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2
      break
    case "left":
      top = rect.top + rect.height / 2 - TOOLTIP_ESTIMATED_HEIGHT / 2
      left = rect.left - SPOTLIGHT_PADDING - TOOLTIP_OFFSET - TOOLTIP_WIDTH
      break
    case "right":
      top = rect.top + rect.height / 2 - TOOLTIP_ESTIMATED_HEIGHT / 2
      left = rect.left + rect.width + SPOTLIGHT_PADDING + TOOLTIP_OFFSET
      break
    case "bottom":
    default:
      top = rect.top + rect.height + SPOTLIGHT_PADDING + TOOLTIP_OFFSET
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2
      break
  }

  return {
    top: Math.min(
      Math.max(top, VIEWPORT_MARGIN),
      Math.max(viewportHeight - TOOLTIP_ESTIMATED_HEIGHT - VIEWPORT_MARGIN, VIEWPORT_MARGIN)
    ),
    left: Math.min(
      Math.max(left, VIEWPORT_MARGIN),
      Math.max(viewportWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN, VIEWPORT_MARGIN)
    ),
    width: TOOLTIP_WIDTH,
  }
}

/**
 * Guided product tour rendered as a modal overlay.
 *
 * Each step dims the page and cuts a spotlight around its target element, with
 * the tooltip anchored beside it. Steps without a resolvable target degrade to
 * a centered card, so a tour never breaks when the UI it describes is absent.
 *
 * Focus behaviour: the triggering element is remembered on open, focus moves to
 * the step heading on open and after every step change, Tab and Shift+Tab cycle
 * within the tooltip, and focus returns to the trigger on close. Step changes
 * are announced through a polite live region. Motion is dropped entirely when
 * the user prefers reduced motion.
 *
 * The progress dots double as jump-to-step controls: hovering or focusing one
 * previews that step's title and description in a small card before
 * committing to it, and clicking jumps straight there.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false)
 *
 * <OnboardingTour
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   steps={[
 *     { id: "markets", title: "Browse markets", description: "…", target: "#markets" },
 *     { id: "wallet", title: "Connect a wallet", description: "…", target: "#wallet", placement: "left" },
 *   ]}
 * />
 * ```
 */
export function OnboardingTour({
  steps,
  open,
  onClose,
  onStepChange,
  initialStep = 0,
  className,
}: OnboardingTourProps) {
  const total = steps.length
  const lastIndex = total - 1

  const [index, setIndex] = React.useState(() => clampIndex(initialStep, lastIndex))
  const [spotlight, setSpotlight] = React.useState<SpotlightRect | null>(null)
  const [mounted, setMounted] = React.useState(false)

  const tooltipRef = React.useRef<HTMLDivElement>(null)
  const headingRef = React.useRef<HTMLHeadingElement>(null)

  const reducedMotion = useReducedMotion()
  const isWide = useMediaQuery("(min-width: 640px)")
  const { storeTrigger, restoreFocus } = useFocusReturn()

  const titleId = React.useId()
  const descriptionId = React.useId()

  const step: OnboardingStep | undefined = steps[index]
  const targetSelector = step?.target

  // Portals need a DOM, so hold off until after hydration.
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Reopening restarts from `initialStep` rather than resuming where the user left off.
  React.useEffect(() => {
    if (open) setIndex(clampIndex(initialStep, total - 1))
  }, [open, initialStep, total])

  // Remember the trigger on open and hand focus back to it on close.
  React.useEffect(() => {
    if (!open) return
    storeTrigger()
    return () => {
      restoreFocus()
    }
  }, [open, storeTrigger, restoreFocus])

  // The heading is the landing point on open and after every step change, so
  // screen readers read the new step instead of stranding focus on a button
  // whose label ("Next") did not change.
  // `mounted` is a dependency because the first render portals nothing: the
  // heading only exists on the render after hydration flips `mounted`.
  React.useEffect(() => {
    if (!open || !mounted) return
    headingRef.current?.focus()
  }, [open, mounted, index])

  // Lock background scrolling while the overlay owns the screen.
  React.useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  const measure = React.useCallback(() => {
    if (!targetSelector) {
      setSpotlight(null)
      return
    }

    let element: Element | null = null
    try {
      element = document.querySelector(targetSelector)
    } catch {
      // Malformed selector — fall back to the centered card instead of throwing.
      element = null
    }

    if (!element) {
      setSpotlight(null)
      return
    }

    const rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      // Hidden or unrendered target (also the jsdom default) — centered card.
      setSpotlight(null)
      return
    }

    setSpotlight({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
  }, [targetSelector])

  // Re-measure on step change and whenever the page moves under the overlay.
  React.useLayoutEffect(() => {
    if (!open) return
    measure()
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, { capture: true, passive: true })
    return () => {
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, { capture: true })
    }
  }, [open, measure])

  const goTo = React.useCallback(
    (next: number) => {
      const clamped = clampIndex(next, total - 1)
      if (clamped === index) return
      setIndex(clamped)
      const nextStep = steps[clamped]
      if (nextStep) onStepChange?.(clamped, nextStep)
    },
    [index, onStepChange, steps, total]
  )

  const handleNext = React.useCallback(() => {
    if (index >= lastIndex) {
      onClose()
      return
    }
    goTo(index + 1)
  }, [goTo, index, lastIndex, onClose])

  const handleBack = React.useCallback(() => {
    if (index > 0) goTo(index - 1)
  }, [goTo, index])

  /**
   * Keep Tab within the tooltip. The focusable set is recomputed on every
   * keypress because the controls change between steps ("Back" is absent on
   * the first step, "Next" becomes "Finish" on the last).
   */
  const trapFocus = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const container = tooltipRef.current
    if (!container) return

    const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const activeIndex = focusable.indexOf(document.activeElement as HTMLElement)

    if (event.shiftKey) {
      // Also covers the heading, which is focusable but outside `focusable`.
      if (activeIndex <= 0) {
        event.preventDefault()
        last.focus()
      }
      return
    }

    if (activeIndex === focusable.length - 1) {
      event.preventDefault()
      first.focus()
    }
  }, [])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case "Escape":
          event.preventDefault()
          onClose()
          break
        case "ArrowRight":
          event.preventDefault()
          handleNext()
          break
        case "ArrowLeft":
          event.preventDefault()
          handleBack()
          break
        case "Home":
          event.preventDefault()
          goTo(0)
          break
        case "End":
          event.preventDefault()
          goTo(lastIndex)
          break
        case "Tab":
          trapFocus(event)
          break
        default:
          break
      }
    },
    [goTo, handleBack, handleNext, lastIndex, onClose, trapFocus]
  )

  const tooltipStyle = React.useMemo<React.CSSProperties | undefined>(() => {
    // Below `sm` the tooltip is a full-width bottom sheet, so it needs no
    // measured position — anchoring a 320px card next to a target is a
    // desktop-only affordance.
    if (!spotlight || !isWide) return undefined
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const placement = resolvePlacement(
      step?.placement ?? "bottom",
      spotlight,
      viewportWidth,
      viewportHeight
    )
    return getTooltipPosition(spotlight, placement, viewportWidth, viewportHeight)
  }, [spotlight, isWide, step?.placement])

  if (!mounted || !open || total === 0 || !step) return null

  const isFirst = index === 0
  const isLast = index === lastIndex

  /** Four panels around the spotlight leave the target itself clickable. */
  const backdrop = spotlight ? (
    <>
      <div
        aria-hidden="true"
        data-testid="onboarding-tour-backdrop"
        onClick={onClose}
        className="fixed left-0 right-0 top-0 z-50 bg-foreground/70"
        style={{ height: Math.max(spotlight.top - SPOTLIGHT_PADDING, 0) }}
      />
      <div
        aria-hidden="true"
        data-testid="onboarding-tour-backdrop"
        onClick={onClose}
        className="fixed bottom-0 left-0 right-0 z-50 bg-foreground/70"
        style={{ top: spotlight.top + spotlight.height + SPOTLIGHT_PADDING }}
      />
      <div
        aria-hidden="true"
        data-testid="onboarding-tour-backdrop"
        onClick={onClose}
        className="fixed left-0 z-50 bg-foreground/70"
        style={{
          top: spotlight.top - SPOTLIGHT_PADDING,
          height: spotlight.height + SPOTLIGHT_PADDING * 2,
          width: Math.max(spotlight.left - SPOTLIGHT_PADDING, 0),
        }}
      />
      <div
        aria-hidden="true"
        data-testid="onboarding-tour-backdrop"
        onClick={onClose}
        className="fixed right-0 z-50 bg-foreground/70"
        style={{
          top: spotlight.top - SPOTLIGHT_PADDING,
          height: spotlight.height + SPOTLIGHT_PADDING * 2,
          left: spotlight.left + spotlight.width + SPOTLIGHT_PADDING,
        }}
      />
      <div
        aria-hidden="true"
        data-testid="onboarding-tour-spotlight"
        className={cn(
          "pointer-events-none fixed z-50 rounded-lg ring-2 ring-ring ring-offset-2 ring-offset-background",
          !reducedMotion && "transition-all duration-200 ease-out"
        )}
        style={{
          top: spotlight.top - SPOTLIGHT_PADDING,
          left: spotlight.left - SPOTLIGHT_PADDING,
          width: spotlight.width + SPOTLIGHT_PADDING * 2,
          height: spotlight.height + SPOTLIGHT_PADDING * 2,
        }}
      />
    </>
  ) : (
    <div
      aria-hidden="true"
      data-testid="onboarding-tour-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-foreground/70"
    />
  )

  return createPortal(
    <>
      {backdrop}

      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-testid="onboarding-tour"
        data-step={index}
        data-variant={spotlight ? "anchored" : "centered"}
        onKeyDown={handleKeyDown}
        style={tooltipStyle}
        className={cn(
          "fixed z-50 border border-border bg-card p-6 text-card-foreground shadow-lg",
          // Bottom sheet on small screens, floating card from `sm` up.
          isWide
            ? "w-80 rounded-2xl"
            : "inset-x-0 bottom-0 rounded-t-2xl pb-[calc(1.5rem+var(--safe-pb))]",
          // A step without a target is centered rather than anchored.
          isWide && !spotlight && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          !reducedMotion && "transition-all duration-200 ease-out",
          className
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tour"
          className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div
          key={step.id}
          className={cn(
            "space-y-2 pr-10",
            !reducedMotion && "animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
          )}
        >
          <p className="text-caption uppercase text-muted-foreground">
            Step {index + 1} of {total}
          </p>
          <h2
            ref={headingRef}
            id={titleId}
            tabIndex={-1}
            className="text-h5 font-semibold text-foreground outline-none"
          >
            {step.title}
          </h2>
          <p id={descriptionId} className="text-body-sm text-muted-foreground">
            {step.description}
          </p>
        </div>

        {/*
         * Each dot doubles as a jump-to-step control. Hovering (or, for
         * keyboard/touch users who can't hover, focusing) it previews that
         * step's title and description via Tooltip — which shows on both
         * hover and focus out of the box, so the preview needs no separate
         * keyboard-only affordance.
         */}
        <TooltipProvider delayDuration={200}>
          <div className="mt-4 flex gap-1.5">
            {steps.map((dot, dotIndex) => (
              <Tooltip key={dot.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => goTo(dotIndex)}
                    aria-label={`Preview step ${dotIndex + 1} of ${total}: ${dot.title}`}
                    aria-current={dotIndex === index ? "step" : undefined}
                    className={cn(
                      "touch-target-expand relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      "h-1.5",
                      !reducedMotion && "transition-all duration-200",
                      dotIndex === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40"
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-64 space-y-1">
                  <p className="font-medium text-popover-foreground">{dot.title}</p>
                  <p className="text-xs text-muted-foreground">{dot.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="min-h-11 text-muted-foreground hover:text-foreground"
          >
            Skip tour
          </Button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button type="button" variant="outline" onClick={handleBack} className="min-h-11">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
            )}
            <Button type="button" onClick={handleNext} className="min-h-11">
              {isLast ? "Finish" : "Next"}
              {!isLast && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </div>

      <LiveRegion message={`Step ${index + 1} of ${total}: ${step.title}`} />
    </>,
    document.body
  )
}
