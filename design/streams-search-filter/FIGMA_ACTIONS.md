Figma actions checklist — create Figma v1 starter

Goal: create a review-ready Figma v1 with starter frames and invite stakeholders for review.

1. Create file
- File name: "StreamPay — Streams List: Search & Filters (v1)"
- Team/project: StreamPay / Stream UI

2. Pages to create
- Cover (summary, scope, stakeholders, v1, timebox)
- Components (tokens, typography, colors, icons)
- Desktop (default list, filtered, sorted, loading, error)
- Mobile (list, filter sheet, empty states)
- Empty States (no streams, no results, loading placeholders)
- Benchmarks (screenshots and notes)
- Handoff (redlines, exports, named assets)

3. Starter frames to add
- Desktop: 1366px width artboards, three density variants (comfortable, default, compact)
- Mobile: 375px width artboards, list view and filter sheet overlay
- Components: Search combobox, Status chip (on/off), Asset chip, Sort dropdown, List row

4. Annotations to add (for each component)
- Interaction notes: keyboard, ARIA attributes, focus styles, announcement copy
- Touch target sizes: minimum 44x44px for interactive elements
- WCAG: contrast ratio values and callouts where brand tokens fail

5. Benchmarks
- Add 1–2 screenshots (Mercury, Brex/Ramp style) with short notes on what to borrow/avoid

6. Handoff exports
- PDF: full artboard export for review
- PNGs: 1x and 2x for top frames
- Named components: follow tokens and export names in `README.md`.

7. Stakeholder invite template
Subject: Review-request: Streams List (search, filters, sort) — Figma v1
Body:
Hi <Name>,
I've prepared Figma v1 for the Streams List search/filter/sort flows. The file includes desktop and mobile frames, accessibility notes, benchmarks, and a short usability script. Please review and provide feedback in a 1:1 or Slack thread within 48 hours if possible.
Link: <Figma file URL>
Suggested reviewers: @product, @eng

8. Next steps after creation
- Run quick internal 3-person usability test with `USABILITY_SCRIPT.md`.
- Iterate and run design crit with product + eng; add notes to the DesignCrit page.

If you want, I can create the Figma file now (I will prepare the frames and invite stakeholders) — provide the stakeholder email(s) or tell me to leave the file unshared for you to invite. 