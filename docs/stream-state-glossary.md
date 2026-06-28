# Stream State Glossary

A short reference for the terms used across the contract, backend, and
UI when describing the lifecycle of a stream.

## States

| State       | Where it lives | What it means |
|-------------|----------------|---------------|
| `Draft`     | On-chain       | Funded and escrowed, not yet streaming. No accrual. |
| `Active`    | On-chain       | Vesting linearly between `start_time` and `end_time`. |
| `Paused`    | On-chain       | Accrual frozen; vested balance still withdrawable. |
| `Settled`   | On-chain       | Terminal. Recipient has received the full `total_amount`. |
| `Cancelled` | On-chain       | Terminal. Sender ended the stream; unvested funds refunded. |
| `Ended`     | On-chain       | Terminal alias used by the indexer when `end_time` passed without a settle call. |

## Amounts

- **`total_amount`** — total tokens escrowed at creation.
- **`released_amount`** — tokens already transferred to the recipient.
- **`vested_amount`** — tokens earned but not yet withdrawn (a view).
- **`withdrawable`** — vested minus released; what `withdraw` will pay out.

## Time

- **`start_time`** — Unix epoch seconds. Vesting begins here.
- **`end_time`** — Unix epoch seconds. Vesting completes here.
- **`last_update`** — last time a state-mutating call touched the row.
- **`total_paused_duration`** — cumulative time spent in `Paused`,
  used to shift `end_time` so unstreamed time is preserved.

## See also

- `docs/STATE_MACHINE.md` — formal transition table.
- `docs/payout-math.md` — accrual formulas with worked examples.
- `docs/invariants.md` — invariants the indexer enforces.
