# Activity Timeline - Visual Patterns & Layouts

## Default View Pattern (Grouped & Collapsed)

Shows intelligently collapsed event groups with one-line summaries.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ACTIVITY TIMELINE                                          │
│  Last 4 days                                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ 🎯  Predictions                        ▸                ││
│  │     12 events                                           ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ 📅  Events                             ▸                ││
│  │     8 events                                            ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ ⚠️  Disputes                           ▸                ││
│  │     3 events                                            ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ 💳  Transactions                       ▼               ││
│  ├────────────────────────────────────────────────────────┤│
│  │ • ─ Deposit Received           5:30 PM                 ││
│  │      USDC transferred                2 hours ago       ││
│  │      +1000 USDC                                        ││
│  │                                                        ││
│  │ • ─ Withdrawal Processed       3:15 PM                 ││
│  │      Transaction confirmed              3 hours ago    ││
│  │      -500 USDC                                         ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│                [ Load Older Activities ]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Expanded View Pattern

Shows all events within a group when expanded.

```
┌────────────────────────────────────────────────────────────┐
│ 🎯  Predictions                            ▼               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ • ─ Prediction Settled          2:45 PM                   │
│      Market closure confirmed        Now                  │
│      Event: Arsenal vs Liverpool                          │
│                                                            │
│ • ─ Prediction Placed           1:30 PM                   │
│      You bet on upcoming event         1 hour ago        │
│      Amount: +100 USDC                                   │
│                                                            │
│ • ─ Prediction Placed          12:15 PM                   │
│      You bet on upcoming event     2 hours ago           │
│      Amount: +250 USDC                                   │
│                                                            │
│ • ─ Prediction Placed          10:00 AM                   │
│      You bet on upcoming event     Yesterday             │
│      Amount: +75 USDC                                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Timeline Row Anatomy

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  • ────────────  TITLE                    2:45 PM          │
│  │               DESCRIPTION               2 hours ago     │
│  │               Optional amount: +500 USDC                │
│  │               Metadata: category:crypto                 │
│  │                                                         │
│  └─ (continuation to next event)                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Legend:
  •     = Timeline dot (colored by group)
  ─     = Timeline connector line
  TIME  = Exact time (HH:MM AM/PM)
  DATE  = Relative time (ago, Yesterday, etc.)
```

## Empty State Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│                      ┌───────────┐                         │
│                      │           │                         │
│                      │   📦      │                         │
│                      │           │                         │
│                      └───────────┘                         │
│                                                             │
│              No Activities Yet                             │
│                                                             │
│        Your activity timeline is empty.                   │
│  Start making predictions and trading to see your         │
│              activities here.                              │
│                                                             │
│              [ Get Started ]                              │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Loading State Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ ░░░  ░░░              ░░░░░░░░░░░░░░░░  ▸            ││
│  │ ░░░  ░░░              ░░░░░░░░░░░░░░░░                ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ░░░ Events                                                │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ • ─ ░░░░░░░░░░░░░░░░              ░░░░░░             ││
│  │      ░░░░░░░░░░░░░░░░░░░░░░░░░░  ░░░░░░░░░░         ││
│  │                                                        ││
│  │ • ─ ░░░░░░░░░░░░░░░░              ░░░░░░             ││
│  │      ░░░░░░░░░░░░░░░░░░░░░░░░░░  ░░░░░░░░░░         ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│     Loading your activity timeline...                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Legend: ░░░ = Skeleton loader
```

## Error State Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      ┌───────────┐                         │
│                      │           │                         │
│                      │   ⚠️      │                         │
│                      │           │                         │
│                      └───────────┘                         │
│                                                             │
│         Failed to Load Activities                          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐│
│  │ Error: Network connection failed                      ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
│   There was a problem loading your activity timeline.     │
│              Please try again.                             │
│                                                             │
│            [ ↻ Try Again ]                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Mobile Responsive Layout

### Portrait (< 640px)

```
┌──────────────────────────────┐
│                              │
│  Activity Timeline           │
│                              │
├──────────────────────────────┤
│                              │
│  ┌────────────────────────┐ │
│  │ 🎯 Predictions    ▸    │ │
│  │    12 events           │ │
│  └────────────────────────┘ │
│                              │
│  ┌────────────────────────┐ │
│  │ • ─ Title      5:30 PM │ │
│  │      Desc             │ │
│  │      2 hours ago      │ │
│  │      +500 USDC        │ │
│  │                        │ │
│  │ • ─ Title      3:15 PM │ │
│  │      Desc             │ │
│  │      3 hours ago      │ │
│  │      -200 USDC        │ │
│  └────────────────────────┘ │
│                              │
│  [ Load Older Activities ]   │
│                              │
└──────────────────────────────┘
```

### Landscape / Tablet

```
┌────────────────────────────────────────────┐
│ Activity Timeline                          │
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ 🎯  Predictions            ▼         │ │
│  ├──────────────────────────────────────┤ │
│  │ • ─ Prediction Title      5:30 PM   │ │
│  │      Description               Now   │ │
│  │      Amount: +500 USDC              │ │
│  │                                     │ │
│  │ • ─ Prediction Title      3:15 PM   │ │
│  │      Description            5h ago   │ │
│  │      Amount: +250 USDC              │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  [ Load Older Activities ]                 │
│                                            │
└────────────────────────────────────────────┘
```

## Color Palette for Groups

```
Predictions:    #8B5CF6  (Purple)   bg: #F3E8FF
Events:         #06B6D4  (Cyan)     bg: #ECFDF5
Disputes:       #EF4444  (Red)      bg: #FEE2E2
Transactions:   #10B981  (Green)    bg: #ECFDF5
Account:        #3B82F6  (Blue)     bg: #EFF6FF
Verification:   #F59E0B  (Amber)    bg: #FFFBEB
```

## Interactive States

### Group Header - Default
```
┌────────────────────────────────────────────────────────────┐
│ 🎯  Predictions                     Event Count    ▸       │
└────────────────────────────────────────────────────────────┘
```

### Group Header - Hover
```
┌────────────────────────────────────────────────────────────┐
│ 🎯  Predictions                     Event Count    ▸       │ ← shadow
└────────────────────────────────────────────────────────────┘
  bg opacity increases
```

### Group Header - Expanded
```
┌────────────────────────────────────────────────────────────┐
│ 🎯  Predictions                     Event Count    ▼       │
├────────────────────────────────────────────────────────────┤
│ [expanded content here]                                     │
└────────────────────────────────────────────────────────────┘
```

### Timeline Item - Default
```
┌────────────────────────────────────────────────────────────┐
│ • ─ Event Title                     2:45 PM               │
│      Event Description                2 hours ago         │
└────────────────────────────────────────────────────────────┘
```

### Timeline Item - Hover
```
┌────────────────────────────────────────────────────────────┐
│ • ─ Event Title                     2:45 PM               │
│      Event Description                2 hours ago         │
└────────────────────────────────────────────────────────────┘
  ^ bg-gray-50
```

## Typography Scale

```
Desktop:
  Group Header:    16px Font Weight 600
  Event Title:     16px Font Weight 500
  Description:     14px Font Weight 400
  Timestamp:       14px Font Weight 700 (relative)
                   14px Font Weight 400 (time)

Mobile:
  Group Header:    14px Font Weight 600
  Event Title:     14px Font Weight 500
  Description:     12px Font Weight 400
  Timestamp:       12px Font Weight 700 (relative)
                   12px Font Weight 400 (time)
```

## Spacing & Layout

```
Component Padding:        16px (mobile), 24px (desktop)
Group Spacing:            16px
Item Spacing:             16px
Timeline Dot Size:        12px (mobile), 16px (desktop)
Timeline Line Height:     48px
Icon Box:                 32px (mobile), 40px (desktop)
Icon Size:                16px (mobile), 20px (desktop)
```

## Animation & Transitions

```css
/* Group Toggle */
Chevron rotation:  0.3s ease-in-out
               0deg → 180deg

/* Card Hover */
Box-shadow:    0.2s ease
Background:    0.2s ease

/* Load More Button */
Hover:         0.15s ease
Scale:         1.02x

/* Skeleton Loaders */
Animation:     pulse
Duration:      2s infinite
Opacity:       0.7 → 0.4 → 0.7
```

## Accessibility Features

```
Keyboard Navigation:
  Tab           → Next interactive element
  Shift+Tab     → Previous interactive element
  Space/Enter   → Toggle group expansion
  Esc           → Close modals/dropdowns

Focus Indicators:
  Outline:      2px solid focus-color
  Offset:       2px
  Color:        Brand color (#8B5CF6)

ARIA Labels:
  role="button"
  aria-expanded="true|false"
  aria-label="Toggle Predictions group"
  tabindex="0"
```

## Screenshot Checklist

Screenshots to capture for documentation:

- [x] Default view (4-6 groups, some collapsed)
- [x] Expanded view (all groups open)
- [x] Empty state
- [x] Error state
- [x] Loading state
- [x] Mobile view (portrait)
- [x] Mobile view (landscape/tablet)
- [x] Transaction details (with amounts)
- [x] Group expansion animation
- [x] Load more in action

## Responsive Breakpoints

```
Mobile:    < 640px   (max: 100% - 32px padding)
Tablet:    ≥ 640px   (max: 728px)
Desktop:   ≥ 1024px  (max: 1280px)
```
