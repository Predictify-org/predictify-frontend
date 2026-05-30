# Figma Design Specification: Named Breakpoints and Modal Behavior
## Issue #75 - Mobile-First StreamPay Dashboard

**Date:** April 29, 2026
**Status:** Design Review Ready - v1
**Related:** StreamPay-Frontend codebase

---

## 1. Breakpoint Table

The following named breakpoints establish a single source of truth for responsive behavior across the StreamPay dashboard. This specification aligns with the existing component library and form Figma to avoid three conflicting breakpoint systems.

### Named Breakpoints

| Breakpoint Name | Min Width | Max Width | Key Layout Change | Implementation Note |
|-----------------|-----------|-----------|-------------------|---------------------|
| `mobile` | 0 | 479px | 1 column stream list | Default mobile view |
| `phablet` | 480px | 767px | 1 column with expanded touch targets | Enhanced mobile |
| `tablet` | 768px | 1023px | 1-2 column hybrid | Primary tablet range |
| `desktop` | 1024px | 1279px | 2 column stream list | Standard desktop |
| `wide` | 1280px | 1439px | 2-3 column with sidebar | Extended desktop |
| `ultrawide` | 1440px+ | — | 3 column max content | Large displays |

### Layout Behavior by Breakpoint

#### Streams List (`.stream-list`)
- **mobile / phablet (0-767px):** Single column stack, full-width cards
- **tablet (768-1023px):** Single column with 2rem side margins
- **desktop / wide (1024-1439px):** Two column grid, `gap: 1rem`
- **ultrawide (1440px+):** Three column max, content centered with max-width: 72rem

#### App Shell (`.page-shell`)
- **mobile (0-479px):** Padding `2rem 1rem 3rem`, stacked hero/meta
- **phablet (480-767px):** Same as mobile with increased padding
- **tablet+ (768px+):** Padding `3rem 2rem 4rem`, side-by-side hero/meta

---

## 2. Modal Full-Bleed Rules

### Settle/Withdraw Modal Behavior

| Breakpoint | Modal Width | Modal Height | Behavior |
|------------|-------------|---------------|----------|
| `mobile` (0-479px) | 100vw - 2rem | `100dvh - 2rem` (dynamic) | Full-bleed, uses full viewport height |
| `phablet` (480-767px) | 100vw - 3rem | `85dvh` max | Near full-bleed with safe areas |
| `tablet+` (768px+) | `max-width: 500px` | `auto` (content-driven) | Centered modal, standard behavior |

### Mobile Modal Specifications

```css
/* Full-bleed modal on mobile (< 480px) */
.modal-full-bleed {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh; /* Dynamic viewport height for mobile */
  max-width: none;
  border-radius: 0;
  padding: 1rem;
}

/* On screens >= 480px, return to standard modal */
@media (min-width: 480px) {
  .modal-full-bleed {
    width: auto;
    max-width: 500px;
    height: auto;
    max-height: 85vh;
    border-radius: 1rem;
  }
}
```

### Modal Animation Rules

- **Entry:** `scaleIn` with 300ms duration, ease-out
- **Exit:** `scaleOut` with 250ms duration, ease-in
- **Backdrop:** `fadeIn`/`fadeOut` with 200ms duration
- **Mobile full-bleed transition:** No scale transform, slide up from bottom

---

## 3. Accessibility Guidelines

### Max Line Length (WCAG 2.1 AA)

| Element | Max Line Length | Breakpoint | Notes |
|---------|-----------------|------------|-------|
| Body paragraphs | 65ch | All | Optimal reading length |
| Stream description | 42ch | All | Reduced for metadata context |
| Page titles | 12ch | `desktop+` | Prevents awkward line breaks |
| Button text | 20ch | All | Truncate with ellipsis if exceeded |

### Line Length Implementation

```css
/* Max line length for paragraph text on 1440px+ screens */
@media (min-width: 1440px) {
  .page-hero__description,
  .section-heading__description {
    max-width: 65ch;
  }
}
```

### Touch Target Requirements (WCAG 2.1)

- Minimum touch target: `44px × 44px` (CSS: `var(--touch-target)`)
- Minimum spacing between touch targets: `8px`
- Focus indicator: `2px solid var(--accent)` with `2px` offset

### Color Contrast Requirements

| Context | Minimum Ratio | Current Value |
|---------|---------------|---------------|
| Body text on background | 4.5:1 | 14.5:1 (pass) |
| Status badges | 4.5:1 | 7:1 (pass) |
| Links on dark background | 4.5:1 | 3.8:1 (needs review) |
| Disabled state | 3:1 | 2.1:1 (needs update) |

---

## 4. Stream Layout & App Shell Specifications

### Stream Row Grid Template

```css
/* Mobile: Single column */
.stream-row {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
}

/* Desktop+: Multi-column */
@media (min-width: 1024px) {
  .stream-row {
    grid-template-columns: minmax(0, 1.6fr) minmax(16rem, 1fr) auto;
    align-items: center;
  }
}
```

### Component Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 0.25rem | Inline spacing |
| `--space-2` | 0.5rem | Tight component gaps |
| `--space-3` | 0.75rem | Standard component gaps |
| `--space-4` | 1rem | Section internal spacing |
| `--space-5` | 1.25rem | Card padding |
| `--space-6` | 1.5rem | Section padding |
| `--space-8` | 2rem | Page margins |
| `--space-10` | 2.5rem | Large section gaps |
| `--space-12` | 3rem | Page-level padding |

---

## 5. Product-Specific Panels (TBD)

The following side panels are marked as `(product) TBD` pending scope finalization:

| Panel | Breakpoint | Status |
|-------|------------|--------|
| Soroban contract details | `desktop+` | TBD |
| On-chain escrow details | `desktop+` | TBD |
| Vesting schedule details | `desktop+` | TBD |

These panels should only appear on `desktop` (1024px+) breakpoints and should be implemented as slide-over panels, not modals.

---

## 6. Design Review Checklist

- [ ] Reviewed with at least one product stakeholder
- [ ] Reviewed with at least one engineering stakeholder
- [ ] WCAG self-check: contrast ratios verified
- [ ] WCAG self-check: keyboard navigation tested
- [ ] Focus states documented for all interactive elements
- [ ] Empty state designs documented
- [ ] Loading state designs documented
- [ ] Error state designs documented
- [ ] Success state designs documented

### Stream Lifecycle States

Reference: StreamPay's stream lifecycle (draft → active → paused → ended)

| State | Badge Color | Border Color | Background |
|-------|-------------|--------------|------------|
| Draft | `#60a5fa` | `#1e293b` | `#dbeafe` |
| Active | `#22c55e` | `#0f2d1e` | `#d3f9df` |
| Paused | `#fbbf24` | `#31230f` | `#fef3c7` |
| Ended | `#f87171` | `#2a1617` | `#fee2e2` |

---

## 7. Handoff Artifacts

### Named Export Assets

1. **Breakpoint Table** - Figma cover file with named breakpoints
2. **Modal Behavior Spec** - Full-bleed rules for mobile modals
3. **Line Length Guidelines** - 65ch max for paragraphs
4. **Touch Target Spec** - 44px minimum
5. **Color Contrast Matrix** - All contrast ratios documented

### Redlines & Component Specs

- Stream row grid template specifications
- Modal animation timing (300ms entry, 250ms exit)
- Page shell max-width: 72rem
- Status badge specifications

---

## 8. Implementation Notes

> **Note:** This is a design specification document. Implementation in the Next.js `StreamPay-Frontend` codebase should be tracked as a separate frontend work item.

### Next Steps for Engineering

1. Create implementation issue referencing this design spec
2. Align CSS custom properties with Figma token names
3. Implement modal full-bleed behavior for mobile (< 480px)
4. Add line-length constraints for 1440px+ displays
5. Verify touch targets meet 44px minimum

---

## 9. References

- **Figma Cover:** [Link to be added after design review]
- **Component Library:** Align with existing form Figma
- **StreamPay Stream Lifecycle:** See STATE_MACHINE.md
- **Existing Breakpoints:** globals.css (current: 48rem single breakpoint)

---

*Single source of truth for StreamPay dashboard responsive behavior and modal rules.*