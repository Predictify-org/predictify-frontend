# MarketCard Mobile Layout

This document describes the responsive layout changes introduced for MarketCard
components on narrow viewports (task #504 — GrantFox FWC26 campaign).

## Affected files

| File | Purpose |
| --- | --- |
| `app/components/MarketCard.tsx` | Rich market card with odds, sparkline, heat strip, follow indicator, and daily allowance nudge |
| `src/pages/MarketCard.tsx` | Lightweight market card with category, status badge, volume, and end date |
| `app/components/__tests__/MarketCard.test.tsx` | Tests for the rich card, including new mobile layout assertions |
| `src/pages/__tests__/MarketCard.test.tsx` | Tests for the lightweight card, including new mobile layout assertions |

---

## Problem

Both MarketCard implementations used fixed side-by-side (flex-row) layouts for
content blocks that are too wide to share a row on narrow viewports (< 640 px):

- `app/components/MarketCard.tsx`: icon + textual content was placed on the left
  while the odds block (Yes %/No %) was pinned to the right. On very narrow
  screens the odds block was squeezed and could overlap the title or description.
- `src/pages/MarketCard.tsx`: the category label and the status badge shared a
  flex row. A long category string could push the badge off-screen. The meta row
  (volume and end date) had no wrap-protection either.

---

## Solution

Both components now follow a **mobile-first stacked layout** that switches to the
desktop side-by-side layout at the `sm` breakpoint (640 px).

### `app/components/MarketCard.tsx`

| Region | Mobile (< 640 px) | Desktop (≥ 640 px) |
| --- | --- | --- |
| Top content + odds wrapper | `flex-col` — stacked vertically | `flex-row justify-between` — side-by-side |
| Icon container | `shrink-0` — always fixed size | same |
| Text content wrapper | `min-w-0 flex-1` — prevents title overflow | same |
| Odds block | `flex-row gap-4` — Yes and No on one line | `flex-col text-right` — stacked, right-aligned |
| Bottom meta (pool + ends-in) | `flex-wrap gap-x-2 gap-y-1` — wraps to second line | same (usually fits in one line) |

The odds block now carries `data-testid="odds-block"` and an
`aria-label="Odds: Yes X%, No Y%"` attribute for screen-reader accessibility.

### `src/pages/MarketCard.tsx`

| Region | Mobile (< 640 px) | Desktop (≥ 640 px) |
| --- | --- | --- |
| Header row (category + badge) | `flex-col gap-1` — stacked vertically | `flex-row justify-between` — side-by-side |
| Category label | `min-w-0 truncate` + `title` attribute | same — tooltip reveals full value |
| Status badge | `self-start` — left-aligned in column | default alignment |
| Meta row (volume + end date) | `flex-wrap gap-x-4 gap-y-1` — wraps | same (usually one line) |

---

## Tailwind classes reference

| Class | Effect |
| --- | --- |
| `flex-col` | Stack children vertically (mobile default) |
| `sm:flex-row` | Restore horizontal layout at ≥ 640 px |
| `shrink-0` | Prevent flex item from compressing (icon, odds block) |
| `min-w-0` | Allow text container to shrink and trigger `truncate` |
| `flex-wrap` | Allow flex children to wrap when space runs out |
| `gap-x-N gap-y-N` | Horizontal and vertical gap in wrapped rows |
| `self-start` | Align the status badge to the leading edge of its column |
| `truncate` | Clip overflowing text with an ellipsis |

---

## Accessibility

All changes maintain or improve WCAG 2.1 AA compliance:

- The odds block's `aria-label` announces both values to screen readers as a
  single unit, regardless of the visual layout (`flex-row` on mobile vs.
  `flex-col` on desktop).
- The status badge keeps its `role="status"` and `aria-label` on all breakpoints.
- The category label's `title` attribute exposes the full untruncated string to
  pointer-hover assistive technology and tooltips.
- Dark-mode contrast is preserved; pattern fills in `src/styles/patterns.css`
  adjust automatically via `@media (prefers-color-scheme: dark)`.
- `reducedMotion` prop on the rich card suppresses the `animate-slide-up` class,
  respecting the OS reduced-motion preference.

---

## Tests

Jest / React Testing Library — tests verify:

- All existing functionality (rendering, interactions, store integration) continues
  to work unchanged.
- New mobile layout tests (grouped under `describe("mobile responsive layout
  classes")` or `describe("MarketCard mobile responsive layout")`) assert:
  - Presence of `flex-col` + `sm:flex-row` on the stacking wrapper
  - `flex-row` + `sm:flex-col` on the odds block
  - `aria-label` on the odds block
  - `shrink-0` on the icon wrapper and odds block
  - `min-w-0` on the text content wrapper
  - `flex-wrap` on the meta row
  - `self-start` on the status badge
  - `truncate` on the category label

Run focused tests:

```bash
pnpm test MarketCard
```

---

## Design tokens and dark mode

Both components use only Tailwind utility classes that resolve to CSS custom
properties defined in `app/globals.css` and `styles/globals.css`. No hardcoded
colours were introduced. Dark mode continues to work through Tailwind's
`darkMode: ["class"]` configuration and the `.dark` class applied by
`ThemeProvider`.

---

## See also

- [`docs/HEAT_STRIP.md`](./HEAT_STRIP.md) — 24h activity heat strip used in the
  rich MarketCard.
- [`docs/API.md`](./API.md) — data shapes and mock status for markets.
- [`app/components/SaveForLater.tsx`](../app/components/SaveForLater.tsx) —
  bookmark button embedded in the rich MarketCard.
