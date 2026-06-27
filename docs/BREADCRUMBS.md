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
  synchronously with no animation.

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
