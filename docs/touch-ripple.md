# Touch Ripple Feedback

Prediction cards use the shared `touch-ripple` utility from `app/styles/touch.css`
for tactile press feedback on mobile and pointer devices.

## Usage

Apply `touch-ripple` together with `touch-target`, `relative`, and
`overflow-hidden` on the interactive card surface:

```tsx
<button className="touch-target touch-ripple relative overflow-hidden">
  ...
</button>
```

The utility renders the feedback through a `::after` pseudo-element, so no extra
DOM nodes or ARIA-hidden decorative elements are needed.

## Accessibility

- The ripple animates only `opacity` and `transform`, avoiding layout shift.
- `prefers-reduced-motion: reduce` disables the transform transition.
- The card keeps the existing visible focus ring and 44 px minimum touch target.
