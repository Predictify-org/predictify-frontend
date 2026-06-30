Design brief — Streams list: search, filters, sort (Figma v1)

Overview
- Purpose: Design a review-ready Figma v1 for ops/B2B workflows to search and filter large stream lists by recipient label, status, and optionally asset, plus sorting (next payout, created date).
- Scope: UI/UX only. No frontend implementation in this repo. Mark any Soroban/on-chain work as deferred (v2).
- Timebox: 96 hours to review-ready Figma + export for 1 stakeholder.

Requirements
- Search: single-scope (recipient label) combobox/listbox per accessibility patterns.
- Filters: status chips (draft, active, paused, ended), asset chips (optional). Mobile: filter sheet when chips overflow; annotate min touch target 44px.
- Sort: dropdown with options such as `Next payout`, `Date created`, `Amount`.
- Empty states: distinct "no results for query" vs "no streams at all" screens with affordances.
- Accessibility: document combobox + listbox interaction notes, keyboard focus, and contrast checks (WCAG AA minimum). Note any phase-2 items.

Deliverables
- Figma file (v1) with pages: Canvas, Components, Desktop screens, Mobile screens, Empty/Error/Loading states, Handoff exports.
- Figma annotations: component specs, min touch targets, spacing, tokens, keyboard/focus states, and ARIA notes for combobox/listbox.
- One-page usability script and findings (3 internal participants) — add results to `USABILITY_SCRIPT.md`.
- Handoff package: PDF export, named asset exports, redlines, and component tokens.

Benchmarks
- Pick 1–2 fintech "many accounts" patterns (e.g., payroll/treasury UI) and add a Figma ref page with notes.

Handoff checklist (what to include)
- Named exports and component specs for: Search combobox, Status chip, Asset chip, Sort dropdown, Mobile filter sheet, Empty states.
- Keyboard + focus states and ARIA notes.
- Contrast ratios and any noncompliant items flagged as Phase 2.

Design review
- Run a design crit with at least one product and one engineer stakeholder. Add critique notes in a `DesignCrit` frame in Figma or a short doc.

WCAG self-check
- Confirm color contrast, keyboard navigation, focus indicators, and touch target sizes. Document gaps with rationale.

Usability testing (internal quick-test)
- Script in `USABILITY_SCRIPT.md`. Test 3 staff on task: "Find a paused stream for recipient X and filter by asset Y." Capture time, success, and qualitative notes.

Files added in repo
- `design/streams-search-filter/README.md` (this file)
- `design/streams-search-filter/USABILITY_SCRIPT.md`

Commit message suggestion
- `design(figma): search, sort, and filters for large stream lists and distinct no-results`

Notes
- Mark Soroban/on-chain id filtering as deferred (v2) in Figma.
- Coordinate brand/legal early if required for content/copy.
