Final Handoff Summary — Streams list: Search & Filters (v1)

Purpose
- Provide a clear package for engineering and product to review and implement the Streams list search/filter/sort UI.

Included in this repo folder
- Review package ZIP: `review_package.zip` (mockups, benchmarks, readme)
- Component specs: `COMPONENT_SPECS.md`
- Redlines: `REDLINES.md`
- Export instructions: `EXPORT_INSTRUCTIONS.md`
- Accessibility notes: `WCAG_SELF_CHECK.md`
- Usability materials: `USABILITY_SCRIPT.md`, `USABILITY_SESSION_CHECKLIST.md`, `USABILITY_RESULTS.md` (create after sessions)
- Design crit materials: `DESIGN_CRIT_FRAME_CHECKLIST.md`, `DESIGN_CRIT_AGENDA.md`

Figma artboard creation instructions (recommended)
1. Create file: "StreamPay — Streams List: Search & Filters (v1)"
2. Pages to add: Cover, Components, Desktop, Mobile, Empty states, Benchmarks, Handoff
3. Import SVG mockups from `mockups/` and `benchmarks/` as starter frames
4. Recreate components in Figma Components page using tokens and specs from `COMPONENT_SPECS.md` and `REDLINES.md`
5. Add interactive prototyping links for: search combobox open/select, apply filters, and mobile filter sheet open/apply
6. Add annotations: ARIA notes (from `WCAG_SELF_CHECK.md`), keyboard behavior, and live-region placement
7. Export: use Figma export presets to produce 1x/2x PNGs and a combined PDF for review

Deliverables expected from this handoff
- Figma file (v1) with components and annotated frames
- Exported assets: PNGs + PDF for stakeholder review
- Usability results appended to `USABILITY_RESULTS.md`
- Action items tracked and owners assigned after the design crit

Notes
- Soroban/on-chain id filtering is deferred to v2 (annotate in Figma cover)
- If you prefer, I can produce PNG/PDF exports locally — but the local environment currently lacks Inkscape/ImageMagick. Figma exports are recommended for final review quality.
