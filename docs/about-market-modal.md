# About Market Modal

The market detail page includes an `About this market` action beside the market category and share action. It opens `AboutMarketModal`, which summarizes the market premise, category, deadline, and resolution criteria without moving users away from the detail page.

## Accessibility

- The trigger is a keyboard-focusable button with a market-specific accessible label.
- The dialog uses Radix Dialog for focus trapping, Escape dismissal, and focus return.
- A screen-reader-only summary connects the dialog content to the market title, category, deadline, and resolution criteria.
- Icons are decorative and marked with `aria-hidden`.

## Verification

Run the focused component test:

```bash
node node_modules/jest/bin/jest.js app/components/__tests__/AboutMarketModal.test.tsx --runInBand
```
