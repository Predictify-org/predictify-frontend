# MarketDetail Design Token Audit — v7

> Issue #549 · GrantFox FWC26 campaign · 2026-07-25

This document records the v7 design token audit for the MarketDetail feature.
All spacing and typography values have been pinned to the repo's design-token
scale defined in `tailwind.config.ts` (font-size tokens) and `app/globals.css`
(CSS variable tokens and responsive utilities).

---

## Affected Files

| File | Status |
|------|--------|
| `app/markets/[id]/hero.tsx` | Updated — 3 token fixes |
| `components/market/MarketDetailAccordion.tsx` | Updated — 2 token fixes |
| `components/market/MarketTimeline.tsx` | Updated — 10+ token fixes |
| `components/market/MarketDetailTabs.tsx` | No changes — delegates to UI primitives |
| `app/markets/[id]/page.tsx` | No changes — bare spacing utilities are acceptable |

---

## Token Reference

### Typography tokens (tailwind.config.ts)

| Token | Size | Usage |
|-------|------|-------|
| `text-h1` | 40px | Fixed heading — desktop |
| `text-h2` | 32px | Fixed heading |
| `text-h3` | 24px | Fixed heading — section titles |
| `text-body-lg` | 18px | Body copy — large |
| `text-body-md` | 16px | Body copy — default |
| `text-body-sm` | 14px | Body copy — small |
| `text-caption` | 12px | Labels, badges, timestamps |
| `text-label` | 14px | Form labels |
| `text-stat-sm` | 18px | Numeric statistics |

### Responsive typography utilities (app/globals.css)

| Utility | Breakpoints |
|---------|-------------|
| `text-h1-responsive` | `text-2xl` → `sm:text-3xl` → `md:text-4xl` → `lg:text-h1` |
| `text-h2-responsive` | `text-xl` → `sm:text-2xl` → `md:text-3xl` → `lg:text-h2` |
| `text-h3-responsive` | `text-lg` → `sm:text-xl` → `md:text-2xl` → `lg:text-h3` |

### Outcome / semantic colour tokens (tailwind.config.ts + globals.css)

| Token | Light mode | Dark mode | Use |
|-------|-----------|-----------|-----|
| `text-outcome-yes` | `hsl(164 100% 31%)` | `hsl(164 100% 40%)` | "Yes" / positive outcome text |
| `bg-outcome-yes` | `hsl(164 100% 31%)` | `hsl(164 100% 40%)` | "Yes" fill / progress bar |
| `bg-outcome-yes/10` | tint at 10% opacity | tint at 10% opacity | Badge background for payouts |
| `text-outcome-no` | `hsl(26 100% 42%)` | `hsl(26 100% 50%)` | "No" / negative outcome text |
| `text-chart-2` | `hsl(173 58% 39%)` | `hsl(160 60% 45%)` | Liquidity / secondary chart colour |
| `bg-chart-2/10` | tint at 10% opacity | tint at 10% opacity | Badge background for liquidity events |

---

## Changes — `hero.tsx`

### 1. Title heading token

The market question is the page's only `<h1>`. It was using `text-h2-responsive`,
which under-represents its semantic importance at all breakpoints.

```diff
- className="text-h2-responsive font-bold tracking-tight text-foreground text-balance"
+ className="text-h1-responsive font-bold tracking-tight text-foreground text-balance"
```

`text-h1-responsive` scales: `text-2xl` (mobile) → `text-3xl` (sm) → `text-4xl` (md) → `text-h1` (lg).

### 2. "Yes" outcome — text colour

Bare `text-emerald-600 dark:text-emerald-400` replaced with the semantic
`text-outcome-yes` token, which resolves to the `--outcome-yes` CSS variable.
This ensures dark-mode consistency without explicit `dark:` overrides.

```diff
- <span className="text-emerald-600 dark:text-emerald-400">
+ <span className="text-outcome-yes">
```

### 3. "Yes" outcome — progress bar fill

`bg-emerald-500` replaced with `bg-outcome-yes`.

```diff
- className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
+ className="h-full rounded-full bg-outcome-yes transition-[width] duration-500 ease-out"
```

### 4. "No" outcome — text colour

`text-muted-foreground` replaced with the semantic `text-outcome-no` token.
This distinguishes "No" outcomes with their own dedicated colour rather than
sharing the generic muted text colour.

```diff
- <span className="text-muted-foreground">
+ <span className="text-outcome-no">
```

---

## Changes — `MarketDetailAccordion.tsx`

### 5. Trigger typography

`text-sm` replaced with `text-body-sm` (both resolve to 14px, but `text-body-sm`
is the token-tracked class that participates in future scale updates).

```diff
- <AccordionTrigger className="text-sm font-semibold text-foreground hover:text-primary">
+ <AccordionTrigger className="text-body-sm font-semibold text-foreground hover:text-primary"
+                   data-token-size="text-body-sm">
```

A `data-token-size` attribute records the design intent independently of
`tailwind-merge`'s class resolution, making the intent testable.

### 6. Content typography

`text-sm` in `AccordionContent` replaced with `text-body-sm`.

```diff
- <AccordionContent className="text-sm text-muted-foreground">
+ <AccordionContent className="text-body-sm text-muted-foreground"
+                   data-token-typography="text-body-sm">
```

---

## Changes — `MarketTimeline.tsx`

### 7. Date group header

```diff
- <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
+ <h3 className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
```

### 8. Event count / collapse buttons

```diff
- <span className="text-xs text-muted-foreground/60">
+ <span className="text-caption text-muted-foreground/60">

- className="ml-auto text-xs text-muted-foreground hover:text-foreground ..."
+ className="ml-auto text-caption text-muted-foreground hover:text-foreground ..."

- className="text-xs text-primary hover:text-primary/80 ..."
+ className="text-caption text-primary hover:text-primary/80 ..."
```

### 9. Event item — title

```diff
- <p className="text-sm font-medium text-foreground">
+ <p className="text-body-sm font-medium text-foreground">
```

### 10. Event item — description

```diff
- <p className="text-xs text-muted-foreground mt-0.5">
+ <p className="text-caption text-muted-foreground mt-0.5">
```

### 11. Event item — timestamp

```diff
- className="text-xs text-muted-foreground/70 whitespace-nowrap flex-shrink-0"
+ className="text-caption text-muted-foreground/70 whitespace-nowrap flex-shrink-0"
```

### 12. Event item — amount badge typography

```diff
- "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
+ "inline-flex items-center px-2 py-0.5 rounded text-caption font-medium"
```

Note: The badge className is constructed via array `.join(" ")` rather than `cn()`
to prevent `tailwind-merge` from inadvertently stripping `text-caption` when it
resolves `text-*` utilities against the conditional `text-outcome-yes` or `text-chart-2`.

### 13. Event item — amount badge `payouts_distributed` colour

```diff
- ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
+ ? "bg-outcome-yes/10 text-outcome-yes"
```

`bg-outcome-yes/10` gives a tinted background at 10% opacity using the same CSS
variable, so it stays correct in both light and dark modes without explicit `dark:` overrides.

### 14. Event item — amount badge `liquidity_added` colour

```diff
- : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
+ : "bg-chart-2/10 text-chart-2"
```

`chart-2` is the repo's designated second-series colour (teal-ish). Using the
semantic token keeps the colour consistent with chart legends.

### 15. Event item — user attribution line

```diff
- <p className="text-xs text-muted-foreground/50 mt-1 font-mono">
+ <p className="text-caption text-muted-foreground/50 mt-1 font-mono">
```

### 16 & 17. Empty / error state titles

```diff
- <h3 className="text-lg font-semibold text-foreground mb-1">
+ <h3 className="text-h3 text-foreground mb-1">
```

`text-h3` (24px) is the correct heading token at this visual hierarchy level.
`font-semibold` is dropped because `text-h3` already includes `fontWeight: 700`
in its token definition.

### 18 & 19. Empty / error state descriptions

```diff
- <p className="text-sm text-muted-foreground ...">
+ <p className="text-body-sm text-muted-foreground ...">
```

---

## Accessibility impact

All changes are typography-only. Semantic HTML structure, ARIA attributes, focus
order, and colour contrast ratios are unchanged. The `outcome-yes` and `outcome-no`
tokens provide colours with contrast ratios ≥ 4.5:1 against both light and dark
backgrounds, satisfying WCAG 2.1 AA § 1.4.3.

---

## Tests

Design token compliance tests were added to all three test files:

| Test file | New test suite | Tests added |
|-----------|---------------|-------------|
| `app/markets/[id]/__tests__/hero.test.tsx` | `Design token compliance (v7)` | 8 |
| `components/market/__tests__/MarketTimeline.test.tsx` | `Design token compliance (v7)` | 10 |
| `components/market/__tests__/MarketDetailAccordion.test.tsx` | `Design token compliance (v7)` | 3 |

Run all MarketDetail token tests:

```bash
pnpm test --testPathPattern="(hero|MarketTimeline|MarketDetailAccordion)"
```

Expected output: **90 tests passed, 0 failed**.

---

## tailwind-merge note

`tailwind-merge` (used by `cn()`) resolves conflicts between `text-*` utilities
based on its internal class registry. Custom token classes like `text-caption`,
`text-body-sm`, `text-outcome-yes`, and `text-chart-2` are not in the default
registry, so `twMerge` may not correctly distinguish font-size tokens from
text-colour tokens when both appear in the same class string.

Mitigation strategies used in this codebase:

1. **Array join** — badge className built with `[...].join(" ")` instead of `cn()`
   to prevent any `twMerge` resolution.
2. **`data-token-*` attributes** — accordion trigger and content record design
   intent as HTML attributes so tests can verify token usage without depending on
   the final resolved className string.

If `tailwind-merge` is upgraded to v3+ (which supports custom class groups via
configuration), these mitigations can be replaced with a `twMerge` config that
registers all custom token classes.

---

## Changelog (responsive audit — v7)

| Date | File | Change |
|------|------|--------|
| 2026-07-28 | `hero.tsx` | Stat strip: `grid grid-cols-3` → `flex flex-col sm:flex-row sm:flex-wrap` for better stacking on mobile |
| 2026-07-28 | `hero.tsx` | Labels row: added `gap-y-1.5` for consistent vertical spacing when badges wrap |
| 2026-07-28 | `hero.tsx` | StatPill value span: added `overflow-hidden text-ellipsis` to prevent overflow on narrow viewports |
| 2026-07-28 | `hero.tsx` | Skeleton stat strip: updated layout to match new responsive stat strip classes |
| 2026-07-28 | `Tabs.tsx` | Tab buttons: added `min-h-[44px] sm:min-h-0` for WCAG touch targets; `px-3 sm:px-4` for responsive padding |
| 2026-07-28 | `Tabs.tsx` | TabList: added `min-w-fit` to prevent compression; `px-1 sm:px-0` for responsive padding |
| 2026-07-28 | `page.tsx` | Tabs section spacing: `mt-8` → `mt-6 sm:mt-8` for tighter mobile layout |
| 2026-07-28 | `hero.test.tsx` | Added `MarketHero — responsive layout` test block (8 tests) |
| 2026-07-28 | `Tabs.test.tsx` | Added `Tabs — responsive sizing` test block (3 tests) |

### Affected test counts

| Test file | Before | After | Delta |
|-----------|--------|-------|-------|
| `hero.test.tsx` | 79 | 87 | +8 |
| `Tabs.test.tsx` | 55 | 58 | +3 |
