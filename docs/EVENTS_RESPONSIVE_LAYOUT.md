# Events responsive layout

The events results use one semantic HTML table at every viewport size. CSS changes
its visual presentation so content remains readable without duplicating controls or
screen-reader output.

## Breakpoints

| Viewport | Presentation |
| --- | --- |
| Below `768px` | One event card per row |
| `768px`–`1279px` | Two event cards per row |
| `1280px` and above | Full eight-column table |

Below the `xl` breakpoint, the table header remains available to assistive
technology and each card repeats short visible field labels. At `xl` and above,
the standard header row is visible and the table keeps a minimum width so columns
do not collapse.

Colors use the shared `background`, `card`, `foreground`, `muted`, and `border`
tokens, so the layout follows both light and dark themes. Interactive controls
retain their accessible names and keyboard behavior.

## Visible and API changes

- Visible: event results no longer require horizontal scrolling on narrow
  viewports; they become one- or two-column cards.
- API: no component props, event types, routes, or service APIs changed.

## Verification

Run:

```sh
pnpm test -- components/events/__tests__/events-table.a11y.test.tsx
pnpm type-check
pnpm lint
```

For manual review, check `/events` at `320px`, `375px`, `768px`, `1024px`, `1280px`, and
`1440px`, in both light and dark themes, with keyboard-only navigation.