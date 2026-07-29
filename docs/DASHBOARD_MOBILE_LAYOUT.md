# Dashboard Mobile Layout — Issue #651

> **Campaign:** GrantFox FWC26 (Stellar Wave) · **Status:** Complete

Polishes the Dashboard layout for narrow mobile viewports (≤375px) by
adjusting padding, typography, spacing, and tap-target sizing. All changes
follow the existing design-token system and support dark mode.

---

## Affected files

| File | Purpose |
|------|---------|
| `src/pages/Dashboard.tsx` | Legacy Dashboard page — responsive padding, heading, margin |
| `src/components/EmptyState.tsx` | `StellarWaveEmptyState` — responsive padding, min-height, icon, CTA margin, reduced-motion-safe animations |
| `src/pages/__tests__/Dashboard.responsive.test.tsx` | New focused tests for responsive layout classes |
| `docs/DASHBOARD_MOBILE_LAYOUT.md` | This documentation |

---

## Problem

The legacy Dashboard (`src/pages/Dashboard.tsx`) used fixed spacing values
that were too large on narrow viewports (≤375px):

| Property | Old value | Issue on 375px |
|----------|-----------|-----------------|
| Padding | `p-8` (2rem / 32px) | Consumed ~17% of the viewport width, leaving content cramped |
| Heading font | `text-3xl` (30px) | Headline dominated the viewport, leaving less room for actual content |
| Heading margin | `mb-6` (1.5rem / 24px) | Excessive vertical space between heading and empty state |

The `StellarWaveEmptyState` component had fixed padding (`px-6 py-12`),
a fixed `min-h-[400px]`, and non-responsive icon sizing that made the
empty state feel disproportionately large on small screens.

---

## Solution

### `src/pages/Dashboard.tsx`

| Property | Mobile (≤639px) | sm (≥640px) | lg (≥1024px) |
|----------|-----------------|-------------|---------------|
| Padding | `p-4` (16px) | `p-6` (24px) | `p-8` (32px) |
| Heading | `text-2xl` (24px) | `text-3xl` (30px) | `text-3xl` (30px) |
| Heading mb | `mb-4` (16px) | `mb-6` (24px) | `mb-6` (24px) |

Added `role="region"` to the container for improved screen-reader landmark
navigation alongside the existing `aria-label="Dashboard"`.

### `src/components/EmptyState.tsx` (StellarWaveEmptyState)

| Property | Mobile (≤639px) | sm (≥640px) |
|----------|-----------------|-------------|
| Horizontal padding | `px-4` (16px) | `px-6` (24px) |
| Vertical padding | `py-8` (32px) | `py-12` (48px) |
| Min-height | `min-h-[300px]` | `min-h-[400px]` |
| Icon container | `h-20 w-20` | `h-24 w-24` |
| Inner icon | `h-10 w-10` | `h-12 w-12` |
| Icon bottom margin | `mb-4` | `mb-6` |
| CTA top margin | `mt-6` | `mt-8` |

The CTA button's `transition-all` and `hover:scale-[1.02]` classes are
now prefixed with `motion-safe:` to respect `prefers-reduced-motion`.

---

## Accessibility (WCAG 2.1 AA)

| Criterion | How satisfied |
|-----------|---------------|
| 1.3.1 Info & Relationships | `role="region"` + `aria-label` on container; `role="heading"` (h1) |
| 1.4.4 Resize text | Relative units; no fixed widths that would clip at 200% zoom |
| 2.4.3 Focus Order | `tabIndex={0}` on container with visible focus ring |
| 2.5.5 Target Size | CTA uses `size="lg"` (≥44px height) |
| 2.3.3 Animation from Interactions | `motion-safe:` prefix on transform transitions |
| 4.1.2 Name, Role, Value | `role="status"` + `aria-live="polite"` on empty state |

---

## Design tokens & dark mode

All spacing and sizing use Tailwind's arbitrary value syntax (`[300px]`)
or standard breakpoint prefixes (`sm:`, `lg:`). Colours use the existing
`#540D8D` brand palette with `dark:text-purple-400` dark-mode override
and `bg-[#540D8D]/5` / `border-[#540D8D]/50` transparency variants that
work in both themes.

The focus ring inherits from `src/styles/focus.css` which already covers
both `prefers-color-scheme: dark` and `forced-colors: active`.

---

## Tests

Run focused tests:

```sh
pnpm test -- src/pages/__tests__/Dashboard.responsive.test.tsx
pnpm test -- src/components/__tests__/EmptyState.test.tsx
```

Run full validation:

```sh
pnpm type-check
pnpm lint
pnpm test
```

---

## Verification

For manual review, check `/dashboard` at `320px`, `375px`, `414px`,
`640px`, `768px`, `1024px`, in both light and dark themes, with
keyboard-only navigation.
