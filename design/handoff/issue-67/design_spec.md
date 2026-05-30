# Design Specifications: Notification System

## Component Redlines

### 1. Toggle Switch
| Property | Value |
| :--- | :--- |
| **Dimensions** | 44px x 24px (Outer) |
| **Active Color** | `#22c55e` (var(--accent)) |
| **Inactive Color** | `#27272a` (var(--border)) |
| **Thumb Size** | 20px x 20px (White) |
| **Animation** | 160ms ease-in-out |
| **Touch Target** | 44px minimum height |

### 2. Layout & Spacing
- **Group Margin**: 2.5rem between categories.
- **Item Padding**: 1.25rem vertical padding per setting row.
- **Card Background**: `linear-gradient(180deg, var(--panel-elevated), var(--panel))`.
- **Card Border**: 1px solid `var(--border)`.

### 2. Typography
- **Headings**: system-ui, bold, uppercase, 0.08em tracking.
- **Labels**: system-ui, medium, 1rem.
- **Descriptions**: system-ui, normal, 0.875rem, color: `#a1a1aa`.

## Accessibility (WCAG 2.1 AA)
- **Toggles**: Must use `<button role="switch">` or `<input type="checkbox">` with visible focus rings.
- **Contrast**: Minimum 4.5:1 for all text elements against `#0a0a0f`.
- **Labels**: Mandatory `aria-label` or `htmlFor` association for every switch.

## System States

### Loading
- **Skeleton Pulse**: Apply `.skeleton` animation to labels and toggles.
- **Duration**: 1.6s ease-in-out infinite.

### Success
- **Toast**: 3-second toast notification at bottom-center.
- **Copy**: "Notification preferences saved successfully."
- **Color**: `var(--success)` (#22c55e).

### Error
- **Alert**: Inline alert panel above the action button.
- **Copy**: "Failed to save preferences. Please try again."
- **Color**: `var(--error)` (#ef4444).

## Email Spec (Mobile)
- **Width**: 375px (Mobile First).
- **Primary Font**: Inter, sans-serif.
- **Alert Icon**: Feather `alert-triangle` (Red #ef4444).
- **CTA**: Center-aligned, 100% width button on mobile.
