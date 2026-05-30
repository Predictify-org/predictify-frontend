Handoff README — Streams search & filters (v1)

Included mockups (local static SVGs)
- `mockups/desktop_default.svg` — desktop list with search, sort, status chips
- `mockups/desktop_filtered.svg` — search + paused status filter result
- `mockups/mobile_list.svg` — mobile list with floating filter button
- `mockups/mobile_filter_sheet.svg` — mobile filter sheet with status/asset chips

Assets & component names
- `Search/Combobox` — input with listbox, ARIA: `combobox` + `listbox`, announce results count
- `Chip/Status` — toggle multi-select, `aria-pressed`, minimum 44x44px
- `Chip/Asset` — optional, multi-select
- `Dropdown/Sort` — visible focus, `aria-expanded`
- `Sheet/Filter (Mobile)` — full-screen overlay with Apply/Clear

Redlines & tokens (guidance)
- Row heights: desktop default 64px, compact 48px
- Touch targets: minimum 44x44px for interactive elements
- Spacing: base grid 8px; list padding 16px horizontal
- Typography: use project tokens; ensure WCAG AA contrast for body text

ARIA & Interaction notes
- Search combobox: `role="combobox"`, input `aria-controls` points to listbox id, arrow keys navigate, Enter selects, Esc closes
- Status chips: `role="button"` and `aria-pressed` true/false
- Announcements: when applying filters, announce "Showing N streams" via live region

Next steps
- Create Figma file and replicate these frames (or import SVGs as starting frames)
- Run 3-person internal usability tests using `USABILITY_SCRIPT.md`
- Iterate and run design crit with product + eng; record notes in DesignCrit page
- Prepare PDF export for stakeholder Slack review

Notes
- Soroban/on-chain id filters deferred to v2 (annotate in Figma)
- Keep search scope limited to `recipient label` for v1 copy clarity
