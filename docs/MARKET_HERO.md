# MarketHero

`app/markets/[id]/hero.tsx`

The `MarketHero` component renders the top section of a market detail page for the **GrantFox FWC26** campaign. It was introduced to rebalance the hero layout so that title, status, and key stats share visual weight without any single element dominating the others.

---

## Usage

```tsx
import MarketHero from "@/app/markets/[id]/hero";

<MarketHero
  title="Will Argentina win the 2026 FIFA World Cup?"
  description="Predict whether Argentina will defend their title at the 2026 FIFA World Cup."
  status="open"
  category="Football"
  volume="42,000 USDC"
  participants={3840}
  timeLeft="18 days"
  outcomes={[
    { label: "Yes", probability: 62 },
    { label: "No", probability: 38 },
  ]}
  isGrantFoxCampaign
  onShare={() => openShareSheet()}
/>
```

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | ✅ | — | Market question rendered as `<h1>`. |
| `status` | `MarketStatus` | ✅ | — | Market lifecycle state. Accepted values: `"open"`, `"closing_soon"`, `"closed"`, `"resolved"`, `"cancelled"`. Passed through to `StatusBadge`. |
| `description` | `string` | ❌ | `undefined` | Short market description shown below the title. |
| `category` | `string` | ❌ | `undefined` | Category label, e.g. `"Football"`. |
| `volume` | `string` | ❌ | `undefined` | Total staked value, pre-formatted, e.g. `"42,000 USDC"`. |
| `participants` | `number` | ❌ | `undefined` | Unique participant count. Formatted with `toLocaleString()`. |
| `timeLeft` | `string` | ❌ | `undefined` | Human-readable time remaining, e.g. `"18 days"`. |
| `outcomes` | `[MarketOutcome] \| [MarketOutcome, MarketOutcome]` | ❌ | `undefined` | One or two outcome options for the probability bar. |
| `isGrantFoxCampaign` | `boolean` | ❌ | `false` | When `true`, a GrantFox FWC26 campaign badge is displayed. |
| `onShare` | `() => void` | ❌ | `undefined` | Called when the Share button is clicked. The button is **not rendered** when this prop is omitted. |
| `className` | `string` | ❌ | `undefined` | Additional CSS class applied to the root `<section>`. |

### `MarketOutcome`

```ts
interface MarketOutcome {
  /** Display label, e.g. "Yes" or "No". */
  label: string;
  /** Probability as a percentage (0–100). */
  probability: number;
}
```

### `MarketStatus`

```ts
type MarketStatus =
  | "open"
  | "closing_soon"
  | "closed"
  | "resolved"
  | "cancelled";
```

Imported from `@/components/market/StatusBadge`.

---

## Visual Structure

```
┌──────────────────────────────────────────────────────────┐
│  [🏆 GrantFox FWC26]  [Open]  [Football]                 │  ← Row 1 — labels
│                                                          │
│  Will Argentina win the 2026 FIFA World Cup?             │  ← Row 2 — h1 title
│  Predict whether Argentina will defend their…            │           description
│                                                          │
│  Yes  62% ━━━━━━━━━━━━━━━━░░░░░░  38% No                │  ← Row 3 — probability bar
│                                                          │
│  ─────────────────────────────────────────────          │
│  $ Volume        👥 Participants     🕐 Closes in        │  ← Row 4 — stat strip
│  42,000 USDC     3,840               18 days            │
│                                                          │
│  [↗ Share]                                               │  ← Row 5 — actions
└──────────────────────────────────────────────────────────┘
```

---

## Design Decisions

### Rebalanced visual hierarchy

Previous market detail pages placed title and bet-form in a two-column layout that buried key stats. `MarketHero` uses a single semantic column with clear row-by-row priority:

1. **Labels first** (status, category) — 14px badges act as metadata, not headings.
2. **Title dominant** — `text-h2-responsive` gives the question proportional weight at every breakpoint.
3. **Probability bar immediate** — The most important data point (current odds) follows the title without a card wrapper.
4. **Stat strip compact** — Volume, participants, and time-left are surfaced as a tight horizontal strip using the `StatPill` helper rather than stacked full-width cards.
5. **Actions last** — Share is a secondary affordance and sits at the bottom.

### Typography tokens

All text uses the repo's Tailwind design-token scale:

| Element | Token | Notes |
|---------|-------|-------|
| Title | `text-h2-responsive` | Scales from `text-xl` (mobile) to `text-h2` (desktop) |
| Description | `text-body-md` | 16px default body, muted colour |
| Outcome labels | `text-body-sm font-medium` | 14px, coloured by outcome |
| Stat value | `text-stat-sm font-bold` | 18px tabular numerals (see § Tabular numerals) |
| Stat label | `text-caption text-muted-foreground` | 12px muted |
| Badge text | `text-caption` | 12px via Badge component |

### Tabular numerals (Issue #556)

Every visible numeric display on MarketDetail uses **tabular numerals**
(`font-variant-numeric: tabular-nums`) so currency amounts, participant
counts, countdown strings, and outcome percentages stay perfectly column-
aligned across viewports and dynamic updates.  This is enforced by two
complementary layers:

1. **Design-token binding** — `styles/globals.css` defines a CSS rule that
   applies `font-variant-numeric: tabular-nums` to every element rendered
   with the `text-stat-lg`, `text-stat-md`, or `text-stat-sm` typography
   tokens.  The binding is automatic and cannot be silently forgotten.
2. **Explicit class on non-stat tokens** — the outcome probability spans
   live under `text-body-sm` (not a stat token) and therefore wear an
   explicit `tabular-nums` class so they are also column-aligned.

Tests in `__tests__/hero.test.tsx` (the `MarketHero — tabular-nums
contract` describe block) lock both layers in place.

### Colour palette

No hardcoded hex values. All colours are Tailwind semantic tokens or CSS variables:

- `text-foreground` / `text-muted-foreground` for text
- `bg-card` / `bg-muted` for surfaces
- `border-border` for borders
- `text-emerald-600 dark:text-emerald-400` for "Yes" probability (context-safe)
- `bg-amber-500/15 text-amber-600 dark:text-amber-400` for the GrantFox badge

### Dark mode

Enabled via Tailwind's `class`-based dark mode strategy (configured in `tailwind.config.ts`). No JS checks; every dark-mode rule uses the `dark:` prefix.

### Responsive layout

The hero is single-column at all breakpoints. Responsive behaviour is handled via:

- `text-h2-responsive` — fluid heading size via `sm:` / `md:` / `lg:` prefixes (defined in `app/globals.css`).
- `flex-wrap gap-x-6 gap-y-3` on the stat strip — pills wrap naturally on narrow screens.
- `line-clamp-3` on the description — prevents the hero from becoming too tall on small screens.

### Accessibility (WCAG 2.1 AA)

| Feature | Implementation |
|---------|---------------|
| Landmark | `<section aria-labelledby>` — screen readers announce the section title |
| Heading hierarchy | `<h1>` for market title; page wraps it in `<main>` |
| Probability bar | Visible bar is `aria-hidden`; a `role="progressbar"` element with `aria-valuenow/min/max` and `aria-label` is `sr-only` |
| Share button | `aria-label="Share this market"` for unambiguous announcement |
| StatusBadge | Delegates to the repo's `StatusBadge` which has `role="status"` and `aria-describedby` wired to an `sr-only` description |
| Live region | A `role="status" aria-live="polite"` element announces volume and participant counts to assistive technology when they change |
| Tabular numerals | All visible figures (volume, participants, countdown, outcome %) use `font-variant-numeric: tabular-nums` so they stay column-aligned with each other and across re-renders (Issue #556) |
| Icons | All Lucide icons carry `aria-hidden="true"` |

---

## Exported Symbols

```ts
// Primary component
export function MarketHero(props: MarketHeroProps): JSX.Element

// Types
export interface MarketHeroProps { … }
export interface MarketOutcome { … }

// Internal helper — exported for testing convenience
export function StatPill(props: StatPillProps): JSX.Element
```

---

## Route

The component is consumed by `app/markets/[id]/page.tsx`, a **Next.js App Router server component** that:

1. Generates per-market Open Graph and Twitter metadata via `generateMetadata()`.
2. Resolves market data (mock in development; replace with real fetch).
3. Renders `<MarketHero />` as the page's primary section.

```
/markets/:id   →   app/markets/[id]/page.tsx   →   <MarketHero>
```

---

## Tests

Tests live at `app/markets/[id]/__tests__/hero.test.tsx`.

Run them with:

```bash
pnpm test app/markets
```

Covered cases:

- Renders with only required props
- All optional sections render / are absent based on props
- GrantFox badge presence / absence
- Probability bar: single outcome, two outcomes, 0%, 100%
- ARIA attributes on `progressbar`: `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`
- Stat strip: each stat independent; locale formatting; absent strip when no stats
- Share button: rendered / absent; click handler fires; live region present
- Accessibility: `region` landmark, `aria-labelledby`, `aria-label` on button
- StatusBadge integration: all five status values
- `StatPill` helper: label and value render; icon slot rendered
- **Tabular-nums contract (Issue #556):** every visible numeric display — volume, participants, timeLeft, leading outcome %, trailing outcome %, edge cases (0 %, 100 %, single outcome), and a sweep across every figure in the full props fixture — is asserted to carry either an explicit `tabular-nums` class or a stat-token class bound to tabular numerals by `styles/globals.css`.  Progress-bar ARIA values stay in sync with the visible numerals.
- Full props smoke-test

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-24 | Initial implementation — rebalanced hero layout for GrantFox FWC26 campaign |
| 2026-07-24 | **Issue #556 (v7) — same-day polish** — bound `text-stat-*` typography tokens to `font-variant-numeric: tabular-nums` in `styles/globals.css`; redundantly applied explicit `tabular-nums` on StatPill value and outcome probability spans; locked the contract with a new `MarketHero — tabular-nums contract (issue #556)` test block. |
