# Typography System

This document outlines the standardized typography hierarchy for Predictify. All headings, body text, captions, and numeric content should use the classes defined below.

## Quick Reference

| Class | Desktop | Mobile | Use Case |
|-------|---------|--------|----------|
| `text-h1` | 40px | - | Page title (use `text-h1-responsive` for mobile) |
| `text-h2` | 32px | - | Section heading (use `text-h2-responsive`) |
| `text-h3` | 24px | - | Subsection (use `text-h3-responsive`) |
| `text-h4` | 20px | - | Card title (use `text-h4-responsive`) |
| `text-h5` | 18px | - | Label/badge text |
| `text-h6` | 16px | - | Small heading |
| `text-body-lg` | 18px | 16px | Large body text |
| `text-body-md` | 16px | 14px | Default body text |
| `text-body-sm` | 14px | 12px | Secondary text |
| `text-label` | 14px | 12px | Form labels, badges |
| `text-caption` | 12px | 10px | Hints, timestamps, metadata |
| `text-stat-lg` | 32px | 24px | Large numbers |
| `text-stat-md` | 24px | 18px | Standard numbers |
| `text-stat-sm` | 18px | 16px | Small numbers |

## Typography Hierarchy

### 1. Headings (H1-H6)

**H1 - Page Title (40px)**
```tsx
<h1 className="text-h1">Predict. Repeat. Earn.</h1>
// Responsive: <h1 className="text-h1-responsive">Predict. Repeat. Earn.</h1>
```
- Font Weight: 700 (bold)
- Letter Spacing: -0.02em (tight)
- Line Height: 3.5rem
- Use for: Main page titles, hero sections

**H2 - Section Heading (32px)**
```tsx
<h2 className="text-h2">How Predictify Works</h2>
// Responsive: <h2 className="text-h2-responsive">How Predictify Works</h2>
```
- Font Weight: 700 (bold)
- Letter Spacing: -0.01em
- Line Height: 2.75rem
- Use for: Major section headers

**H3 - Subsection (24px)**
```tsx
<h3 className="text-h3">Market Title</h3>
// Responsive: <h3 className="text-h3-responsive">Market Title</h3>
```
- Font Weight: 700 (bold)
- Letter Spacing: -0.01em
- Line Height: 2.25rem
- Use for: Card titles, subsection headers

**H4 - Card Title (20px)**
```tsx
<h4 className="text-h4">Bitcoin Price Prediction</h4>
// Responsive: <h4 className="text-h4-responsive">Bitcoin Price Prediction</h4>
```
- Font Weight: 600 (semibold)
- Line Height: 1.875rem
- Use for: Card titles, dialog titles

**H5 & H6 - Labels (18px, 16px)**
```tsx
<h5 className="text-h5">Event Label</h5>
<h6 className="text-h6">Small Heading</h6>
```
- Font Weight: 600 (semibold)
- Use for: Labels, small headings

### 2. Body Text

**Body Large (18px)**
```tsx
<p className="text-body-lg">Large body text for important content.</p>
```
- Use for: Introduction paragraphs, emphasis text
- Line Height: 1.75rem

**Body Medium (16px, default)**
```tsx
<p className="text-body-md">Standard paragraph text.</p>
<p>Standard paragraph text.</p> {/* Default <p> uses text-body-md */}
```
- Use for: Main content, descriptions
- Line Height: 1.5rem

**Body Small (14px)**
```tsx
<p className="text-body-sm text-muted-foreground">Secondary information</p>
```
- Use for: Secondary text, helper text
- Line Height: 1.375rem

### 3. Labels & Captions

**Label (14px, 500 weight)**
```tsx
<label className="text-label font-semibold">Form Label</label>
<span className="text-label">Badge Text</span>
```
- Font Weight: 500 (medium)
- Use for: Form labels, badge text, metadata

**Caption (12px, 500 weight)**
```tsx
<span className="text-caption">Last updated 2 hours ago</span>
<small>This is small text</small> {/* Default <small> uses text-caption */}
```
- Font Weight: 500 (medium)
- Letter Spacing: 0.02em
- Use for: Timestamps, hints, helper text, footnotes

### 4. Numeric/Stats Text

**Stat Large (32px)**
```tsx
<div className="text-stat-lg font-bold">$1,234</div>
```
- Font Weight: 700 (bold)
- Letter Spacing: -0.01em
- Use for: Large numbers in hero section, prominent stats

**Stat Medium (24px)**
```tsx
<div className="text-stat-md font-bold">$1,234</div>
```
- Font Weight: 700 (bold)
- Use for: Dashboard numbers, price displays

**Stat Small (18px)**
```tsx
<div className="text-stat-sm font-bold">100</div>
```
- Font Weight: 700 (bold)
- Use for: Small stat cards

### 5. Monospace (Code)

```tsx
<code className="text-mono-md font-mono">npm install predictify</code>
<code className="text-mono-sm font-mono bg-muted p-1 rounded">const x = 42;</code>
```

## Responsive Typography

Use responsive classes for content that should scale across breakpoints:

```tsx
// Desktop: H1 (40px) → Tablet: 32px → Mobile: 24px
<h1 className="text-h1-responsive">Main Heading</h1>

// Desktop: H2 (32px) → Tablet: 24px → Mobile: 18px
<h2 className="text-h2-responsive">Section Heading</h2>

// Desktop: H3 (24px) → Tablet: 18px → Mobile: 14px
<h3 className="text-h3-responsive">Subsection</h3>
```

### Responsive Breakpoints
- **Mobile**: < 640px (`sm`)
- **Tablet**: 640px - 1024px (`md`)
- **Desktop**: 1024px+ (`lg`)

## Text Wrapping & Truncation

### Preventing Layout Breakage

**Text Balance** (wraps text naturally)
```tsx
<h1 className="text-h1 text-balance">
  Questions that have long titles stay readable
</h1>
```
Best for: Headings that might wrap awkwardly

**Line Clamping - 2 Lines**
```tsx
<p className="text-body-md truncate-lines-2">
  This is a question that might be very long and needs to be truncated after 2 lines with an ellipsis at the end...
</p>
```
Result: Truncates after 2 lines with ellipsis

**Line Clamping - 3 Lines**
```tsx
<p className="text-body-md truncate-lines-3">
  This is a longer question that can wrap to 3 lines before getting truncated with an ellipsis at the end...
</p>
```

**Single Line Truncation**
```tsx
<div className="text-ellipsis-overflow">
  This text will be cut off with an ellipsis if it overflows
</div>
```
Use for: Breadcrumbs, single-line titles

## Component Examples

### Market Cards

```tsx
// Market Card - Question/Title
<Card className="border-white/10 bg-[#201F3780] p-4">
  {/* Title */}
  <h3 className="text-h4 text-white mb-2 truncate-lines-2">
    Will Bitcoin exceed $75K by Q3 2024?
  </h3>
  
  {/* Question Details */}
  <p className="text-body-sm text-white/70 mb-3">
    Prediction closes in 30 days
  </p>
  
  {/* Stats */}
  <div className="flex justify-between">
    <div>
      <p className="text-caption text-white/50">Volume</p>
      <p className="text-stat-md font-bold text-white">$45.2K</p>
    </div>
    <div>
      <p className="text-caption text-white/50">Odds</p>
      <p className="text-stat-md font-bold text-emerald-400">65%</p>
    </div>
  </div>
</Card>
```

### Event Details Page

```tsx
<div className="space-y-6">
  {/* Page Title */}
  <div>
    <h1 className="text-h1-responsive text-white mb-2">
      Will SPY close above $450?
    </h1>
    <p className="text-body-lg text-muted-foreground">
      S&P 500 Index Prediction Market
    </p>
  </div>

  {/* Event Info Section */}
  <Card>
    <CardHeader>
      <h2 className="text-h2">Event Details</h2>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        {/* Each stat */}
        <div>
          <p className="text-label text-muted-foreground mb-1">Total Volume</p>
          <p className="text-stat-lg font-bold text-white">$2.5M</p>
        </div>
        <div>
          <p className="text-label text-muted-foreground mb-1">Participants</p>
          <p className="text-stat-lg font-bold text-white">1,234</p>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Outcomes */}
  <div>
    <h3 className="text-h3 mb-4">Possible Outcomes</h3>
    <div className="space-y-2">
      <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
        <span className="text-body-md">Yes - SPY > $450</span>
        <span className="text-stat-md font-bold text-emerald-400">72%</span>
      </div>
      <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
        <span className="text-body-md">No - SPY ≤ $450</span>
        <span className="text-stat-md font-bold text-red-400">28%</span>
      </div>
    </div>
  </div>
</div>
```

### Tables

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="text-label text-white/70">Event</TableHead>
      <TableHead className="text-label text-white/70 text-right">Amount</TableHead>
      <TableHead className="text-label text-white/70 text-right">Odds</TableHead>
      <TableHead className="text-label text-white/70">Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>
        <span className="text-body-md">Bitcoin > $75K</span>
        <p className="text-caption text-muted-foreground">Closes in 30 days</p>
      </TableCell>
      <TableCell className="text-right">
        <span className="text-stat-md font-bold">$1,245</span>
      </TableCell>
      <TableCell className="text-right">
        <span className="text-body-md text-emerald-400">65%</span>
      </TableCell>
      <TableCell>
        <span className="text-label text-amber-400">Active</span>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Best Practices

### ✅ DO

- Use responsive classes (`text-h1-responsive`, etc.) for mobile-first design
- Use `text-balance` on headings that might wrap awkwardly
- Use `truncate-lines-2` or `truncate-lines-3` for long questions
- Pair headings with semantic HTML (`<h1>`, `<h2>`, etc.)
- Use `text-stat-*` classes for numbers to ensure proper emphasis
- Apply `text-muted-foreground` to secondary text
- Use `text-caption` for metadata and timestamps

### ❌ DON'T

- Use arbitrary pixel sizes like `text-[24.83px]`
- Mix different heading levels without reason
- Use `text-xl` when you should use `text-h4`
- Forget to make typography responsive on mobile
- Leave long questions without truncation-handling
- Use `<div>` for headings instead of semantic `<h1>-<h6>`
- Apply multiple font-size classes (one per element)

## Migration Guide

### Old → New

```tsx
// OLD
<h3 className="text-[24.83px] leading-[40.89px] font-semibold">Title</h3>

// NEW
<h3 className="text-h3">Title</h3>

---

// OLD
<span className="text-[17.38px] leading-[29.21px] font-medium">Label</span>

// NEW
<span className="text-h5">Label</span>

---

// OLD
<p className="text-sm text-white/70">Secondary text</p>

// NEW
<p className="text-body-sm text-muted-foreground">Secondary text</p>

---

// OLD
<div className="text-2xl font-bold">$1,234</div>

// NEW
<div className="text-stat-md font-bold">$1,234</div>

---

// OLD - Breaking layout
<p>This is a very long question that might break the layout or overflow awkwardly</p>

// NEW - Handles long strings
<p className="text-body-md truncate-lines-2">
  This is a very long question that might break the layout or overflow awkwardly
</p>
```

## Testing Checklist

- [ ] H1-H6 headings display correctly on mobile (< 640px)
- [ ] Body text sizes are readable on small screens
- [ ] Long questions don't break layout (use `truncate-lines-2/3`)
- [ ] Numbers are properly emphasized with `text-stat-*` classes
- [ ] Captions and labels are distinguishable
- [ ] Text wrapping works on all breakpoints
- [ ] Dark mode text contrast passes WCAG AA standards
- [ ] Font stacks fallback properly (system-ui → sans-serif)
