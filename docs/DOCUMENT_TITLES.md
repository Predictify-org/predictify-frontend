# Document Titles

Predictify sets client-side route titles through `app/hooks/useDocumentTitle.ts`.

`RouteDocumentTitle` watches the current Next.js pathname and applies the matching entry from
`ROUTE_TITLES`. Add new user-facing routes to that map so browser tabs, history entries, and
assistive technology expose a distinct page title.

Use the format `Page Name | Predictify` for app routes. Keep the marketing homepage title as
`Predictify - Prediction Platform` to match the root metadata.
