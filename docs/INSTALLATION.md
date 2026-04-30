# Infinite Scroll UX - Installation Guide

Complete setup instructions for the virtualized infinite scroll implementation.

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 10.18.0 (or npm/yarn)
- Next.js 15.2.4
- React 19

## Installation Steps

### 1. Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install @tanstack/react-virtual

# Using npm
npm install @tanstack/react-virtual

# Using yarn
yarn add @tanstack/react-virtual
```

### 2. Verify Installation

Check that the dependency was added to `package.json`:

```json
{
  "dependencies": {
    "@tanstack/react-virtual": "^3.10.8"
  }
}
```

### 3. File Structure

Ensure all files are in place:

```
lib/
├── scroll-position-store.ts
├── events-store.ts (updated)
└── __tests__/
    └── scroll-position-store.test.ts

components/
├── ui/
│   ├── loading-more-indicator.tsx
│   ├── end-of-list.tsx
│   ├── back-to-top-fab.tsx
│   └── __tests__/
│       ├── loading-more-indicator.test.tsx
│       ├── end-of-list.test.tsx
│       └── back-to-top-fab.test.tsx
└── events/
    ├── virtualized-events-list.tsx
    └── __tests__/
        └── virtualized-events-list.integration.test.tsx

app/(dashboard)/
└── events-virtualized/
    └── page.tsx

docs/
├── infinite-scroll-ux.md
├── INSTALLATION.md
└── screenshots/
    └── infinite-scroll/
        └── README.md
```

### 4. Update Events Store

The `lib/events-store.ts` file has been updated with:

- `hasNextPage` state
- `isFetchingNextPage` state
- `lastFetchTime` for cache staleness
- `loadNextPage()` action
- `isDataStale()` helper

These changes are backward compatible with existing code.

### 5. Run Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test scroll-position-store
npm test loading-more-indicator
npm test end-of-list
npm test back-to-top-fab
npm test virtualized-events-list

# Run with coverage
npm test -- --coverage
```

### 6. Start Development Server

```bash
npm run dev
```

Navigate to:
- `/events-virtualized` - Demo page with virtualized list
- `/events` - Original events page (unchanged)

## Usage

### Basic Implementation

```tsx
import { VirtualizedEventsList } from "@/components/events/virtualized-events-list"

export default function MyPage() {
  return (
    <div>
      <h1>My Events</h1>
      <VirtualizedEventsList />
    </div>
  )
}
```

### With Custom Configuration

```tsx
import { VirtualizedEventsList } from "@/components/events/virtualized-events-list"
import { useEventsStore } from "@/lib/events-store"

export default function MyPage() {
  const { loadEvents } = useEventsStore()

  React.useEffect(() => {
    loadEvents()
  }, [loadEvents])

  return (
    <div className="container mx-auto p-4">
      <VirtualizedEventsList className="custom-class" />
    </div>
  )
}
```

### Standalone Components

You can use individual components separately:

```tsx
import { LoadingMoreIndicator } from "@/components/ui/loading-more-indicator"
import { EndOfList } from "@/components/ui/end-of-list"
import { BackToTopFab } from "@/components/ui/back-to-top-fab"

// Loading indicator
<LoadingMoreIndicator 
  isLoading={isFetching} 
  text="Loading more items..."
/>

// End of list
<EndOfList 
  show={!hasMore} 
  text="No more items"
/>

// Back to top button
<BackToTopFab 
  scrollContainerRef={containerRef}
  threshold={2}
  onScrollToTop={() => console.log("Scrolled to top")}
/>
```

## Configuration

### Virtualization Settings

Edit `components/events/virtualized-events-list.tsx`:

```typescript
const rowVirtualizer = useVirtualizer({
  count: filteredEvents.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,  // Change item height
  overscan: 3,             // Change overscan (3-5 recommended)
})
```

### Stale Time Threshold

Edit `lib/events-store.ts`:

```typescript
// Change from 60 seconds to your preferred value
const STALE_TIME_MS = 60 * 1000  // 60 seconds
```

### Infinite Scroll Trigger Distance

Edit `components/events/virtualized-events-list.tsx`:

```typescript
// Trigger when within 200px of bottom
if (distanceFromBottom < 200 && hasNextPage && !isFetchingNextPage) {
  loadNextPage()
}
```

### Back-to-Top Threshold

```tsx
<BackToTopFab 
  scrollContainerRef={parentRef}
  threshold={2}  // Change to 1, 2, 3, etc. (viewport heights)
/>
```

## Troubleshooting

### Issue: "Cannot find module '@tanstack/react-virtual'"

**Solution**: Install the dependency:
```bash
npm install @tanstack/react-virtual
```

### Issue: Scroll position not restoring

**Possible causes**:
1. Route key changed (check query params)
2. Component remounted before scroll saved
3. Container ref not set

**Debug**:
```typescript
// Add logging to see what's happening
console.log("Route key:", routeKey)
console.log("Saved position:", getScrollPosition(routeKey))
console.log("Container ref:", parentRef.current)
```

### Issue: White flash during fast scrolling

**Solution**: Increase overscan value:
```typescript
overscan: 5  // Increase from 3 to 5
```

**Trade-off**: More memory usage

### Issue: Layout shift when skeleton transitions to content

**Solution**: Ensure skeleton rows match exact item height:
```typescript
// In EventsTableSkeleton
<div className="h-20">  {/* Must match item height */}
  <Skeleton />
</div>
```

### Issue: Loading indicator causes scroll jump

**Solution**: Ensure fixed height is set:
```tsx
<LoadingMoreIndicator 
  isLoading={true}
  className="h-12"  // Fixed height prevents jump
/>
```

### Issue: Tests failing with "scrollTo is not a function"

**Solution**: Mock scrollTo in test setup:
```typescript
Object.defineProperty(HTMLElement.prototype, "scrollTo", {
  writable: true,
  value: jest.fn(),
})
```

## Performance Optimization

### 1. Reduce Item Complexity

Simplify item rendering to improve scroll performance:
- Remove unnecessary animations
- Lazy load images
- Minimize re-renders with React.memo

### 2. Adjust Overscan

Balance between performance and UX:
- Lower overscan (1-2): Better memory, possible white flash
- Higher overscan (5-7): Smoother scroll, more memory

### 3. Use Fixed Item Heights

If possible, use fixed heights instead of dynamic:
```typescript
estimateSize: () => 80  // Fixed
// vs
estimateSize: (index) => itemHeights[index]  // Dynamic
```

### 4. Debounce Scroll Events

For expensive operations on scroll:
```typescript
import { debounce } from "lodash"

const handleScroll = debounce(() => {
  // Expensive operation
}, 100)
```

## Migration from Existing List

### Step 1: Backup Current Implementation

```bash
cp components/events/events-table.tsx components/events/events-table.backup.tsx
```

### Step 2: Update Route

Replace `EventsTable` with `VirtualizedEventsList`:

```tsx
// Before
import { EventsTable } from "@/components/events/events-table"

// After
import { VirtualizedEventsList } from "@/components/events/virtualized-events-list"
```

### Step 3: Remove Pagination Component

Infinite scroll replaces pagination:

```tsx
// Remove this
<EventsPagination />
```

### Step 4: Test Thoroughly

- Test scroll position preservation
- Test infinite scroll loading
- Test back-to-top button
- Test on mobile devices
- Test with slow network (throttle in DevTools)

### Step 5: Monitor Performance

Use React DevTools Profiler to check:
- Render times
- Re-render frequency
- Memory usage

## Next Steps

1. Read the full documentation: `docs/infinite-scroll-ux.md`
2. Review the demo page: `/events-virtualized`
3. Run the test suite: `npm test`
4. Capture visual regression screenshots
5. Deploy to staging for QA testing

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the full documentation
3. Check test files for usage examples
4. Review the demo page implementation

## Version History

- **1.0.0** (April 29, 2026) - Initial implementation
  - Virtualized rendering with @tanstack/react-virtual
  - Infinite scroll with loading states
  - Scroll position preservation
  - Back-to-top FAB
  - Complete test coverage
  - Full documentation
