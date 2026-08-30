# NoMatchEmptyState Component

## Overview

The `NoMatchEmptyState` component displays an illustrated empty state when the user's active filter combination returns zero prediction markets. It's designed to be clear, helpful, and accessible.

## Location

- **Component**: `components/events/NoMatchEmptyState.tsx`
- **Tests**: `components/events/__tests__/NoMatchEmptyState.test.tsx`
- **Integration**: Used by `EventsTable` when `filteredEvents.length === 0`

## Features

### 1. Context-aware Copy

The component adapts its heading and body text based on which filter(s) are active:

| Active Filters | Heading | Body Text |
|----------------|---------|-----------|
| **Search only** | "No markets match your search" | Suggests trying different keywords |
| **Categories only** | "No markets in this category" | Suggests trying a different category |
| **Date range only** | "No markets in that date range" | Suggests widening the date range |
| **Multiple/Mixed** | "No matching markets" | Generic advice to adjust filters |

### 2. Clear Filters CTA

A single-click "Clear all filters" button resets all active filters to their default state:
- Clears search query
- Deselects all categories
- Resets date range
- Restores odds range to default `[0, 10]`

### 3. WCAG 2.1 AA Compliance

- **`role="status"`** + **`aria-live="polite"`**: Screen readers announce the transition to the empty state without interrupting the user's current task
- **`aria-label`** on the status region: Descriptive label matching the heading for context
- **High contrast support**: Uses design tokens (`text-foreground`, `bg-muted`, `border-border`) that adapt to dark mode and high-contrast themes
- **Reduced motion**: The entrance animation (`fade-in zoom-in-95`) is skipped when `prefers-reduced-motion: reduce` is set
- **Keyboard focusable button**: The CTA has `type="button"` and full keyboard navigation support

### 4. Responsive Layout

- Centered vertical column layout with generous padding (`py-16 px-4`)
- Dashed border (`border-dashed border-border/40`) provides clear visual containment
- Icon illustration in a muted circle (`bg-muted`) — brand purple icon (`#540D8D`)
- Body copy constrained to `max-w-sm` for optimal line length on wide viewports

### 5. Design Token Consistency

All visual properties reference CSS custom properties from the design system:
- `--foreground` / `--muted-foreground` for text
- `--background` for the container background
- `--border` for the dashed outline
- `--muted` for the icon background circle
- `--accent` / `--accent-foreground` for button hover states

This ensures automatic dark-mode inversion without hardcoded color overrides.

## Usage Example

```tsx
import { NoMatchEmptyState } from "@/components/events/NoMatchEmptyState"

// Inside EventsTable or similar component
if (filteredEvents.length === 0) {
  return (
    <NoMatchEmptyState
      hasSearch={!!filters.search}
      hasCategories={filters.category.length > 0}
      hasDateRange={!!(filters.dateRange.from || filters.dateRange.to)}
      onClearFilters={() => {
        setSearch("")
        setFilters({
          category: [],
          oddsRange: [0, 10],
          dateRange: { from: null, to: null },
        })
      }}
    />
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `hasSearch` | `boolean` | `false` | Whether a search query is active |
| `hasCategories` | `boolean` | `false` | Whether category filters are active |
| `hasDateRange` | `boolean` | `false` | Whether a date range filter is active |
| `onClearFilters` | `() => void` | **required** | Callback invoked when the user clicks "Clear all filters" |
| `className` | `string` | `undefined` | Additional CSS classes for the wrapper |

## Icon Mapping

Each filter context gets a matching Lucide React icon:

- **Search**: `Search` (magnifying glass)
- **Category**: `Tag` (category label)
- **Date range**: `CalendarX` (calendar with no events)
- **Generic/Mixed**: `Filter` (funnel)

All icons are rendered at `h-7 w-7` with `text-[#540D8D]` (brand purple) and `aria-hidden="true"`.

## Test Coverage

The test suite (`NoMatchEmptyState.test.tsx`) covers:

- **Rendering**: Button presence, custom `className` support
- **Context-aware copy**: All four message variants
- **Interaction**: `onClearFilters` callback invoked on button click
- **Accessibility**: `role="status"`, `aria-live="polite"`, `aria-label`, button keyboard access

Integration coverage lives in `events-table.a11y.test.tsx`, verifying:
- Empty state is rendered when `filteredEvents` is empty
- "Clear all filters" button is present
- The status region has the correct `aria-live` attribute

## Visual Preview

```
┌─────────────────────────────────────────┐
│  ┌─────────┐                            │
│  │  Icon   │  ← Brand purple icon in    │
│  │ (muted) │    muted circular bg       │
│  └─────────┘                            │
│                                         │
│  [Heading]      ← Semibold, foreground │
│  [Body text]    ← Muted foreground     │
│                                         │
│  [Clear all filters]  ← Outline button │
└─────────────────────────────────────────┘
```

## Related Components

- **`EventsTable`**: Primary consumer of this component
- **`EventsToolbar`**: Houses the filter controls that influence the empty state
- **`CategoryPills`**: Category filter UI component
- **`DateRangePicker`**: Date range filter UI component
- **`SearchInput`**: Search query input component

## GrantFox Campaign Notes

This component was implemented for **GrantFox issue #473**, part of the FWC26 UI/UX campaign. It replaces the previous inline empty state in `EventsTable` with a richer, more accessible pattern that includes:
- Context-aware illustrations and copy
- A "Clear filters" escape hatch
- Full WCAG 2.1 AA compliance with live-region announcements
- Design-token consistency for dark mode and high-contrast support
