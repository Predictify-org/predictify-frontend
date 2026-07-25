# Dashboard reduced-motion fallback — #547

This document describes the reduced-motion (a11y) fallback added to the
**Dashboard** page in `app/(dashboard)/dashboard/page.tsx` and the
supporting API changes in `app/dashboard/StartedChecklist.tsx`.

> **Context:** GrantFox FWC26 campaign — Stellar Wave. Acceptance criteria:
> WCAG 2.1 AA, design-token + dark-mode consistency, focused tests,
> docs and inline comments.

---

## Why

`prefers-reduced-motion: reduce` is an OS / browser-level accessibility
setting (also honourable via **Settings → Motion** at `/settings/motion`)
that signals a user wishes to minimise non-essential motion. Some
Vestibular Spectrum Disorder users experience nausea, headache or loss
of orientation when exposed to large-scale motion, fading, scaling,
spinning or auto-playing animations — see the WCAG 2.1 SC
[2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html).

The legacy Dashboard used a 1500ms simulated loading delay before
swapping in the populated KPI grid. This document now describes how the
page degrades to a fully static view whenever motion is reduced.

---

## What's new

### 1. Dashboard page — `app/(dashboard)/dashboard/page.tsx`

- Imports `useReducedMotion` from `@/hooks/useReducedMotion`.
- When the preference is set **on**, the simulated 1500ms `setTimeout`
  is bypassed and the populated state is committed synchronously inside
  the same render — no `Skeleton` flash, no transitionary state.
- When the preference is **off**, the original 1500ms loading path is
  preserved.
- A dedicated inline status banner is rendered above the page heading so
  the static mode is visible to sighted users and announced to screen
  reader users.
- A dedicated polite live region now announces dashboard state changes
  (loading, loaded, empty, error, refresh, and tab-context changes)
  without moving focus.

### 2. StartedChecklist component — `app/dashboard/StartedChecklist.tsx`

- New optional prop `reducedMotion?: boolean`. When `true` (explicit
  prop), or `true` (system preference via `useReducedMotion`), the
  entrance / exit animations from `framer-motion` are skipped and the
  checklist is rendered as a plain subtree with the same DOM structure.
- The internal `Card` content is identical in both branches — only the
  outer wrapper changes from `motion.div` to `<div>` (and the celebration
  sub-wrapper from `motion.div` to `<div>`).
- New `data-testid="started-checklist"` on the wrapper for testing.

### 3. Tests

- **`app/(dashboard)/dashboard/__tests__/page.reduced-motion.test.tsx`** —
  focused tests covering:
  - Loading state path (motion allowed) shows Skeletons that resolve
    after 1500ms.
  - Reduced-motion path shows stat values **immediately** without
    timers.
  - Status banner is rendered with `role="status"` + `aria-live="polite"`
    only under reduced motion.
  - Layout order (banner precedes the H1).
- **`app/(dashboard)/dashboard/__tests__/page.test.tsx`** —
  focused tests covering polite live-region announcements for dashboard
  load completion and tab changes.
- **`app/dashboard/StartedChecklist.reduced-motion.test.tsx`** —
  focused tests covering the new `reducedMotion` prop and the system
  preference integration on the checklist component.

### 4. Reduced-motion status banner

Rendered conditionally above the page `<h1>`:

```tsx
{reducedMotion && (
  <div
    role="status"
    aria-live="polite"
    aria-label="Reduced motion enabled"
    data-testid="dashboard-reduced-motion-banner"
    className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200"
  >
    <PauseCircle ... aria-hidden="true" />
    <span>
      <strong>Reduced motion mode:</strong> animations are disabled ...
    </span>
  </div>
)}
```

| Concern | Choice |
| --- | --- |
| Status role | `role="status"` + `aria-live="polite"` (WCAG 2.1 AA SC 4.1.3) |
| Icon-only meaning? | No — supplemented with text label so it doesn't depend on colour alone (SC 1.4.1) |
| Color tokens | `border-amber-500/40`, `bg-amber-500/10`, `text-amber-800`, `dark:text-amber-200` — uses the design language already approved in the design system |
| Responsive | `text-xs`; flex layout collapses gracefully on `xs`/`sm` |

---

## API changes

### Page-level

`app/(dashboard)/dashboard/page.tsx` continues to default-export
`DashboardPage`. No new props. Reduced-motion behaviour is driven solely
by the system preference.

### Live region component

`app/components/LiveRegion.tsx` re-exports the shared
`components/ui/live-region.tsx` helper so dashboard surfaces can import a
single app-level live-region entrypoint. The shared helper also accepts
an optional `data-testid` for focused tests; this is a test-only API and
has no visible runtime impact.

### StartedChecklist

```ts
interface StartedChecklistProps {
  tasks?: ChecklistTask[]
  onDismiss?: () => void
  onTaskToggle?: (completedIds: string[]) => void
  /** NEW: when true, framer-motion animations are bypassed. Defaults
   *  to honouring the system `prefers-reduced-motion` preference. */
  reducedMotion?: boolean
}
```

### Hooks

`useReducedMotion` (already public) is unchanged. The new tokens live in
the page state to drive the banner and the timer-skip path.

---

## Accessibility

- WCAG 2.1 SC 2.2.1 (Timing Adjustable) — under reduced motion there is
  no timing-dependent state change.
- WCAG 2.1 SC 2.3.3 (Animation from Interactions) — animations are
  bypassed when the preference is set.
- WCAG 2.1 SC 4.1.3 (Status Messages) — banner uses `role="status"` and
  `aria-live="polite"`, and the dashboard's hidden live region announces
  state changes without interrupting the current task.
- Heading hierarchy is preserved (`h1` for the page title, `h2`/`h3`
  inside sections).

## Design tokens + dark mode

The banner uses the same `amber-500/40` colour scale that's already
present in the existing alert/toast variants (`app/settings/motion/page.tsx`
and `components/ui/alert.tsx`). Dark-mode overrides are applied via the
existing `dark:` Tailwind utilities — no custom CSS is required.

## Performance

The reduced-motion path avoids the simulated 1500ms `setTimeout`:

- When the user prefers reduced motion, `useReducedMotion()` returns
  `true` synchronously on the first render (the hook reads
  `window.matchMedia` in its `useState` initializer — see
  `hooks/useReducedMotion.ts`).
- The Dashboard page's `useEffect` notices `reducedMotion === true`,
  commits the populated state in the same render cycle, and skips the
  artificial timer entirely.
- The status banner is rendered on the first paint as well, so
  motion-sensitive users never see Skeleton placeholders.

It does **not** regress the animated path: when motion is allowed the
1500ms loading sequence is preserved.

## Hook change

`hooks/useReducedMotion.ts` was updated to read `window.matchMedia`
synchronously inside its `useState` initializer. The previous version
initialised to `false` and re-synced via `useEffect`, causing a brief
flash of the animated state for users with `prefers-reduced-motion: reduce`.
The new behaviour matches the documented "static" promise site-wide
(`ActiveBetCard`, `Breadcrumbs`, `SubscribeToggle`, `OnboardingTour`,
`TallyBar` and the consumer checklist all benefit).

## Cross-tab / cross-device consistency

The page-level `useReducedMotion` hook only observes the
`prefers-reduced-motion` media query. The user-facing toggle lives in
`app/settings/motion/page.tsx` and matches the same behaviour via the
`html.motion-reduced` global CSS class. The Dashboard does not hardcode
the toggle — it respects the OS preference first, which is the
highest-confidence signal.

---
