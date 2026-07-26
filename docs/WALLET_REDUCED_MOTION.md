# Wallet Modal Reduced Motion Fallback — #633

This document details the reduced-motion (a11y) fallback implementation for the **WalletModal** component.

> **Context:** GrantFox FWC26 campaign (Stellar Wave). 
> **Acceptance Criteria:** Static state under `prefers-reduced-motion: reduce` for WalletModal animations, focused tests, and documentation.

---

## Technical Overview

### 1. Radix Dialog Animations Bypass (`components/ui/dialog.tsx`)

To disable dialog open/close animations under reduced motion settings cleanly, the shared design-system primitive components `DialogOverlay`, `DialogContent`, and `DialogContentWithFocusReturn` were extended to support a new optional `reducedMotion` boolean prop.

When `reducedMotion` is `true`:
- The Radix overlay strips out Tailwind-animate enter/exit utility classes (`animate-in`, `animate-out`, `fade-in-0`, `fade-out-0`).
- The Radix content drops all transition classes (e.g. `duration-200`, `zoom-in-95`, `slide-in-from-...`) and applies `duration-0 transition-none` to override any standard CSS transitions.
- The dialog renders immediately as a static element, bypassing any transitionary states.

### 2. Campaign Component (`src/pages/WalletModal.tsx`)

The main campaign component implements the `WalletModal` (adapted from `ConnectWalletModal` under `components/connect-wallet-modal.tsx`) and hooks into the accessibility features:
- It imports `useReducedMotion` from `@/hooks/useReducedMotion`.
- It accepts an optional `reducedMotion` override prop.
- It determines the active preference: `const reducedMotion = reducedMotionProp ?? prefersReducedMotion`.
- It forwards the state to `DialogContent`: `<DialogContent reducedMotion={reducedMotion}>`.
- It replaces list items hover transitions with `transition-none` when reduced motion is enabled to avoid tiny micro-transitions.

### 3. Re-export and Backwards Compatibility (`components/connect-wallet-modal.tsx`)

To avoid duplicating code, the existing `components/connect-wallet-modal.tsx` was refactored to simply import and re-export `WalletModal` as `ConnectWalletModal`. This maintains complete backward-compatibility with all existing imports across the application (e.g., inside the Desktop/Mobile header and navigation) while utilizing the single updated codebase.

---

## Verification & Tests

Focused test coverage has been added to test the reduced motion states specifically:

- **`src/pages/__tests__/WalletModal.test.tsx`**:
  - Verifies that when motion is allowed (default), standard Dialog enter/exit animation classes and `duration-200` are applied.
  - Verifies that when the `reducedMotion` prop is set to `true`, animation classes are stripped and replaced with static `duration-0 transition-none` styling.
  - Verifies that when the system preference `prefers-reduced-motion: reduce` is detected via the hook, the static fallback is automatically applied.

---

## Accessibility Compliance (WCAG 2.1 AA)

- **WCAG 2.1 SC 2.3.3 (Animation from Interactions)**: All entrance and exit transitions of the modal overlay and content are disabled when the user has configured reduced motion, ensuring standard compliance for vestibular sensitivity.
