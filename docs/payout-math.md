# Payout Schedule Math

This document describes the mathematical logic used for calculating payout schedules, accruals, and next execution times in StreamPay.

## Core Principles

1. **UTC Storage**: All dates are stored and processed in UTC. Timezone conversion is strictly a display-layer concern.
2. **Deterministic Calculation**: Payout times are calculated relative to the `startDate` of the stream, ensuring consistent intervals even if executions are delayed.
3. **Precision**: StreamPay uses 7 decimal places for XLM (aligning with stroops) and other assets unless specified otherwise.

## Calculation Logic

### Next Payout Time (`getNextPayoutAt`)

Calculates the absolute next time a payment should occur based on the current time and the stream's recurrence interval.

- **Per-second**: Current time + 1 second.
- **Hourly/Daily/Weekly**: Aligned to the `startDate`'s time of day/week.
- **Monthly**: Aligned to the `startDate`'s day of the month.
  - **Edge Case (Short Months)**: If a stream starts on the 31st, and the next month has only 28/30 days, the payout is capped at the last day of that month.

### Accrual & Proration (`calculateAccrual`)

Calculates the amount earned but not yet paid out.

- **Formula**: `(elapsedTime / intervalDuration) * rate`
- **Rounding**: All accrual calculations use **truncation** to the specified precision (default 7). This ensures we never over-promise funds that haven't fully vested.

## Rounding Strategy

We use **Truncation** (rounding towards zero) for all financial math in the frontend.

| Method | Value | Result (Precision 2) | Rationale |
| :--- | :--- | :--- | :--- |
| Truncate | 1.239 | 1.23 | Conservative; avoids over-allocation. |
| Banker's | 1.235 | 1.24 | Standard for banking; avoids bias. |

*Note: StreamPay defaults to Truncation for payout math to ensure ledger consistency.*

## Stellar Ledger Alignment

While Stellar ledgers close every ~5 seconds, our engine calculates time with millisecond precision. Execution engines should trigger as soon as possible after the `next_payout_at` timestamp is passed by a closed ledger.
