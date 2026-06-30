# GrantFox UX Bundle

This document covers the four GrantFox UI updates bundled on a single branch:

- `#531` push-notification opt-in UX with email fallback
- `#543` accessible cancel or withdraw confirmation modal
- `#551` timestamp tooltips with relative and ISO timestamps
- `#558` onboarding explainer for new users

## API Notes

No backend API contract changes were required for this bundle.

- `PushOptIn` only requests browser notification permission in secure, supported contexts.
- `ConfirmCancel` sends the existing stream action plus a client-side `amount` display label for confirmation UX only.
- `Timestamp` is presentation-only and does not alter payload shapes.
- `Explainer` is static onboarding content.

If server persistence is later added for push subscriptions or fallback preferences, that should be documented in `openapi.json` and the relevant API route README before release.

## Components Added

- `app/components/PushOptIn.tsx`
- `app/components/ConfirmCancel.tsx`
- `app/components/Timestamp.tsx`
- `app/components/Explainer.tsx`

## Routes Added or Updated

- `app/settings/notifications/page.tsx`
- `app/settings/page.tsx`
- `app/streams/[id]/page.tsx`
- `app/streams/[id]/StreamDetailClient.tsx`
- `app/onboarding/page.tsx`

## Verification

Standard domain verification for this bundle:

- `npm test`
- `npm run lint`
