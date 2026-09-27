# Typography Testing & Validation Guide

## Testing Environments

### Desktop Testing
- **Chrome**: Latest version
- **Firefox**: Latest version
- **Safari**: Latest version
- **Edge**: Latest version

### Mobile Testing  
- **iOS Safari**: iPhone 12/14/15
- **Chrome Mobile**: Android (Google Pixel 6/7)
- **Samsung Internet**: Galaxy S21/S23

### Viewport Sizes to Test
- **Mobile**: 375px (iPhone SE), 390px (iPhone 14), 414px (iPhone 13+)
- **Tablet**: 768px (iPad), 820px (iPad Pro), 640px (threshold)
- **Desktop**: 1024px (threshold), 1440px (standard), 1920px (wide)

---

## Visual Testing Checklist

### Typography Hierarchy

#### Headings
- [ ] H1 displays at 40px on desktop, scales down on mobile
- [ ] H2 displays at 32px on desktop, scales down on mobile  
- [ ] H3 displays at 24px on desktop, scales down on mobile
- [ ] H4 displays at 20px on desktop (no scaling needed)
- [ ] H5 displays at 18px
- [ ] H6 displays at 16px
- [ ] All headings have correct font weight (bold=700, semibold=600)
- [ ] Letter spacing is applied correctly (tight on H1-H3)
- [ ] Line heights prevent text overlap

#### Body Text
- [ ] Body-lg (18px) is noticeably larger than body-md
- [ ] Body-md (16px) is default readable size
- [ ] Body-sm (14px) is clearly smaller but still readable
- [ ] All body text has proper line height (1.5-1.75rem)
- [ ] Text on mobile is still readable at minimum sizes

#### Captions & Labels
- [ ] Captions (12px) with 500 weight are visible but secondary
- [ ] Labels (14px) stand out appropriately for form fields
- [ ] Letter spacing on captions doesn't make them hard to read
- [ ] Metadata text feels appropriately de-emphasized

#### Numeric/Stat Text
- [ ] Stat-lg (32px) commands attention on hero section
- [ ] Stat-md (24px) stands out in card metrics
- [ ] Stat-sm (18px) is appropriate for badges
- [ ] All stat text has font-weight: 700 applied

### Responsive Behavior

#### Heading Scales (text-h*-responsive)
- [ ] H1 responsive: 24px (mobile) → 32px (tablet) → 40px (desktop)
- [ ] H2 responsive: 18px (mobile) → 24px (tablet) → 32px (desktop)
- [ ] H3 responsive: 14px (mobile) → 18px (tablet) → 24px (desktop)
- [ ] H4 responsive: 12px (mobile) → 16px (tablet) → 20px (desktop)
- [ ] No jarring size jumps between breakpoints
- [ ] Transitions are smooth visually

#### Mobile-First Design
- [ ] All text is readable at 375px width (minimum phone)
- [ ] Text doesn't overflow containers on small screens
- [ ] Margins/padding adjust appropriately for mobile
- [ ] Touch targets are at least 44px for interactive elements

#### Tablet Experience
- [ ] Typography scales up from mobile to tablet smoothly
- [ ] Font sizes don't feel too large or too small
- [ ] Line lengths are appropriate (not too long)

#### Desktop Experience
- [ ] Full typography scale is applied
- [ ] Line lengths are optimal for reading (40-70 characters)
- [ ] White space around text feels balanced
- [ ] No excessive line wrapping

### Text Wrapping & Truncation

#### Text Balance
- [ ] Multi-line headings wrap naturally (not at odd spots)
- [ ] Words don't split awkwardly across lines
- [ ] No hyphenation needed
- [ ] Applies to: hero headings, section titles

#### Line Clamping (truncate-lines-2)
- [ ] Text truncates after exactly 2 lines
- [ ] Ellipsis (...) appears at the end
- [ ] Still readable without full text
- [ ] Applied to: long questions, market titles

#### Line Clamping (truncate-lines-3)
- [ ] Text truncates after exactly 3 lines
- [ ] Ellipsis (...) appears at the end
- [ ] More content visible than 2-line version
- [ ] Applied to: longer descriptions

#### Single Line Truncation
- [ ] Text cuts off with ellipsis on single line
- [ ] No overflow in narrow containers
- [ ] Applied to: breadcrumbs, card titles

### Color & Contrast

#### Light Mode (if applicable)
- [ ] H1-H6 contrast ratio ≥ 7:1 (AAA for large text)
- [ ] Body text contrast ratio ≥ 4.5:1 (AA for normal text)
- [ ] Caption text contrast ratio ≥ 4.5:1 (AA)
- [ ] Stat text is clearly visible

#### Dark Mode
- [ ] H1-H6 white text on dark background ≥ 7:1 contrast
- [ ] Body text white/light on dark ≥ 4.5:1 contrast
- [ ] Captions with muted-foreground at ≥ 4.5:1 contrast
- [ ] All text meets WCAG AA minimum

#### Color Combinations
- [ ] `.text-foreground` is primary, has highest contrast
- [ ] `.text-muted-foreground` is secondary, has min contrast
- [ ] Accent colors for stats/numbers are accessible
- [ ] Error/warning colors pass contrast tests

### Component-Specific Tests

#### Hero Section
- [ ] Main headline (H1 responsive) scales properly
- [ ] Subheadings are visually distinct
- [ ] Description text is readable and not competing  
- [ ] CTA button text is clear
- [ ] Stat badges display numbers prominently
- [ ] No text overlap with background elements

#### Market Cards
- [ ] Title (H4 or H3) fits without truncation or is truncated properly
- [ ] Question text is truncated with ellipsis (truncate-lines-2)
- [ ] Metadata (captions) appears secondary
- [ ] Price/odds (stat-md) stand out
- [ ] All text is readable on smallest card size

#### Event Details Page
- [ ] Page title (H1 responsive) is prominent
- [ ] Section headings (H2) create clear visual hierarchy
- [ ] Outcome labels are readable
- [ ] Numbers display with stat-* classes
- [ ] Long event descriptions don't break layout
- [ ] Sidebar content uses appropriate sizes

#### Tables
- [ ] Table headers use label or caption weight
- [ ] Table body uses body-sm or body-md
- [ ] Column alignment is consistent  
- [ ] Long cell content is truncated appropriately
- [ ] Numbers are right-aligned with stat sizing
- [ ] Alternating row backgrounds don't reduce contrast

#### Forms
- [ ] Form labels (text-label) are clear and distinct
- [ ] Input placeholder text is properly sized
- [ ] Error messages use caption sizing
- [ ] Helper text doesn't compete with primary text
- [ ] Required indicators are visible

#### Navigation/Breadcrumbs
- [ ] Breadcrumb text uses body-sm
- [ ] Separator (/) is appropriately sized
- [ ] Current page indicator is clear  
- [ ] Links are distinguishable from text
- [ ] Hover states are visible

### Accessibility Testing

#### Font Size Minimum
- [ ] No text smaller than 12px (caption/mono-sm)
- [ ] Body text minimum 14px (body-sm)
- [ ] Headings minimum 16px (H6)
- [ ] Touch targets within text are 44px+ (buttons)

#### Line Height
- [ ] Body text line-height ≥ 1.5
- [ ] Headings line-height appropriate for large text
- [ ] No cramped text (< 1.25x line-height)
- [ ] No excessive leading (> 2x line-height)

#### Letter Spacing
- [ ] Caption letter spacing doesn't make text hard to read
- [ ] -0.02em letter spacing on H1 looks intentional, not cramped
- [ ] 0.02em letter spacing on captions is subtle

#### Font Loading
- [ ] Text is readable while fonts load (system font fallback)
- [ ] No layout shift when fonts finish loading (FOUT/FOIT)
- [ ] Font stacks fallback properly (system-ui → sans → serif)

### Performance Testing

#### Font Files
- [ ] No unauthorized custom fonts slowing load time
- [ ] System fonts load immediately
- [ ] Font stack includes appropriate fallbacks

#### CSS File Size
- [ ] Tailwind CSS bundle is not bloated
- [ ] New typography classes don't significantly increase bundle
- [ ] Unused typography classes are purged in production

#### Rendering Performance
- [ ] No layout thrashing when fonts load
- [ ] Text renders smoothly without jank
- [ ] No forced reflows during text updates

---

## Automated Testing Script

```javascript
// Quick browser console test for typography values

// 1. Test viewport sizes
console.log('Current viewport:', window.innerWidth, 'x', window.innerHeight);

// 2. Check computed font sizes on elements
const h1 = document.querySelector('h1');
if (h1) {
  const computed = window.getComputedStyle(h1);
  console.log('H1 font-size:', computed.fontSize);
  console.log('H1 font-weight:', computed.fontWeight);
  console.log('H1 line-height:', computed.lineHeight);
}

// 3. Test contrast (simplified)
function getContrast(element) {
  const color = window.getComputedStyle(element).color;
  const bg = window.getComputedStyle(element).backgroundColor;
  console.log(element, 'color:', color, 'bg:', bg);
}

// 4. Check for arbitrary pixel values
document.querySelectorAll('[class*="text-"]').forEach(el => {
  const classes = el.className;
  if (classes.match(/text-\[\d+\.?\d*px\]/)) {
    console.warn('Arbitrary pixel size found:', classes, el);
  }
});
```

---

## Real Device Testing

### iOS (iPhone)
- [ ] Press-to-scale doesn't enlarge text excessively
- [ ] Text selection is easy
- [ ] Highlighted text is readable
- [ ] Font rendering is smooth
- [ ] No text blurriness

### Android
- [ ] System font size settings don't break layout
- [ ] Text selection highlighting is visible
- [ ] Font rendering quality is acceptable
- [ ] Large text doesn't overflow containers
- [ ] Touch-friendly size for interactive text

---

## Regression Testing Checklist

After each change to typography, verify:

- [ ] All headings still display correctly
- [ ] Responsive classes still scale properly
- [ ] Truncation still works (2-line, 3-line, single)
- [ ] Text balance still prevents awkward wraps
- [ ] No new arbitrary pixel sizes were added
- [ ] Dark mode contrast still passes
- [ ] Mobile views still readable at 375px
- [ ] Desktop views still have optimal line length
- [ ] Color combinations still have adequate contrast

---

## Known Issues & Solutions

### Issue: Text looks blurry on mobile
**Solution**: Ensure -webkit-font-smoothing: antialiased is applied to body

### Issue: Text overflow on narrow screens
**Solution**: Use truncate-lines-2/3 or text-balance utilities

### Issue: Responsive text too small on mobile
**Solution**: Verify text-h*-responsive classes are used (not fixed sizes)

### Issue: Captions hard to read
**Solution**: Ensure 500 font-weight and muted-foreground color are applied

### Issue: Long numbers wrapping
**Solution**: Use white-space: nowrap or apply to stat-* classes

---

## Sign-Off Checklist

Before considering typography implementation complete:

- [ ] All typography classes are used (no arbitrary sizes)
- [ ] All mobile viewports tested (375px, 390px, 414px)
- [ ] All tablet viewports tested (640px, 768px, 820px)
- [ ] All desktop viewports tested (1024px, 1440px, 1920px)
- [ ] Dark mode contrast verified
- [ ] Light mode contrast verified (if applicable)
- [ ] WCAG AA accessibility passed
- [ ] Long text handling tested (questions, outcomes)
- [ ] Responsive scaling verified
- [ ] Performance impact minimal
- [ ] Developer documentation complete
- [ ] Examples provided for all use cases
- [ ] Peer review completed
- [ ] QA sign-off received
