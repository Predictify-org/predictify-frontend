Accessibility and responsive improvements

Summary
- Added a lightweight `Tabs` wrapper around the Settings page to provide keyboard-navigable grouping and ARIA roles.
- Introduced an `aria-live` polite region announcing save confirmations for assistive technologies.
- Ensured `Switch` and `Select` controls are programmatically labelled via `Label` + `htmlFor`.
- Interactive option buttons now use `aria-pressed` where appropriate.

How to test locally

1. Install dependencies:

```bash
pnpm install
```

2. Run tests:

```bash
pnpm test
```

Notes
- The repo uses Radix UI primitives which already provide robust keyboard interactions for Tabs/Select/Switch; this change leverages those primitives and adds glue for screen readers.
- If you want a full a11y audit, run `axe` or `playwright` checks on the page in a headful browser.
