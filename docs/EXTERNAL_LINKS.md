# External Links

Use `components/ExternalLink` for links that leave Predictify and open a new
browser tab.

The component standardizes three behaviors:

- `target="_blank"` for new-tab navigation.
- `rel="noopener noreferrer"` to prevent opener access.
- A visible external-link affordance plus screen-reader text announcing that the
  link opens in a new tab.

For icon-only social links, pass `showIcon={false}` and provide an `aria-label`
that names the destination.
