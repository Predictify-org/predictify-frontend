# Infinite Scroll Visual Regression Screenshots

This directory contains reference screenshots for visual regression testing of the infinite scroll implementation.

## Screenshots

### 1. Initial Skeleton Loading State
**File**: `01-initial-skeleton.png`  
**Viewport**: Mobile 390×844  
**Description**: Shows skeleton placeholder rows while first page loads. Skeleton rows match exact height and layout of real items.

### 2. Loading More Indicator
**File**: `02-loading-more.png`  
**Description**: Shows the "Loading more events..." indicator at the bottom of the list when fetching next page.

### 3. End of List Message
**File**: `03-end-of-list.png`  
**Description**: Shows the "You've reached the end" message with divider lines when all pages are loaded.

### 4. Empty State
**File**: `04-empty-state.png`  
**Description**: Shows the empty state with calendar icon and guidance text when no items match filters.

### 5. Back-to-Top FAB Visible
**File**: `05-back-to-top-visible.png`  
**Description**: Shows the floating "Back to top" button visible after scrolling down more than 2 viewport heights.

### 6. Back-to-Top FAB Hidden
**File**: `06-back-to-top-hidden.png`  
**Description**: Shows the list at the top with the FAB hidden (scroll position < 2vh).

### 7. Scroll Position Restored
**File**: `07-scroll-restored.png`  
**Description**: Shows item 50 at the top of the viewport after back-navigation, demonstrating scroll position restoration.

## Capturing Screenshots

### Using Playwright

```bash
# Install Playwright if not already installed
npm install -D @playwright/test

# Run tests and update snapshots
npx playwright test --update-snapshots

# Run specific test
npx playwright test infinite-scroll.spec.ts --update-snapshots
```

### Manual Capture

1. Start the development server: `npm run dev`
2. Navigate to `/events` page
3. Use browser DevTools to set mobile viewport (390×844)
4. Capture screenshots at each state:
   - Initial load (before data arrives)
   - Scroll to bottom (loading more indicator)
   - Scroll to end (end-of-list message)
   - Clear filters (empty state)
   - Scroll down 2000px (FAB visible)
   - Scroll to top (FAB hidden)
   - Navigate to item → back (scroll restored)

### Screenshot Specifications

- **Format**: PNG
- **Mobile Viewport**: 390×844 (iPhone 12 Pro)
- **Desktop Viewport**: 1920×1080
- **DPI**: 2x (Retina)
- **Compression**: Optimized for web

## Comparison

Use these screenshots as baseline for visual regression testing. Any UI changes should be reviewed against these references to ensure:

- No layout shift on skeleton-to-content transition
- Loading indicators maintain fixed height
- FAB positioning is consistent across viewports
- Scroll restoration is pixel-perfect

## Updating Screenshots

When intentional UI changes are made:

1. Review the changes in the design system
2. Update screenshots to reflect new design
3. Document the changes in this README
4. Commit updated screenshots with descriptive message

Example commit message:
```
docs: update infinite-scroll screenshots for new FAB design

- Updated FAB button style to match new design tokens
- Changed positioning from bottom-right to bottom-center on mobile
- All other states remain unchanged
```
