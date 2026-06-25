# Issue #75: Figma Named Breakpoints and Modal Behavior
## Design Specification Summary

**Status:** ✅ Design Review Ready - v1  
**Created:** April 29, 2026  
**Document:** [docs/FIGMA-BREAKPOINTS-MODAL-SPEC.md](docs/FIGMA-BREAKPOINTS-MODAL-SPEC.md)

---

## Overview

This design specification establishes a **single source of truth** for responsive behavior across the StreamPay dashboard. It addresses Issue #75 requirements for:

1. Named breakpoint table with layout rules
2. Modal full-bleed behavior for mobile
3. Accessibility guidelines (max line length, touch targets)
4. Stream layout and app shell specifications

---

## Key Deliverables

### 1. Breakpoint Table

| Breakpoint | Width Range | Layout Behavior |
|------------|-------------|-----------------|
| `mobile` | 0-479px | 1 column, full-width cards |
| `phablet` | 480-767px | 1 column, expanded touch targets |
| `tablet` | 768-1023px | 1-2 column hybrid |
| `desktop` | 1024-1279px | 2 column stream list |
| `wide` | 1280-1439px | 2-3 column with sidebar |
| `ultrawide` | 1440px+ | 3 column max content |

### 2. Modal Full-Bleed Rules

**Mobile (< 480px):**
- Settle/Withdraw modals use full viewport height (`100dvh`)
- Full-bleed behavior with safe areas

**Tablet+ (768px+):**
- Standard centered modal (`max-width: 500px`)
- Content-driven height

### 3. Accessibility (WCAG 2.1 AA)

- **Max line length:** 65ch for paragraphs on 1440px+
- **Touch targets:** Minimum 44px × 44px
- **Focus indicators:** 2px solid accent with 2px offset
- **Color contrast:** All ratios verified

---

## Alignment with Existing Codebase

The specification aligns with:
- ✅ Existing `globals.css` (current: 48rem = 768px breakpoint)
- ✅ Component library patterns
- ✅ Stream lifecycle states (draft → active → paused → ended)
- ✅ Design QA Checklist ([docs/design-qa-checklist.md](docs/design-qa-checklist.md))

---

## Handoff Notes for Engineering

> **This is a design specification only.** Implementation in the Next.js `StreamPay-Frontend` codebase should be tracked as a separate frontend work item.

### Implementation Checklist

- [ ] Create implementation issue referencing this spec
- [ ] Align CSS custom properties with Figma token names
- [ ] Implement modal full-bleed behavior for mobile (< 480px)
- [ ] Add line-length constraints for 1440px+ displays
- [ ] Verify touch targets meet 44px minimum

---

## Product-Specific Panels (TBD)

| Panel | Breakpoint | Status |
|-------|------------|--------|
| Soroban contract details | `desktop+` | TBD |
| On-chain escrow details | `desktop+` | TBD |
| Vesting schedule details | `desktop+` | TBD |

---

## Design Review Status

- [ ] Product stakeholder review: **Pending**
- [ ] Engineering stakeholder review: **Pending**
- [ ] WCAG contrast check: **Documented**
- [ ] Keyboard navigation test: **Documented**

---

## References

- **Full Specification:** [docs/FIGMA-BREAKPOINTS-MODAL-SPEC.md](docs/FIGMA-BREAKPOINTS-MODAL-SPEC.md)
- **Design QA Checklist:** [docs/design-qa-checklist.md](docs/design-qa-checklist.md)
- **State Machine:** [docs/STATE_MACHINE.md](docs/STATE_MACHINE.md)
- **Existing CSS:** [app/globals.css](app/globals.css)

---

*This document serves as the Figma handoff artifact for Issue #75.*