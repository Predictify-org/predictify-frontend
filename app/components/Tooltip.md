# Tooltip Component

A reusable, accessible tooltip component for displaying supplementary information on hover, focus, or long-press interactions.

## Overview

The Tooltip component wraps Radix UI's tooltip primitive and adds hover delay and touch support. It follows the WAI-ARIA tooltip pattern and meets WCAG 2.1 AA accessibility standards.

## Features

- **Hover Delay**: Configurable delay before showing tooltip (default: 300ms)
- **Long-Press Support**: Touch devices show tooltip after 600ms long-press
- **Keyboard Navigation**: Full keyboard support with focus/blur events
- **Accessibility**: WCAG 2.1 AA compliant with proper ARIA attributes
- **Dark Mode**: Automatic support via design tokens
- **Smart Positioning**: Automatic viewport collision detection and flipping

## Usage

### Basic Example

```tsx
import { Tooltip } from "@/app/components/Tooltip";

function Example() {
  return (
    <Tooltip content="This explains the feature">
      <button>Hover me</button>
    </Tooltip>
  );
}
```

### With Custom Delay

```tsx
<Tooltip content="Help text" delay={500}>
  <button>Slower tooltip</button>
</Tooltip>
```

### With Custom Placement

```tsx
<Tooltip content="Appears below" placement="bottom">
  <span>Hover me</span>
</Tooltip>
```

### With Rich Content

```tsx
<Tooltip
  content={
    <div>
      <strong>Title</strong>
      <p>Description text</p>
    </div>
  }
>
  <button>Rich tooltip</button>
</Tooltip>
```

### Disabled State

```tsx
<Tooltip content="Won't show" disabled={isDisabled}>
  <button>Conditionally disabled</button>
</Tooltip>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `React.ReactNode` | *required* | Tooltip content (string or React elements) |
| `children` | `React.ReactElement` | *required* | Single trigger element |
| `delay` | `number` | `300` | Hover delay in milliseconds |
| `placement` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Preferred tooltip position |
| `disabled` | `boolean` | `false` | Prevent tooltip from showing |

## Accessibility

### WCAG 2.1 AA Compliance

- **Keyboard Navigation**: Trigger is focusable; tooltip shows on focus and hides on blur
- **Escape Key**: Dismisses open tooltip
- **ARIA Pattern**: Implements WAI-ARIA tooltip pattern
  - `role="tooltip"` on tooltip container
  - `aria-describedby` linking trigger to tooltip
  - Proper show/hide semantics for assistive technology
- **Focus Management**: Focus never trapped; clean dismissal
- **Color Contrast**: 4.5:1 minimum in both light and dark modes
- **Touch Support**: Long-press (600ms) for mobile users

### Keyboard Interactions

| Key | Action |
|-----|--------|
| `Tab` | Focus trigger (shows tooltip) |
| `Shift+Tab` | Focus previous element (dismisses tooltip) |
| `Escape` | Dismiss tooltip |

### Screen Reader Behavior

- Tooltip content is announced when trigger receives focus
- Tooltip is hidden from assistive technology when not visible
- Trigger element maintains proper focus order

## Design Tokens

The tooltip uses the following design tokens from `app/globals.css`:

- `bg-popover` — Background color
- `text-popover-foreground` — Text color
- `border` — Border color
- `shadow-md` — Shadow depth
- `rounded-md` — Border radius
- `z-50` — Z-index stacking

These tokens automatically adapt to light/dark mode via CSS variables.

### Light Mode
- Background: `hsl(0 0% 100%)` (white)
- Foreground: `hsl(0 0% 3.9%)` (near-black)
- Contrast ratio: 20.83:1 ✅ (exceeds WCAG AA)

### Dark Mode
- Background: `hsl(0 0% 3.9%)` (near-black)
- Foreground: `hsl(0 0% 98%)` (near-white)
- Contrast ratio: 20.83:1 ✅ (exceeds WCAG AA)

## Behavior Details

### Hover Delay

The tooltip appears after the user hovers continuously for the specified delay. If the pointer leaves before the delay completes, the tooltip never appears. This prevents accidental tooltip triggers during quick pointer movements.

**Implementation**: Uses `setTimeout` to track hover duration. Timer is cleared on pointer leave.

### Long-Press (Touch Devices)

On touch-enabled devices, users can trigger tooltips via long-press (600ms). This provides an alternative to hover for mobile users.

**Implementation**: Uses `pointerdown` with `pointerType === "touch"` detection. Timer is cleared on `pointerup` or `pointerleave`.

### Positioning

The tooltip uses Radix UI's collision-aware positioning:

1. Attempts to place tooltip in the specified `placement` direction
2. If insufficient space, flips to opposite side
3. Adjusts alignment to keep tooltip within viewport
4. Maintains 4px offset (`sideOffset`) from trigger

### Cleanup

All timers and event listeners are automatically cleaned up when:
- Component unmounts
- Tooltip is dismissed
- User navigates away

This prevents memory leaks and orphaned timers.

## Security Considerations

### User-Generated Content

The `content` prop accepts `React.ReactNode`, which can include arbitrary HTML. **If you need to display user-generated HTML content, you must sanitize it before passing to this component.**

```tsx
// ❌ UNSAFE: Direct user input
<Tooltip content={userInput}>...</Tooltip>

// ✅ SAFE: Sanitized content
<Tooltip content={sanitize(userInput)}>...</Tooltip>

// ✅ SAFE: Plain text only
<Tooltip content={userInput.toString()}>...</Tooltip>
```

This component does **not** perform sanitization internally, following the existing pattern in peer components.

## Testing

The component includes comprehensive test coverage:

- Hover delay behavior
- Long-press on touch devices
- Keyboard focus/blur
- Escape key dismissal
- ARIA attributes
- Disabled state
- Placement options
- Timer cleanup
- Dark mode token usage

Run tests:

```bash
npm test -- app/components/__tests__/Tooltip.test.tsx
```

## Examples in Codebase

### MarketCard Integration

The tooltip is integrated into `app/(marketing)/_components/markets-widget.tsx` to provide contextual information:

```tsx
// Odds explanation
<Tooltip content="Current probability that this outcome will occur, based on market trading activity">
  <div className="text-sm font-medium text-green-400 tabular-nums cursor-help">
    Yes: {market.yesOdds}%
  </div>
</Tooltip>

// Pool liquidity
<Tooltip content="Total liquidity in this market from all participants. Higher pools typically mean more accurate odds.">
  <span className="tabular-nums cursor-help">
    Pool: {market.poolAmount.toLocaleString()} USDC
  </span>
</Tooltip>

// Time remaining
<Tooltip content="Time remaining until this market closes and no new predictions can be placed">
  <span className="cursor-help">Ends in {market.endsIn}</span>
</Tooltip>
```

## Reduced Motion Support

The tooltip respects the `prefers-reduced-motion` media query. Animations are disabled when the user has requested reduced motion in their system settings.

The CSS classes include:

```css
animate-in fade-in-0 zoom-in-95
data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
```

These animations are automatically disabled by the global reduced motion styles in `app/globals.css`.

## Browser Support

The component uses modern browser APIs:

- **Pointer Events API**: For unified mouse/touch/pen handling
- **CSS Custom Properties**: For design tokens
- **ES2020**: For optional chaining and nullish coalescing

Supported browsers:
- Chrome 85+
- Firefox 79+
- Safari 13.1+
- Edge 85+

## Related Components

- `components/ui/tooltip.tsx` — Base Radix UI wrapper (no hover delay or long-press)
- `components/HoverTooltip.tsx` — Legacy custom tooltip (consider migrating to this component)

## Migration Guide

If you're using `components/HoverTooltip.tsx`, migration is straightforward:

```tsx
// Before (HoverTooltip)
import { HoverTooltip } from "@/components/HoverTooltip";

<HoverTooltip content="Help text" hoverDelay={300}>
  <button>Hover</button>
</HoverTooltip>

// After (Tooltip)
import { Tooltip } from "@/app/components/Tooltip";

<Tooltip content="Help text" delay={300}>
  <button>Hover</button>
</Tooltip>
```

Key differences:
- `hoverDelay` → `delay`
- `pressDelay` prop removed (fixed at 600ms)
- Better positioning with Radix UI's collision detection
- Consistent design tokens with the rest of the UI

## Contributing

When adding new tooltip usage:

1. **Use for supplementary information only** — Don't put critical information in tooltips
2. **Keep content concise** — Aim for 1-2 sentences maximum
3. **Add `cursor-help` class** — Visual affordance that tooltip is available
4. **Ensure trigger is focusable** — Keyboard users must be able to access tooltip
5. **Test with keyboard only** — Verify tooltip works without a mouse
6. **Test in dark mode** — Ensure contrast is maintained

## References

- [WAI-ARIA Tooltip Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)
- [WCAG 2.1 Level AA](https://www.w3.org/WAI/WCAG21/quickref/?levels=aa)
- [Radix UI Tooltip Documentation](https://www.radix-ui.com/primitives/docs/components/tooltip)
