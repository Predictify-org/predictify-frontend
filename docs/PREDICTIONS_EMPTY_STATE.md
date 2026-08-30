# Predictions Empty State

The predictions surface supports status tabs and text search. When the active
filters return no predictions, the page renders a themed empty state with:

- `role="status"` and polite live-region behavior for assistive technology.
- A short explanation that reflects the active status or search query.
- A `Reset filters` action that returns the list to the full predictions view.

The current application route is `/mypredictions`. A `/predictions` dashboard
route also resolves to the same page so campaign links and future navigation can
use either path without duplicating UI logic.
