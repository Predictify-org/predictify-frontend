# Activity Timeline Design Patterns

## Overview

The Activity Timeline component displays a chronological list of user lifecycle events with intelligent grouping, collapsing, and load-more functionality. It prioritizes user-relevant events while reducing noise through smart grouping rules.

**File Structure:**
```
components/activity-timeline/
├── activity-timeline.tsx          # Main component with grouping logic
├── activity-timeline-item.tsx     # Individual event row
├── activity-timeline-empty.tsx    # Empty/error/loading states
├── index.ts                       # Component exports
└── __tests__/
    └── activity-timeline.test.tsx # Comprehensive test suite

lib/
├── activity-timeline.ts           # Grouping, formatting utilities

types/
└── activity.ts                    # Type definitions
```

## Component Architecture

### ActivityTimeline (Main Component)

The main component orchestrates:
- Data grouping by activity type
- Pagination / "load more" functionality
- State management for expanded/collapsed groups
- Loading, error, and empty state handling

**Key Features:**
- 🎯 **Smart Grouping**: Events grouped by type (Predictions, Events, Disputes, etc.)
- 📊 **Intelligent Collapsing**: Automatically collapses noisy event groups (3+ events)
- ⏰ **Relative Timestamps**: Shows "2 hours ago", "Yesterday", etc.
- 📥 **Load More**: Pagination for browsing older activities
- ♿ **Accessible**: Full keyboard navigation and screen reader support

### ActivityTimelineItem (Event Row)

Renders individual event rows with:
- Timeline connector (colored dot + vertical line)
- Event icon and type
- Title and optional description
- Timestamp (time + relative)
- Amount for transactions
- Metadata tags

**Example Event Flow:**
```
• (dot) ─────── Title [Time]
│                Description  [2 hours ago]
│                Amount: +500 USDC
├── Metadata: category:crypto
```

### State Components

**ActivityTimelineEmpty:**
- Shown when zero activities exist
- Clear messaging + call-to-action
- Archive icon for visual context

**ActivityTimelineError:**
- Error message and icon
- Technical error details
- Retry button for recovery

**ActivityTimelineLoading:**
- Skeleton loaders matching component structure
- Smooth animation to indicate in-progress
- Maintains layout stability

## Grouping Rules

### Automatic Grouping by Type

Events are grouped into 6 categories:

| Category | Icon | Events | Color |
|----------|------|--------|-------|
| **Predictions** | 🎯 | Placed, Settled | Purple |
| **Events** | 📅 | Created, Verified, Opened, Closed | Cyan |
| **Disputes** | ⚠️ | Filed, Resolved | Red |
| **Transactions** | 💳 | Deposit, Withdrawal, Claimed | Green |
| **Account** | 👤 | Updated, Settings Changed | Blue |
| **Verification** | ✅ | Requested, Approved | Amber |

### Collapse Logic

Groups are **automatically collapsed** when:
1. Contains 3 or more events (within 60-minute window)
2. AND contains no "priority" events

**Priority Events (Always Visible):**
- `prediction_settled` - User settlement
- `dispute_resolved` - Resolution of disputes
- `winnings_claimed` - Financial gain

### Within-Group Sorting

Events within each group are sorted:
- **Primary**: By timestamp (newest first)
- **Secondary**: By event priority

## Timestamp Strategy

### Relative Time Display (Primary)

The main timestamp uses human-readable relative format:

```
Just now              (< 1 minute)
5 minutes ago         (1-60 minutes)
2 hours ago           (1-24 hours)
Yesterday             (24-48 hours)
3 days ago            (2-7 days)
Mar 12, 2024          (7+ days, shows date)
```

### Exact Time Display (Secondary)

Shows precise time in HH:MM AM/PM format:
```
2:45 PM (at top-right of event)
```

### Tooltip (on Hover)

Full timestamp with timezone:
```
March 15, 2024, 2:45 PM EST
```

## Load More Pattern

### Pagination Strategy

- **Page Size**: 6 activity groups per page
- **Load Trigger**: User clicks "Load Older Activities" button
- **Button Position**: Centered below last visible group
- **Feedback**: Shows remaining groups available

### Implementation

```tsx
function handleLoadMore() {
  // Load next page of activities
  // Append to visible groups
  // Update hasMore state
  // Call onLoadMore callback
}
```

## Responsive Design

### Mobile (<640px)
- Single column layout
- Full-width cards
- Touch-friendly spacing (larger tap targets)
- Stacked timestamp (time above relative)
- Hidden metadata tags
- Simplified icons

### Tablet (640px-1024px)
- Optimal card width
- Sidebar (if needed)
- Improved spacing
- All metadata visible

### Desktop (>1024px)
- Multi-column option
- Hover effects
- Full detail display
- Optimized spacing

## Visual Design Specifications

### Colors & Styling

**Group Headers:**
- Background: Soft pastel (e.g., `bg-[#F3E8FF]` for purple)
- Icon background: Transparent color overlay
- Border: Light gray divider
- Hover: Subtle shadow effect

**Timeline Dots:**
- Size: 3px mobile, 4px desktop
- Color: Group-specific color
- Border: 2px white

**Timeline Line:**
- Width: 0.5px
- Color: Group color with 30% opacity
- Height: 48px between events

**Cards:**
- Border: 1px gray-200
- Background: White
- Hover bg: Gray-50
- Border-radius: 8px
- Shadow (hover): Subtle

### Typography

**Group Header:**
- Font: Medium semibold
- Size: 14px mobile, 16px desktop
- Color: Gray-900

**Event Title:**
- Font: Medium
- Size: 14px mobile, 16px desktop
- Color: Gray-900

**Event Description:**
- Font: Regular
- Size: 12px mobile, 14px desktop
- Color: Gray-600

**Timestamps:**
- Font: Regular
- Size: 12px mobile, 14px desktop
- Color: Gray-500/700
- Relative: Bold (700)

**Amount:**
- Font: Semibold
- Size: 14px mobile, 16px desktop
- Color: Green-600 (deposit) / Red-600 (withdrawal)

## Accessibility Features

### Keyboard Navigation
- Tab through all interactive elements
- Space/Enter to toggle group expansion
- Load More button fully keyboard accessible

### Screen Reader Support
- Semantic HTML structure
- Descriptive ARIA labels
- Event descriptions read out
- Group count announced
- Timestamps include full date format

### Visual Accessibility
- Sufficient color contrast (WCAG AA)
- Icons paired with text (not icon-only)
- Focus indicators on interactive elements
- Flexible text sizing

## Performance Considerations

### Rendering Optimization
- Virtual scrolling for 100+ events (optional)
- Memoized group calculations
- Lazy-loaded expanded groups
- CSS containment on cards

### Bundle Size
- Component: ~8KB minified
- Utils: ~3KB minified
- Types: ~1KB minified
- **Total**: ~12KB

### Memory Usage
- Efficient grouping algorithms
- Pagination prevents large DOM trees
- Event delegation for click handlers

## Error Handling

### Network Errors
```tsx
<ActivityTimeline
  error="Failed to fetch activities. Please check your connection."
  onRetry={handleRetry}
/>
```

### Missing Data
- Gracefully handles missing descriptions
- Omits optional fields (amount, metadata)
- Default icons for unknown event types

### Malformed Timestamps
- Falls back to UTC format
- Invalid dates show as "-"

## Testing Strategy

### Unit Tests
- **Grouping Logic**: Verify correct grouping by type
- **Collapse Rules**: Test collapse conditions
- **Timestamp Formatting**: All time formats
- **Pagination**: Load more behavior

### Integration Tests
- **Component Rendering**: All states (default, loading, error, empty)
- **User Interactions**: Click handlers, group toggle
- **Prop Changes**: Responsive to prop updates

### Visual Regression Tests
- Screenshot comparisons for each state
- Mobile/tablet/desktop variants
- Light/dark mode support

### E2E Tests
- Full flow: Load → Toggle Group → Load More
- Error recovery
- Accessibility testing (axe, WAVE)

## Usage Examples

### Basic Usage
```tsx
import { ActivityTimeline } from "@/components/activity-timeline";

export function ActivityPage() {
  const activities = useActivities(); // Your hook
  
  return (
    <ActivityTimeline
      activities={activities}
      pageSize={6}
      onLoadMore={handleLoadMore}
    />
  );
}
```

### With Loading State
```tsx
export function ActivityPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchActivities()
      .then(setActivities)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ActivityTimeline
      activities={activities}
      isLoading={loading}
      error={error}
      onLoadMore={() => fetchMoreActivities()}
    />
  );
}
```

### Custom Styling
```tsx
<div className="bg-white rounded-lg p-6">
  <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
  <ActivityTimeline
    className="max-w-2xl"
    pageSize={8}
  />
</div>
```

## Future Enhancements

### Planned Features
- [ ] Date separators ("Today", "March 15")
- [ ] Search/filter within timeline
- [ ] Custom event type icons (from app)
- [ ] Notification badges for unread events
- [ ] Event detail drawer/modal
- [ ] Export timeline (CSV/PDF)
- [ ] Bulk actions (archive, delete)
- [ ] Timeline statistics (events over time)

### Performance Improvements
- [ ] Virtual scrolling for 1000+ events
- [ ] Server-side pagination
- [ ] Optimistic updates for actions
- [ ] Caching strategy

### Analytics
- [ ] Track which groups users expand
- [ ] Monitor load more usage
- [ ] Detect abandoned activities
- [ ] User engagement metrics

## Browser Support

- Chrome/Edge: ✅ Latest 2 versions
- Firefox: ✅ Latest 2 versions
- Safari: ✅ Latest 2 versions
- Mobile: ✅ iOS 14+, Android 10+

## Demo

Visit `/dashboard/activity-timeline-demo` to see:
- Default view (grouped & collapsed)
- Expanded view (all groups open)
- Empty state
- Error handling
- Loading skeleton
- Interactive examples

## Questions?

Refer to:
- `/types/activity.ts` - Type definitions
- `/lib/activity-timeline.ts` - Utility functions
- `activity-timeline.test.tsx` - Test examples
