Figma v1 skeleton — Streams search, filters, sort

Workfile pages
- Cover: brief, scope (search scope = recipient label), stakeholders, version (v1), timebox (96h).
- Components: tokens, colors, typography, spacing, icons, components (Search combobox, Status chip, Asset chip, Sort dropdown, Mobile filter sheet), and states (default, hover, active, focus, disabled).
- Desktop — Streams List: default results, filtered results, sorted results, loading, error.
- Mobile — Streams List: condensed list, filter sheet overlay, empty states.
- Empty States: No streams at all, No results for query, Loading placeholder variations.
- Accessibility: combobox & listbox pattern notes, keyboard flow, ARIA attributes, focus rings, and contrast checks.
- Benchmarks: link to `BENCHMARKS.md` and screenshots.
- Usability Results: import results from `USABILITY_SCRIPT.md`.
- Handoff: export frames and asset naming spec.

Key frames to create
- Desktop list (wide): show search bar at top-left, status chips inline, asset chips to the right, sort dropdown top-right, large list with row density variations (comfortable / compact). Include a redline for touch target spacing and keyboard nav.
- Desktop empty (no streams): primary CTA (Create stream) and secondary (Upload CSV), guidance copy.
- Desktop empty (no results): suggest clearing filters, show search term, include CTA (Clear search) and subtle help copy.
- Mobile list: top search, status chips horizontally scrollable, a floating filter button that opens the filter sheet. Provide a full-screen filter sheet with multi-select chips and Apply/Clear actions.

Accessibility & Interaction notes
- Search: implement as combobox with listbox per WAI-ARIA Authoring Practices. Keyboard: `Tab` into input, `ArrowDown` opens list, `Enter` selects, `Esc` closes. Announce "n results" on selection.
- Status chips: toggle buttons with `aria-pressed` attribute; multi-select allowed.
- Sort dropdown: native select replacement with visible focus and aria-expanded. Options: `Next payout`, `Date created`, `Amount`.
- Touch targets: annotate minimum 44x44px for chips and controls.
- Contrast: enforce WCAG AA for normal text; note any brand tokens that fail and mark as Phase 2.

Handoff & Exports
- Provide component tokens and named exports: `Search/Combobox`, `Chip/Status`, `Chip/Asset`, `Dropdown/Sort`, `Sheet/Filter (Mobile)`, `List/Row`.
- Redlines: spacing, typography scale, grid, and row heights. Provide 1x and 2x PNG exports for screenshots.
- PDF: full artboard export for stakeholder review.

Notes
- Mark Soroban/on-chain id filters as v2 (deferred) in the Cover page.
- Keep search scope single (recipient label) for v1 copy clarity.
