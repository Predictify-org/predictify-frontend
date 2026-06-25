# Implementation Placeholder

## Status: Implemented

The recovery pages from `error-pages-spec.md` now ship in the app:

- `app/not-found.tsx` — global `404` (broken-link / navigation-drift posture).
- `app/error.tsx` — client error boundary covering the generic `5xx` state and
  the Stellar/Horizon **outage** variant (auto-selected when the thrown error
  mentions Stellar/Horizon/Soroban/RPC/network keywords). Primary action calls
  `reset()` ("Try again"); `error.digest` is surfaced as a support reference.
- `app/components/ErrorRecovery.tsx` — shared presentational layout (skip link,
  brand header, single `main` landmark, recovery panel, helper note). Tested in
  `ErrorRecovery.test.tsx`.
- `app/globals.css` — `.error-page*` styles using theme tokens, per-variant
  accents (`#7C8BFF` 404, `--warning` 5xx, `#2DD4BF` outage), and a mobile
  variant responsive down to 320px (24px gutters, stacked full-width actions).

Recovery actions are native `<a>`/`<button>` elements, so they are keyboard
operable; the skip link becomes visible on focus.

## Future Issue Stub

Title suggestion:

`frontend(app): implement global 404, 5xx, and Stellar service recovery pages`

## Links To Carry Over

- Design source: `design/error-pages-figma/error-pages-spec.md`
- Review export: `design/error-pages-figma/error-pages-figma.pdf`
- Accessibility notes: same spec, `Accessibility Annotations`

## Future Frontend Scope

- Add global `404` route handling.
- Add generic `5xx` or route-level fallback pattern.
- Add service-unavailable state for Stellar/Horizon/Soroban dependency failures.
- Implement skip link, focus order, and visible focus states.
- Connect real support and status-page destinations.

## Explicitly Out Of Scope For This Design Issue

- React or Next.js route changes.
- Error boundary wiring.
- Telemetry or backend retry behavior.
- Final copy wiring in `app/content/copy.ts`.

## Acceptance Notes For The Future App Issue

- Match the final approved design copy and hierarchy.
- Do not expose internal hostnames, stack traces, or raw network errors.
- Preserve one primary and one secondary action per state.
- Verify keyboard order, skip-link behavior, and contrast in the shipped UI.
