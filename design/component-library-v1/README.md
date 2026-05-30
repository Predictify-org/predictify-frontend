# StreamPay Component Library v1

## Scope

UI/UX and product design for foundational StreamPay building blocks: `StreamRow`, `StatusBadge`, `Modal`, `Card`, and `Button`. This aligns Figma naming and variant structures with expected codebase primitives. This is not a request to implement these in the Next.js app.

## Deliverables

- `component-library-v1.pdf` - component variant and spec export.
- `component-library-overview.png` - visual map of all primitives.
- `a11y-focus-ring-spec.png` - focus ring and keyboard navigation layer spec.
- `component-library-spec.md` - Figma variant, token, and a11y documentation.
- `build_component_library.py` - local exporter for the PDF/PNG previews and QA report.
- `quality-report.json` - output and quick contrast self-check.

## Components Included

1. **Button**: Primary and Secondary variants; size tokens for Touch (48px) and Desktop (36px).
2. **StatusBadge**: Stream lifecycle states (Draft, Active, Paused, Ended) + Soroban/Chain "Pending" badge.
3. **StreamRow**: List item for streams including recipient, rate, and status.
4. **Card**: Surface container with standard radius and padding tokens.
5. **Modal**: Dialog container with header, body, and footer action slots.

## Handoff Target

Parent Figma area: `Design System / Primitives / v1`

Suggested frame names:

- `Library / Button / Variants`
- `Library / StatusBadge / Variants`
- `Library / StreamRow / Main`
- `Library / Card / Containers`
- `Library / Modal / Templates`
- `Library / A11y / FocusStates`

## Review Notes

- PM and Eng should review the Figma-to-Code mapping in the spec file.
- Minimum touch target for all interactive elements is 44px.
- Focus rings are mandatory for all interactive states.
- Status badges use semantic colors (Green = Active, Blue = Draft, Amber = Paused, Red = Ended).

## Validation

Run:

```powershell
python design/component-library-v1/build_component_library.py
```

The script writes the PDF, PNG previews, and `quality-report.json`.
