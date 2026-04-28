# Component Library v1 Spec

## Intent

Establish a shared language between design (Figma) and engineering (TSX) for the core building blocks of StreamPay. This spec focuses on visual variants, size tokens, and accessibility.

## Figma to Code Mapping

| Figma Component | Code Primitive | Variants | Notes |
| :--- | :--- | :--- | :--- |
| `Button` | `Button` | `primary`, `secondary`, `danger` | Includes `loading` and `disabled` states. |
| `StatusBadge` | `StatusBadge` | `draft`, `active`, `paused`, `ended`, `pending` | `pending` is for Soroban/chain transactions. |
| `StreamRow` | `StreamRow` | `default`, `compact` | Primary list item for stream dashboards. |
| `Card` | `Card` | `elevated`, `outlined` | Base container for grouping content. |
| `Modal` | `Modal` | `centered`, `bottom-sheet` (mobile) | Standard dialog for high-stakes actions. |

## Component Details

### Button

- **Sizes**:
  - `Large` (Touch-friendly): 48px height.
  - `Default`: 36px height.
- **Tokens**:
  - `Radius`: 8px.
  - `Font`: 16px Bold.
- **States**:
  - `Rest`: Standard variant color.
  - `Hover`: 10% overlay or darker shade.
  - `Active/Pressed`: 20% overlay.
  - `Focus`: 2px outside ring (Accent color).
  - `Disabled`: Reduced opacity (40%) and `not-allowed` cursor.

### StatusBadge

- **Lifecycle Mappings**:
  - `Draft`: Blue (`#dbeafe` fill, `#1e293b` text).
  - `Active`: Green (`#d3f9df` fill, `#0f2d1e` text).
  - `Paused`: Amber (`#fef3c7` fill, `#31230f` text).
  - `Ended`: Red (`#fee2e2` fill, `#2a1617` text).
  - `Pending` (Soroban): Grey/Pulsing (`#f1f5f9` fill, `#475569` text).
- **Stellar Network Sub-badge**:
  - Small 12px dot or icon slot for "Mainnet" vs "Testnet" indicator if requested.

### StreamRow

- **Structure**:
  - `Slot: Icon/Avatar` (Left)
  - `Slot: Title/Description` (Center)
  - `Slot: Rate/Amount` (Right-middle)
  - `Slot: StatusBadge` (Right-end)
  - `Slot: Actions` (Optional right-end or chevron)
- **Min Height**: 64px.
- **Padding**: 16px horizontal, 12px vertical.

### Card

- **Border Radius**: 12px.
- **Padding Tokens**: `Small` (12px), `Default` (20px), `Large` (32px).
- **Border**: 1px solid `#e2e8f0`.

### Modal

- **Widths**: 480px (Small), 640px (Default), 800px (Large).
- **Overlay**: Backdrop blur (4px) with semi-transparent black (`rgba(0,0,0,0.5)`).
- **Interaction**:
  - Click outside to close (optional).
  - `Esc` to close.
  - Trap focus inside.

## Accessibility (WCAG 2.1)

- **Contrast**: All text/background pairs for `StatusBadge` and `Button` must meet 4.5:1 ratio.
- **Touch Targets**: Minimum interactive area 44px x 44px.
- **Focus Rings**:
  - Width: 2px.
  - Offset: 2px.
  - Color: StreamPay Accent (`#22c55e`).
- **Screen Readers**:
  - `StreamRow` should be a semantic `li` or have a clear label.
  - `StatusBadge` should have an `aria-label` explaining the state (e.g., "Stream Status: Active").

## Implementation Notes (TBD)

- Should `Card` handle its own hover state or is that a wrapper concern?
- Does `Modal` need a specific `onClose` animation spec?
- Are `StatusBadge` colors theme-aware (Light/Dark mode)?
