# Onboarding Tour Overlay

A guided, step-by-step product tour rendered as a modal overlay. Each step dims
the page, cuts a spotlight around the element it describes, and anchors a tooltip
beside it — with polished step transitions and a focus flow designed for keyboard
and screen-reader users.

The component is **fully controlled** and **presentation-only**: it takes `steps`
and `open`, and reports back through `onClose` / `onStepChange`. It holds no
persistence and mounts itself nowhere, so a host page decides when a tour runs.

## Pieces

| File | Responsibility |
| --- | --- |
| [`app/components/OnboardingTour.tsx`](../app/components/OnboardingTour.tsx) | The whole overlay: spotlight measurement, placement, transitions, focus management, keyboard handling. |
| [`hooks/useReducedMotion.ts`](../hooks/useReducedMotion.ts) | Reports `prefers-reduced-motion`. All motion is gated behind it. |
| [`app/hooks/useFocusReturn.ts`](../app/hooks/useFocusReturn.ts) | Remembers the triggering element and hands focus back on close. |
| [`components/ui/live-region.tsx`](../components/ui/live-region.tsx) | Polite `role="status"` region used to announce step changes. |
| [`hooks/use-media-query.ts`](../hooks/use-media-query.ts) | Drives the bottom-sheet / anchored-card switch at the `sm` breakpoint. |

## Usage

```tsx
"use client"

import { useState } from "react"
import { OnboardingTour, type OnboardingStep } from "@/app/components/OnboardingTour"

const STEPS: OnboardingStep[] = [
  { id: "markets", title: "Browse markets", description: "Every open market lives here.", target: "#markets" },
  { id: "bet", title: "Place a bet", description: "Pick an outcome and stake.", target: "#bet-form", placement: "left" },
  { id: "wallet", title: "Connect a wallet", description: "Fund your account to start.", target: "#wallet-button" },
]

export function DashboardTour() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}>Take the tour</button>
      <OnboardingTour steps={STEPS} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
```

## API

### `OnboardingTourProps`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `steps` | `OnboardingStep[]` | — | Ordered steps. An empty array renders nothing. |
| `open` | `boolean` | — | Visibility. The component is fully controlled. |
| `onClose` | `() => void` | — | Fired by Finish, the close button, "Skip tour", `Escape`, or a backdrop click. |
| `onStepChange` | `(index: number, step: OnboardingStep) => void` | — | Fired **after** the step changes. Not fired for the initial step. |
| `initialStep` | `number` | `0` | Step to open on. Clamped into range. Reopening restarts here rather than resuming. |
| `className` | `string` | — | Extra classes for the tooltip surface. |

### `OnboardingStep`

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Stable, unique. Used as the React key, so it drives the step-change transition. |
| `title` | `string` | Heading. Focus lands here on every step change. |
| `description` | `string` | Body copy. |
| `target` | `string?` | CSS selector for the element to spotlight. Omit for a centered step. |
| `placement` | `"top" \| "bottom" \| "left" \| "right"?` | Preferred anchor side. Defaults to `"bottom"`; flips automatically when it would overflow. |

## Step transitions

- The step content is keyed by `step.id`, so each step remounts and replays
  `animate-in fade-in-0 slide-in-from-bottom-1` (200 ms).
- The spotlight ring, tooltip position, and progress dots animate with
  `transition-all duration-200 ease-out`, so moving between two visible targets
  reads as one continuous motion rather than a jump cut.
- **Every one of those is gated behind `useReducedMotion()`.** When a user
  prefers reduced motion, no transition or animation class is emitted at all and
  steps swap instantly. This is asserted by a test, not just by inspection.

## Focus flow

1. **On open** — `storeTrigger()` records whatever had focus, then focus moves to
   the step's `<h2>` (`tabIndex={-1}`).
2. **On every step change** — focus returns to the heading. This is deliberate:
   leaving focus on "Next", whose label doesn't change, means a screen-reader
   user gets no signal that the step advanced.
3. **While open** — `Tab` and `Shift+Tab` cycle within the tooltip. The focusable
   set is recomputed on each keypress because the controls change between steps
   ("Back" is absent on step 1; "Next" becomes "Finish" on the last step).
4. **On close** — `restoreFocus()` returns focus to the element that opened the
   tour, including when the tour unmounts without an explicit close.

## Keyboard

| Key | Action |
| --- | --- |
| `→` | Next step (Finish on the last step) |
| `←` | Previous step |
| `Home` | Jump to the first step |
| `End` | Jump to the last step |
| `Tab` / `Shift+Tab` | Cycle focus within the tooltip |
| `Escape` | Close the tour |

`Enter` is intentionally **not** bound at the overlay level — it activates the
natively focused button instead, so it can never double-fire.

## Fallback behaviour

A step degrades to a **centered card over a full-screen dim** — same content,
same controls, same keyboard model — whenever the target can't be resolved:

| Situation | Result |
| --- | --- |
| `target` omitted | Centered card (an intentional "welcome" step) |
| Selector matches nothing | Centered card |
| Malformed selector (e.g. `"###"`) | Centered card; `querySelector` is wrapped in `try/catch` |
| Target has a zero-size rect (hidden, `display: none`, not yet rendered) | Centered card |

This means a tour never breaks when the UI it describes is absent — an
A/B-hidden button or a feature-flagged panel degrades instead of throwing. The
active variant is exposed as `data-variant="anchored" \| "centered"` for tests.

The spotlight is measured on every step change and re-measured on `resize` and
capture-phase `scroll`, so the ring tracks the target as the page moves.

## Responsive behaviour

| Breakpoint | Layout |
| --- | --- |
| `< 640px` | Full-width bottom sheet, bottom-anchored, padded with the repo's `var(--safe-pb)` safe-area token. No measured positioning. |
| `≥ 640px` | 320px card anchored beside the target, auto-flipping to a side with room and clamped 16px inside the viewport. |

All controls are at least 44×44 px (`min-h-11`).

## Dark mode and design tokens

Styling uses design tokens exclusively — `bg-card`, `text-card-foreground`,
`border-border`, `text-muted-foreground`, `bg-primary`, `ring-ring`, and
`bg-foreground/70` for the dim. No `dark:` overrides are needed; the overlay
follows the theme automatically. The focus ring comes from the global
[`app/styles/focus.css`](../app/styles/focus.css) layer.

## Accessibility

WCAG 2.1 AA criteria this component is built against:

| Criterion | How it's met |
| --- | --- |
| **1.4.11** Non-text Contrast | Spotlight ring uses `ring-ring` with a background-coloured offset, the same token pair as the global focus layer. |
| **2.1.1** Keyboard | Every action — navigate, skip, close — is reachable by keyboard. |
| **2.1.2** No Keyboard Trap | The focus cycle is deliberate, and `Escape` always exits it. |
| **2.3.3** Animation from Interactions | All motion is dropped under `prefers-reduced-motion`. |
| **2.4.3** Focus Order | Focus enters at the heading, cycles through controls in DOM order, and returns to the trigger on close. |
| **2.4.7** Focus Visible | Inherited from the global `:focus-visible` layer. |
| **2.5.5** Target Size | Controls are `min-h-11` (44 px). |
| **4.1.2** Name, Role, Value | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → title, `aria-describedby` → description. |
| **4.1.3** Status Messages | Step changes announce "Step *n* of *N*: *title*" through a polite live region. |

The progress dots are `aria-hidden` and non-interactive by design: at 6 px they
could not meet the 44 px target size, and the position they convey is already
available as visible text ("Step 2 of 3") and in the live region. `Home` and
`End` cover jumping to the first and last step.

## Testing

```bash
pnpm test -- app/components/__tests__/OnboardingTour.test.tsx

# Coverage for this file specifically — note that jest.config.js's
# collectCoverageFrom does not include app/**, so it must be named explicitly.
npx jest --coverage --collectCoverageFrom='app/components/OnboardingTour.tsx' \
  --testPathPattern='OnboardingTour'
```

Because jsdom performs no layout, `getBoundingClientRect()` returns a zero-sized
rect for every element — which the component reads as "no resolvable target".
Tests that exercise the anchored branch therefore mount a target with a stubbed
rect; see `mountTarget()` in the test file. `window.matchMedia` also has to be
mocked, since both `useReducedMotion` and `useMediaQuery` call it on mount.

## Known follow-ups

- No persistence layer yet. A `useOnboardingTour` hook with `localStorage`
  first-run gating would follow the pattern in
  [`hooks/use-whats-new.ts`](../hooks/use-whats-new.ts).
- The tour is not mounted on any page; real step content still needs authoring.
- An off-screen target is spotlit where it sits rather than being scrolled into
  view first.
