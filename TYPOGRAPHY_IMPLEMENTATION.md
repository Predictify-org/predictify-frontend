# Typography System Implementation Guide

## Overview

This document tracks the implementation of the Typography System standardization for Predictify frontend. The goal is to eliminate arbitrary font sizes, establish a clear hierarchy, and ensure responsive typography across all breakpoints.

## What Was Done

### 1. **Tailwind Configuration** ✅
Updated `tailwind.config.ts` with:
- **6 Heading levels** (H1-H6) with defined sizes, weights, and letter spacing
- **3 Body text sizes** (lg, md, sm) with proper line heights  
- **Caption & Label styles** (12px, 14px) for metadata
- **Numeric/Stat text** (lg, md, sm) for emphasized numbers
- **Monospace variants** for code content
- **Font family improvements** from Arial to system-ui

**Key sizes defined:**
- H1: 40px (bold, -0.02em letter spacing)
- H2: 32px (bold, -0.01em)
- H3: 24px (bold, -0.01em)
- H4: 20px (semibold)
- H5: 18px (semibold)
- H6: 16px (semibold)
- Body-lg: 18px
- Body-md: 16px (default)
- Body-sm: 14px
- Caption: 12px (medium weight)
- Stat-lg: 32px (bold)
- Stat-md: 24px (bold)
- Stat-sm: 18px (bold)

### 2. **Global CSS & Utilities** ✅
Updated both `app/globals.css` and `styles/globals.css` with:
- **Responsive typography utilities**
  - `.text-h1-responsive` - scales from 24px (mobile) → 32px (tablet) → 40px (desktop)
  - `.text-h2-responsive` - scales from 18px → 24px → 32px
  - `.text-h3-responsive` - scales from 14px → 18px → 24px
  - `.text-h4-responsive` - scales from 12px → 16px → 20px

- **Text wrapping utilities**
  - `.text-balance` - natural text wrapping for headings
  - `.truncate-lines-2` - truncate after 2 lines with ellipsis
  - `.truncate-lines-3` - truncate after 3 lines with ellipsis
  - `.text-ellipsis-overflow` - single-line truncation

- **Base semantic HTML styling** (h1-h6, p, small)

### 3. **Typography Examples Component** ✅
Created `components/typography-example.tsx` demonstrating:
- All heading levels (H1-H6) with sizes and weights
- Body text variants (large, medium, small)
- Labels and captions
- Numeric/stat text
- Text wrapping behaviors with examples
- Market card example
- Event details example with responsive layout
- Color and emphasis combinations

### 4. **Component Updates** ✅
Updated these components to use standard typography:

**`components/cards/step-card.tsx`**
- Replaced `text-[24.83px]` → `text-h3`
- Replaced `text-[19.86px]` → `text-body-lg`
- Replaced `text-[17.38px]` → `text-h5`
- Updated icon/check sizes to standard units

**`components/features-card.tsx`**
- Replaced `text-[25px]` → `text-h4`
- Replaced `text-[20px]` → `text-body-lg`

**`components/sections/hero.tsx`**
- New: Used `text-h1-responsive` for main hero headings
- Updated market card titles to `text-h4`, `text-h6`
- Replaced `text-lg` with `text-body-lg`
- Replaced `text-sm` with `text-body-sm` or `text-label`
- Updated notifications to use proper typography scale

**`app/(marketing)/_sections/how-it-works.tsx`**
- Replaced `text-[44.69px]` → `text-h2-responsive`
- Replaced `text-[24.83px]` → `text-h3-responsive`
- Replaced `text-[17.38px]` → `text-h5`

### 5. **Documentation** ✅
Created `TYPOGRAPHY.md` with:
- Quick reference table for all typography classes
- Detailed hierarchy explanations
- Code examples for each level
- Responsive typography examples
- Text wrapping/truncation patterns
- Market card example implementation
- Event details page example
- Table examples
- Best practices (DO's and DON'Ts)
- Migration guide (old → new patterns)
- Testing checklist

## Usage Guide

### For Headings
```tsx
// Main page title - responsive
<h1 className="text-h1-responsive">Page Title</h1>

// Desktop-only heading
<h2 className="text-h2">Section Heading</h2>

// Card title
<h3 className="text-h3">Market Title</h3>
```

### For Body Text
```tsx
// Introduction paragraph
<p className="text-body-lg">Large body text</p>

// Standard paragraph
<p className="text-body-md">Default paragraph</p>

// Secondary information
<p className="text-body-sm text-muted-foreground">Secondary text</p>
```

### For Long Questions/Outcomes
```tsx
// Prevent layout breaking - method 1: text balance
<h3 className="text-h3 text-balance">
  Question that might wrap awkwardly
</h3>

// Method 2: truncate to 2 lines
<p className="text-body-md truncate-lines-2">
  Very long question text...
</p>
```

### For Numbers
```tsx
// Large dashboard number
<div className="text-stat-lg font-bold">$45,230</div>

// Card metric
<div className="text-stat-md font-bold">234</div>

// Small badge number
<div className="text-stat-sm font-bold">5</div>
```

## Breakpoints

| Breakpoint | Width | Usage |
|-----------|-------|-------|
| Mobile | < 640px | Base/default sizes |
| Tablet (sm) | 640px+ | Medium sizes |
| Tablet (md) | 768px+ | Larger sizes |
| Desktop (lg) | 1024px+ | Full H1-H6 sizes |

## Migration Notes

When updating other components:

1. **Replace arbitrary pixel sizes** with semantic classes
   - Don't use: `text-[24.83px]`, `leading-[40.89px]`
   - Do use: `text-h3` (includes size and weight)

2. **Use responsive classes for mobile-first design**
   - Don't hardcode sizes for mobile/desktop
   - Do use: `text-h1-responsive` for auto-scaling

3. **Choose the right semantic level**
   - Card titles: `text-h4`
   - Subsection headings: `text-h3-responsive`
   - Large numbers: `text-stat-lg`
   - Help text: `text-caption`

4. **Handle long content**
   - Questions: use `truncate-lines-2` or `text-balance`
   - Table cells: use `truncate-lines-2`
   - Breadcrumbs: use `text-ellipsis-overflow`

## Testing Checklist

- [ ] H1-H6 headings display correctly on mobile (<640px)
- [ ] Responsive classes scale properly on tablet (640px-1024px)
- [ ] Long questions don't break layout (truncate-lines-2/3 working)
- [ ] Body text is readable on small screens
- [ ] Numbers stand out with stat-* classes
- [ ] Dark mode contrast passes WCAG AA
- [ ] Font stacks fallback correctly (system-ui → sans-serif)
- [ ] Captions and labels are visually distinct
- [ ] Text balance works for multi-line headings
- [ ] Mobile viewport (375px) displays correctly

## Files Modified

- `tailwind.config.ts` - Added typography scale
- `app/globals.css` - Added responsive utilities
- `styles/globals.css` - Added responsive utilities
- `components/cards/step-card.tsx` - Standardized typography
- `components/features-card.tsx` - Standardized typography
- `components/sections/hero.tsx` - Standardized typography
- `app/(marketing)/_sections/how-it-works.tsx` - Standardized typography

## Files Created

- `TYPOGRAPHY.md` - Complete typography documentation
- `components/typography-example.tsx` - Interactive examples component

## Next Steps

1. **Update remaining components** in dashboard and event pages to use standard typography
2. **Test on real devices** (iOS, Android) for mobile readability
3. **Verify contrast ratios** for accessibility compliance
4. **Update component library** documentation if applicable
5. **Create Storybook stories** for typography components (optional)

## Rollout Strategy

1. Components already updated are production-ready
2. Other components should migrate one page at a time
3. Test thoroughly on mobile before deployment
4. Use `text-balance` and `truncate-lines-*` on all long text
5. Reference `TYPOGRAPHY.md` for implementation details

## Support

- See `TYPOGRAPHY.md` for detailed usage examples
- View `components/typography-example.tsx` for interactive demo
- Reference updated components for implementation patterns
