# EventsGrid

A responsive card-grid view for prediction events, themed for the GrantFox FWC26 campaign.

## Overview

`EventsGrid` displays prediction events as styled cards in a responsive grid layout. It handles all UI states (loading, empty, error, data) and integrates with the shared Zustand events store.

## States

| State    | Component Rendered       | Description                                    |
| :------- | :----------------------- | :--------------------------------------------- |
| Loading  | `EventsGridSkeleton`     | Shape-parity skeleton cards while data loads  |
| Empty    | `NoMatchEmptyState`      | Contextual empty state with clear-filters btn |
| Error    | Inline error + retry     | Error alert with reload button                |
| Data     | Grid of `EventCard`s     | The actual event cards                        |

## Usage

```tsx
import { EventsGrid } from "@/components/events/events-grid"

// Basic usage (uses store internally)
;<EventsGrid />

// With custom className
;<EventsGrid className="my-custom-class" />
```

## Grid Layout

- **Mobile** (`< 640px`): 1 column
- **Tablet** (`640px – 1023px`): 2 columns
- **Desktop** (`≥ 1024px`): 3 columns

Gap: `gap-4 md:gap-6`

## Event Card Structure

Each card (`<article>`) contains:

1. **Header row**: Category icon (coloured orb) + Title + txHash + Category badge
2. **Stats row**: Odds (numeric), Participants (with Users icon), Status label
3. **Time remaining**: Live countdown progress bar with colour-coded urgency
4. **Footer**: End date + Actions dropdown (Edit, Delete)

## Theming

Uses the GrantFox FWC26 campaign palette:
- Card background: `bg-[#0A0A1A]`
- Card border: `border-[#540D8D]/20` (hover: `border-[#540D8D]/40`)
- Hover state: `hover:bg-[#540D8D]/5`
- Focus ring: `ring-[#540D8D]` on `focus-visible`
- Category badges: Preserve existing design tokens (purple/green/yellow/cyan)

## Accessibility

- **Cards**: `<article>` with `aria-labelledby` pointing to the title
- **Category icons**: `aria-hidden="true"` — text label conveys meaning (WCAG 2.1 AA 1.4.1)
- **Progress bars**: `role="progressbar"` with `aria-valuenow/min/max` and descriptive `aria-label`
- **Urgency**: Colour-coded with visually-hidden `<span>` for screen readers
- **Action menus**: Standard ARIA `menu` / `menuitem` patterns
- **Reduced motion**: Entry animations disabled when `prefers-reduced-motion: reduce`
- **Skeleton**: `aria-hidden="true"` with wrapper `aria-busy="true"` and `role="status"`

## Dependencies

- `@/lib/events-store` — Zustand store for event data
- `@/lib/compare-store` — Zustand store for compare feature
- `@/components/ui/skeleton` — Base pulse skeleton component
- `@/components/events/NoMatchEmptyState` — Empty state component
- `lucide-react` — Icon library

## Tests

Located in `components/events/__tests__/events-grid.test.tsx`.

Coverage includes:
- Skeleton rendering (count, aria attributes)
- Loading / error / empty states
- Data rendering (titles, badges, odds, participants, progress bars)
- Action menu interactions
- Accessibility (aria attributes, roles, labels)

