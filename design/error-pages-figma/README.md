# StreamPay Error Recovery Pages

## Scope

UI/UX and product design handoff for three static Figma artboards:

- `404` for bad or expired links.
- Generic `5xx` for StreamPay-side failures.
- `Network or Stellar service unavailable` for Horizon, Soroban, or related availability issues.

This pack is intentionally design-only. It does not implement Next.js routes, error boundaries, or `not-found` behavior in the app.

## Deliverables

- `error-pages-figma.pdf` - four-page stakeholder review export.
- `error-404-page.png` - desktop `404` frame preview.
- `error-5xx-page.png` - desktop generic `5xx` frame preview.
- `error-stellar-outage-page.png` - desktop Stellar/Horizon outage frame preview.
- `error-mobile-variant.png` - optional mobile adaptation preview.
- `error-pages-spec.md` - copy, structure, interaction, a11y, and handoff notes.
- `design-crit-notes.md` - review checklist, feedback prompts, and dependencies.
- `implementation-placeholder.md` - placeholder brief for a future frontend issue.
- `usability-test-one-pager.md` - optional test script and session plan.
- `build_error_pages.py` - local exporter for PNG/PDF previews and QA report.
- `quality-report.json` - export verification and contrast self-check.

## Suggested Figma Frames

- `Errors / 404 / Desktop`
- `Errors / 5xx / Desktop`
- `Errors / Stellar Service Unavailable / Desktop`
- `Errors / Stellar Service Unavailable / Mobile`
- `Errors / A11y / Notes`
- `Errors / Implementation Placeholder`

## Product Guardrails

- Keep the tone calm, practical, and non-shaming.
- Use one clear primary action and one clear secondary action per frame.
- Distinguish `404` from service failures visually and verbally.
- Reassure users about funds on Stellar/Horizon outages without technical jargon or custody promises.
- Do not show stack traces, request IDs intended only for internal tooling, raw RPC errors, internal hostnames, or infrastructure vendor details in user-facing frames.

## Review Status

- Design pack: ready for stakeholder review.
- Product review: pending.
- Engineering review: pending.
- Legal/brand timing claims review: pending.

## Validation

Run:

```bash
python3 design/error-pages-figma/build_error_pages.py
```

The script writes the PNG exports, the PDF review pack, and `quality-report.json`.
