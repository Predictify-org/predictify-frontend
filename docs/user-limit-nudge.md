# User Limit Nudge

The market card now surfaces the user's remaining daily betting allowance before the confirmation flow.

## Implementation

- `app/state/userLimits.ts` stores per-market daily limits, used amount, currency, remaining allowance, usage percentage, and remaining percentage.
- `app/(marketing)/_components/markets-widget.tsx` reads the store for each market card and renders a compact allowance nudge when limit data is available.
- The nudge uses a labelled `progressbar` so assistive technology can announce the remaining allowance percentage.

## Behavior

- Remaining allowance is clamped at `0` when usage exceeds the daily limit.
- Percentages are clamped between `0` and `100`.
- Sample local values are provided for the marketing widget until live account-limit data is wired in.

## Verification

- `app/state/__tests__/userLimits.test.ts` covers store calculations and clamping.
- `app/(marketing)/_components/__tests__/markets-widget.test.tsx` covers visible copy and progressbar accessibility.
