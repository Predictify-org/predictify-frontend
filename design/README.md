# Design assets

This directory holds the design source-of-truth for StreamPay — tokens,
component specs, Figma handoff notes, and exploration explorations.
The contents are referenced by engineering implementations and should
match what is shipped in `app/components/`.

## Folder index

| Folder                          | Purpose |
|---------------------------------|---------|
| `branding/`                     | Logo, colors, typography. |
| `chart-sparkline-kit/`          | Sparkline and chart visuals used in dashboards. |
| `component-library-v1/`         | Baseline component specs (buttons, inputs, modals). |
| `error-pages-figma/`            | Empty / error state Figma sources. |
| `export-pack/`                  | Static exports of marketing/PR assets. |
| `handoff/`                      | Per-feature engineering handoff notes. |
| `hero-cta-variants/`            | A/B variants for the landing hero CTA. |
| `settings-skeleton/`            | Skeleton loading states for the settings view. |
| `streams-search-filter/`        | Spec for the streams list search and filter UX. |
| `success-feedback-patterns/`    | Toast / confirmation patterns. |
| `usability-testing/`            | Raw notes from moderated sessions. |

## Conventions

- File names are kebab-case to match folder convention.
- Each handoff entry lives in `handoff/<feature-name>/README.md` and
  links to the Figma frame plus the implementing PR.
- Exported PNGs should be 2x resolution; SVGs preferred where possible.

For top-level design QA checklists see
[../docs/design-qa-checklist.md](../docs/design-qa-checklist.md).
