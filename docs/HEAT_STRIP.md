# HeatStrip — 24h Activity Heat Map

The `HeatStrip` component renders a compact 24-cell activity heat bar for market cards. Each cell represents one hour of engagement, with colour intensity mapping to activity level (cool-blue → hot-red). It lives inside `MarketCard` and lets users scan recent market activity at a glance.

## Quick Start

```tsx
import { HeatStrip } from "@/app/components/HeatStrip"

<HeatStrip
  data={[12, 8, 5, 3, 2, 4, 10, 22, 45, 68, 82, 90, 95, 88, 92, 85, 72, 65, 58, 50, 42, 35, 28, 18]}
  className="mt-3 w-full"
  data-testid="heat-strip-btc"
/>
```

## API

```tsx
interface HeatStripProps {
  /** 24-hour activity percentages (0–100). One entry per hour. */
  data?: number[] | null
  className?: string
  "data-testid"?: string
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `number[] \| null` | ❌ | `undefined` | Array of up to 24 values (0–100). Longer arrays are shown as-is; shorter/empty/null → component returns `null`. |
| `className` | `string` | ❌ | `undefined` | Additional CSS class on the root wrapper. |
| `data-testid` | `string` | ❌ | `undefined` | Test ID forwarded to the root element. |

### Data normalisation

Values are clamped to `[0, 100]`, rounded to integers, and non-finite values (`NaN`, `Infinity`) are filtered out before rendering.

## Visual design

### Colour thresholds

| Range    | Colour                        |
|----------|-------------------------------|
| 0–19     | `hsl(210, 15%, 65%)` — cool blue-gray |
| 20–39    | `hsl(170, 45%, 50%)` — teal           |
| 40–59    | `hsl(85, 55%, 45%)` — green           |
| 60–79    | `hsl(40, 80%, 55%)` — amber           |
| 80–100   | `hsl(10, 80%, 55%)` — red             |

Colours use HSL values directly (no Tailwind tokens) because the fine-grained 5-stop gradient doesn't map to the existing colour scale. All colours are designed for dark-mode contrast against the `#201F37` card backdrop.

### Structure

```
┌───────────────────────────────┐
│  24H ACTIVITY                 │  ← 11px uppercase label
│  ████████████████████████     │  ← 24 blocks, 8px tall, 1px gap
└───────────────────────────────┘
```

## Accessibility (WCAG 2.1 AA)

| Feature | Implementation |
|---------|---------------|
| `role="img"` | The block container is labelled as an image so screen readers treat it as a single visual asset. |
| `aria-label` | Generated dynamically: `"24-hour activity: Hour 1: 12%, Hour 2: 8%, …"` — each hour's value is announced. |
| `sr-only` summary | A `<span className="sr-only">` provides a plain-language fallback: `"24-hour activity heat map. Values range from 0 (cold) to 100 (hot)."`. |
| Colour-only fallback | The sr-only text ensures the heat map is not communicated by colour alone (SC 1.4.1). |
| Dark mode | Colours are chosen for sufficient contrast against `bg-[#201F37]` / `bg-card` surfaces. |

## Integration

`HeatStrip` is consumed by `MarketCard` (`app/components/MarketCard.tsx:90-94`):

```tsx
<HeatStrip
  data={market.activity24h}
  className="mt-3 w-full"
  data-testid={`heat-strip-${market.id}`}
/>
```

The `Market` interface (`content/markets.sample.ts:12-13`) requires the `activity24h` field:

```ts
export interface Market {
  // …
  /** 24-hour activity level per hour (0–100). Used by HeatStrip. */
  activity24h: number[];
}
```

## Testing

### HeatStrip unit tests

`app/components/__tests__/HeatStrip.test.tsx` — 8 tests:

- Renders 24 blocks for 24 data points
- Returns `null` for empty array, `null`, or `undefined`
- Has `role="img"`
- `aria-label` describes 24-hour activity
- Contains an `sr-only` summary
- Normalises out-of-range and invalid values
- Accepts custom `className`
- Forwards `data-testid`

### MarketCard integration tests

`app/components/__tests__/MarketCard.test.tsx:76-79` — 1 test:

- `"renders the heat strip"` — asserts the element with `data-testid="heat-strip-{id}"` is in the document.

```bash
pnpm test -- --testPathPatterns="HeatStrip|MarketCard"
```

## Dependencies

- `@/lib/utils` — `cn` classname utility
- No third-party chart/visualisation libraries

## Changelog

| Date | Change |
|------|--------|
| 2026-07-25 | Initial implementation — 24-cell activity heat strip for GrantFox FWC26 market cards |
