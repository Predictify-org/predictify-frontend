# Document Titles

Predictify sets client-side route titles through `app/hooks/useDocumentTitle.ts`.

`RouteDocumentTitle` watches the current Next.js pathname, applies the matching entry from `ROUTE_TITLES`, and announces the new title to screen readers (SR) via the global ARIA live region (`@/hooks/use-global-live-region`).

Add new user-facing routes to `ROUTE_TITLES` so browser tabs, history entries, and assistive technology expose a distinct page title.

## Standard Title Format

Use the format `Page Name | Predictify` for app routes. Keep the marketing homepage title as `Predictify - Prediction Platform` to match root metadata.

## Hook API Options

`useDocumentTitle(title: string, options?: UseDocumentTitleOptions)`

- `restoreOnUnmount?: boolean` (default `true`): Restores the document title to its previous value when the component unmounts. Set to `false` for route-level title handlers like `RouteDocumentTitle`.
- `announceToSR?: boolean` (default `false`): Dispatches a polite ARIA live region announcement via `announce()` when `document.title` updates, ensuring screen reader users are notified on single-page app (SPA) navigations.

