# Breadcrumbs & the route-transition morph

The dashboard header shows a breadcrumb trail (`Dashboard / Events / New Event`)
that updates as the user navigates. The trailing ("active") crumb animates
into the new one on route changes — a shared-element morph — instead of
just snapping to new text.

## Pieces

| File | Responsibility |
| --- | --- |
| [`lib/breadcrumbs.ts`](../lib/breadcrumbs.ts) | Pure `getBreadcrumbsForPath(pathname)`: turns a pathname into a `BreadcrumbItem[]` trail. No React, no animation — easy to unit test on its own. |
| [`components/navbar/Breadcrumbs.tsx`](../components/navbar/Breadcrumbs.tsx) | Renders the trail and owns the morph animation on the last item. |
| [`app/(dashboard)/layout.tsx`](<../app/(dashboard)/layout.tsx>) | Mounts `<Breadcrumbs>` once, above `{children}`. This is what makes the morph possible — see "Why the layout, not the page" below. |

## Why the layout, not the page

Next.js App Router layouts persist across navigations between sibling routes
that share them — they re-render with new props/hooks (like `usePathname()`),
they don't remount. Mounting `<Breadcrumbs>` in `app/(dashboard)/layout.tsx`
means the same `Breadcrumbs` (and its internal `ActiveCrumb`) component
instance lives across `/events` → `/events/new`, so when its `label` prop
changes, Framer Motion's `AnimatePresence` sees a real prop transition to
animate. If `Breadcrumbs` were instead rendered per-page, it would unmount
and remount on every navigation and there'd be nothing to morph between.

## How the morph works

`ActiveCrumb` (inside `Breadcrumbs.tsx`) wraps the trailing crumb:

```tsx
<AnimatePresence mode="popLayout" initial={false}>
  <motion.span
    key={label}
    layoutId="active-breadcrumb"
    layout="position"
    initial={{ opacity: 0, x: 8 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -8 }}
    transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
  >
    {label}
  </motion.span>
</AnimatePresence>
```

- **`key={label}`** is what actually decides whether anything animates.
  React only treats this as a new element — triggering exit/enter — when the
  label genuinely changes. An unrelated re-render of the layout (e.g. the
  wallet connecting) leaves the key, and therefore the crumb, untouched: no
  spurious animation. This is also how "morph runs only when route depth
  changes" holds — depth and the leaf segment are exactly what
  `getBreadcrumbsForPath` encodes into the label trail.
- **`layoutId="active-breadcrumb"`**, shared between the outgoing and
  incoming `motion.span`, is what makes this a *shared-element* transition
  rather than a plain crossfade: Framer Motion treats both instances as the
  same element and smoothly interpolates between their positions.
  `layout="position"` scopes that interpolation to position only (not size),
  so a longer/shorter label doesn't stretch the crumb during the transition.
- **`mode="popLayout"`** takes the exiting crumb out of normal layout flow
  for the duration of its exit animation, so it can fade out without pushing
  on the separators/crumbs around it — this is what keeps the rest of the
  breadcrumb row (and the header above it) from shifting.
- The `initial`/`animate`/`exit` opacity + `x` pair is the actual "fades and
  slides" effect; `transition` pins it to the spec's 180ms,
  `cubic-bezier(0.2, 0.8, 0.2, 1)` ease-out curve.

## Overflow: collapsing long trails

Deep routes (or ones with several long segment names) can produce a trail
that's too wide for the header — most visibly on Settings sub-pages once a
route goes more than a couple of levels deep. Rather than letting the row
wrap or clip, `collapseBreadcrumbTrail` (in
[`lib/breadcrumbs.ts`](../lib/breadcrumbs.ts)) collapses the *middle* of a
trail longer than `MAX_VISIBLE_CRUMBS` (4) into a single "…" entry, always
keeping:

- the root crumb (e.g. "Dashboard"), so there's always a way back to the top, and
- the last two crumbs (the immediate parent and the current page), so "where
  am I" stays answerable at a glance.

`Breadcrumbs.tsx` renders that "…" entry as a button
(`aria-label="Show N hidden breadcrumb items"`) backed by the existing
`DropdownMenu` primitive, which opens a standard, keyboard-operable menu
listing the hidden crumbs as links. Because it's Radix's `DropdownMenu`,
focus management, `Escape`-to-close, and arrow-key navigation come for free.

```
Dashboard / Settings / Account / Verification / Documents   (source trail)
Dashboard / …        / Verification / Documents             (rendered — "…" opens Settings, Account)
```

## Truncating long labels

Independent of trail-level collapsing, any single crumb label longer than
`MAX_LABEL_LENGTH` (24 characters) is shortened with `truncateMiddle` (also
in `lib/breadcrumbs.ts`), which keeps the start and end of the string and
splices in an ellipsis, e.g. `"Verification Requirements" ->
"Verific…ments"`. Middle truncation (rather than CSS's end-only
`text-overflow: ellipsis`) is used because for path-like or ID-bearing
labels the identifying part is often at either edge, not just the start.

The full label is never lost: it's set as `aria-label` and `title` on the
rendered element, so screen readers announce the untruncated text and
sighted mouse users can hover for the full string. Each crumb's container
also carries `truncate` (CSS) plus `min-w-0` on its flex ancestors as a
layout-level backstop, in case a truncated label is still wider than the
space a narrow viewport leaves it.

The trail is rendered at every breakpoint and constrained to the available
width. If a caller supplies `backHref` or `onBack`, that explicit back control
replaces the trail below the `md` breakpoint; otherwise (as in the dashboard
layout) the middle-ellipsis trail remains visible on mobile instead of leaving
an empty navigation region.

## Reduced motion

`ActiveCrumb` calls Framer Motion's `useReducedMotion()` (which reads
`prefers-reduced-motion` and stays in sync if the user changes it) and, when
true, renders a plain `<span>` instead of the `AnimatePresence`/`motion.span`
tree entirely:

```tsx
if (shouldReduceMotion) {
  return <span aria-current="page" className="...">{label}</span>;
}
```

This is an instantaneous swap, not a fast animation — there's no
`AnimatePresence`, `layoutId`, or transition in this path at all, so there's
nothing to disable or race.

## Testing

```bash
pnpm test lib/__tests__/breadcrumbs
pnpm test components/navbar/__tests__/Breadcrumbs
```

- `lib/__tests__/breadcrumbs.test.ts` covers `getBreadcrumbsForPath` in
  isolation: the depth-1 dashboard root, depth-2/3 trails, the known-segment
  label map, humanizing unknown segments, and trailing-slash normalization.
- `components/navbar/__tests__/Breadcrumbs.test.tsx` covers the component:
  correct linking of non-active crumbs, exactly one `aria-current="page"`
  crumb at a time, the morph completing on a depth change, *no* re-trigger
  when the trail is unchanged (same content, new array reference — simulates
  an unrelated parent re-render), and the reduced-motion path swapping
  synchronously with no animation. It also covers overflow: a long trail
  collapses to root + ellipsis + last two crumbs, the ellipsis menu exposes
  the hidden crumbs as working links, a trail that already fits is left
  uncollapsed, and a long single label renders middle-ellipsized while
  keeping its full text available via `aria-label`. Responsive coverage checks
  that the trail remains visible and width-constrained on mobile unless an
  explicit mobile back control is supplied.
- `lib/__tests__/breadcrumbs.test.ts` also covers `truncateMiddle` (label
  under/at/over the length limit) and `collapseBreadcrumbTrail` (under,
  exactly at, and over `maxVisible`) in isolation.

## Manually verifying in the browser

Visited `/dashboard`, `/events`, `/events/new`, and `/events/event-page` and
confirmed each renders the expected trail with correct `href`s and exactly
one current crumb. Re-rendered `/events/new` with Chrome's
`--force-prefers-reduced-motion` flag and confirmed the active crumb renders
with no animation-related inline styles, versus the motion-enabled runs
which do settle to `opacity: 1; transform: none;` after animating in.

Note: `app/(dashboard)/dashboard/page.tsx` was missing a `"use client"`
directive despite using `useState`/`useEffect`, which 500'd in dev mode and
blocked manually testing the depth-1 (`/dashboard`) breadcrumb case. Fixed
as part of this change since it's a one-line, pre-existing bug directly
blocking verification of this feature.
