# Saved Market Bookmarks

Markets can be saved from the marketing widget with the bookmark button on each
market card. Saved market IDs are stored in the client-side
`useBookmarksStore` Zustand store and persisted to `localStorage` under
`predictify-bookmarks`.

The widget header exposes the saved count with the accessible label
`Saved markets, N saved`. When at least one market is saved, the header also
shows a compact saved list so users can review their personal market shortlist
without leaving the widget.
