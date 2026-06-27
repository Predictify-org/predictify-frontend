# Recommendation Provenance and 404 Recovery

## Recommendation Provenance

`components/cards/recommendation-provenance.tsx` maps recommendation signal keys to short, plain-language explanations. The dashboard recommendation strip uses the component for every recommended market, so users can open a keyboard-accessible popover and review why the item appears.

Supported signal keys:

- `category_match`: user activity overlaps with the market category.
- `similar_markets`: the recommendation is close to markets the user recently opened or followed.
- `trending`: the market is getting more attention from users.

Unknown signals fall back to neutral copy. Empty fallback strings are ignored so the UI never renders a blank explanation. The component renders text as React children and does not use raw HTML injection.

## Soft-Landing 404

`app/not-found.tsx` follows Next.js App Router conventions and offers recovery links to Dashboard, Markets, and Help. The illustration at `public/illustrations/404.svg` is decorative, marked `aria-hidden`, and disables animation when `prefers-reduced-motion: reduce` is enabled.

The broken-link report action uses a `mailto:` fallback so it still works without JavaScript.
