# Compare Markets Modal

Issue: `#368`

## Visible Change

The event detail header now includes a `Compare` action that opens an accessible
side-by-side market comparison dialog. The modal compares two markets across:

- liquidity
- participant count
- top outcome and odds
- deadline
- resolution criteria

## Accessibility

- Uses the shared Radix dialog wrapper for focus trapping and Escape handling.
- Provides a dialog title and description for screen readers.
- Uses semantic `article`, `dl`, `dt`, and `dd` markup for comparison data.
- Maintains responsive stacked layout on narrow viewports and two columns on
  wider screens.

## Validation

Focused tests cover the default trigger, custom trigger, populated comparison
state, and one-market empty state.
