# Trending Rail — "What's Happening Now"

The `TrendingRail` component displays a horizontally-scrollable carousel of trending prediction markets on the marketing home page. It highlights markets with high 24-hour trading volume and active participation.

## Quick Start

```tsx
import { TrendingRail } from "@/app/components/TrendingRail"

// Render on the marketing page
<TrendingRail />
```

## Default Markets

8 curated markets across Crypto, Football, Politics, Stocks, Sports, and Entertainment. Markets with the highest 24h volume are flagged as "Hot" with a flame badge.

## Features

- **Horizontal carousel** — snap-scrolling cards with keyboard navigation (ArrowLeft / ArrowRight)
- **Hot market badges** — markets with `isHot: true` display a flame badge
- **Volume indicators** — each card shows 24h trading volume with a trend icon
- **Scroll buttons** — appear on hover for desktop users
- **Responsive** — cards are 280px on mobile, 300px on desktop
- **Accessible** — labelled carousel region, keyboard-focusable, ARIA controls
- **Empty state** — returns nothing when no markets are provided

## API

```tsx
interface TrendingRailProps {
  /** Override the default trending markets. */
  markets?: TrendingMarket[]
  className?: string
}

interface TrendingMarket {
  id: string
  title: string
  category: string
  volume: string        // e.g. "$42.1k"
  participants: number
  odds: number
  isHot?: boolean       // Shows flame badge
  href: string
}
```

### Custom Markets

```tsx
<TrendingRail
  markets={[
    {
      id: "my-market",
      title: "Will my team win?",
      category: "Sports",
      volume: "$12.5k",
      participants: 450,
      odds: 2.5,
      isHot: true,
      href: "/events",
    },
  ]}
/>
```

## Placement

The rail is rendered on the marketing home page (`app/(marketing)/page.tsx`) between the Hero and KpiStrip sections:

```tsx
<Hero />
<TrendingRail />
<KpiStrip />
```

## Testing

11 tests cover:

- Rendering (heading, all markets, links)
- Empty state (no markets → nothing rendered)
- Hot market badges
- Volume display
- Keyboard navigation (ArrowLeft / ArrowRight)
- Accessibility (labelled region, keyboard-focusable)
- Custom market lists

```bash
pnpm test -- app/components/TrendingRail.test.tsx
```

## Dependencies

- `lucide-react` — icons (Flame, TrendingUp, Users, ChevronLeft, ChevronRight)
- `@/lib/utils` — `cn` class utility
