# Dashboard recommendations strip

"Markets you might like" is a discovery strip on the dashboard
(`app/(dashboard)/dashboard/page.tsx`), below the KPI cards. It's deliberately
separate from `components/active-bets` — Active Bets tracks markets the user
already has money on; this strip surfaces markets they don't, so the two
needed to look and behave differently (see "Visual contrast" below).

## Pieces

| File | Responsibility |
| --- | --- |
| [`lib/recommendations.ts`](../lib/recommendations.ts) | The heuristic: `getTopCategories(bets)` and `getRecommendedMarkets(categories)`. Pure functions, no React — tested in isolation. |
| [`components/dashboard/RecommendationsStrip.tsx`](../components/dashboard/RecommendationsStrip.tsx) | Renders the strip, the empty state, and owns the horizontal-scroll/keyboard behavior. |

## The heuristic

This is intentionally simple — "lightweight heuristics," not a recommendation
engine:

1. **Top categories**: `getTopCategories(bets)` counts how often each
   category appears in the user's bets (it defaults to
   `mockActiveBets` from [`lib/mock-data.ts`](../lib/mock-data.ts), the same
   data `components/active-bets` already renders on `/bets`) and returns the
   most frequent ones. A user with no bets yet gets `[]` back — that's the
   new-user case.
2. **Recent winners**: `getRecommendedMarkets(categories)` filters a small,
   hand-curated candidate pool down to the given categories, then sorts
   `isRecentWinner` markets (a market in that category recently resolved
   with a popular outcome — social proof) above plain participant-count
   popularity.

`getRecommendedMarkets([])` returns `[]`, which is what triggers the empty
state — there's no separate "is this a new user" flag to keep in sync; the
heuristic and the empty-state trigger are the same data.

The candidate pool lives in `lib/recommendations.ts` itself rather than
pulling from `useEventsStore`. That store carries pagination/infinite-scroll
state sized for the full `/events` table; this strip only ever needs a
handful of cards, so a small dedicated dataset keeps the feature
self-contained and easy to review in two files.

## Empty state

A user with no bet history sees category chips (`Football`, `Politics`,
`Crypto`, `Stocks`, `Entertainment`, `Sports` — the same `CategoryColor`
values used everywhere else) instead of a blank strip. Clicking one calls
`getRecommendedMarkets([category])` directly (via local component state),
which is what makes the CTA "functional" rather than decorative: there's a
test (`components/dashboard/__tests__/RecommendationsStrip.test.tsx`) that
clicks a chip and asserts the strip actually populates.

## Visual contrast with Active Bets

| | Active Bets (`ActiveBetCard`) | Recommendations (`RecommendationCard`) |
| --- | --- | --- |
| Border | `border-border/50`, `backdrop-blur-sm` | `border-border/30`, no blur — visibly lighter |
| Chip | Solid, category-colored (`categoryColors` map) | `Badge variant="secondary"` ("Suggested") — a token color, not a category color |
| Thumbnail / progress bar | Yes | No — these are markets the user hasn't engaged with yet, there's nothing to show progress on |

## Keyboard & scroll behavior

The scroll container mirrors the pattern already used in
`components/active-bets/ActiveBets.tsx`: `role="region"`, a descriptive
`aria-label`, `tabIndex={0}`, and `ArrowLeft`/`ArrowRight` scroll the
container by one viewport width when there's more content in that direction
(`scrollIntoView`-style edge detection via `scrollWidth`/`clientWidth`).
Left/right buttons appear on hover/focus as a mouse-friendly alternative;
neither is required to reach any card, since every card is a real `<Link>`
and the whole row is in normal tab order via the scroll container.

## Testing

```bash
pnpm test lib/__tests__/recommendations
pnpm test components/dashboard
```

- `lib/__tests__/recommendations.test.ts` covers the heuristic: no categories
  for a bet-less user, frequency ranking, the `limit` parameter, category
  filtering, recent-winner ranking, and that every category has at least one
  candidate (so picking any empty-state chip is guaranteed to produce
  results).
- `components/dashboard/__tests__/RecommendationsStrip.test.tsx` covers the
  component: the empty state renders instead of a strip for a bet-less user,
  every category has a clickable chip, clicking one populates the strip
  (the functional-CTA requirement), recommendations are scoped to the user's
  actual top categories, every card is a link, and `ArrowRight`/`ArrowLeft`
  scroll the region when content overflows (jsdom reports zero-width
  elements by default, so the test fakes `scrollWidth`/`clientWidth` to
  simulate overflow — see the `mockOverflow` helper in that file).

## Manually verifying in the browser

Rendered `/dashboard` in headless Chrome and confirmed the strip appears
below the KPI cards with the "Suggested" badge, the "Trending" indicator on
recent-winner markets, real `<a href="/events">` cards, and the scroll-right
button present once there's overflow content.

Note: this reuses the same `"use client"` fix on
`app/(dashboard)/dashboard/page.tsx` as the breadcrumbs PR (#302) — that file
was missing the directive despite using `useState`/`useEffect`, which 500'd
the route in dev mode. If #302 merges first this is a no-op here.
