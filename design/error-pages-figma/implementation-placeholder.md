# Implementation Placeholder

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
