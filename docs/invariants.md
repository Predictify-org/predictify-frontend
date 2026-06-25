# Stream Invariants & Property Testing

To ensure the reliability of StreamPay's accounting, we use property-based testing to verify that stream states remain consistent under any sequence of valid events.

## Core Invariants

1. **Conservation of Value**: `deposited_amount == withdrawn_amount + escrow_balance`. Funds must always be accounted for.
2. **Non-Negativity**: `deposited`, `withdrawn`, and `escrow` must never be less than zero.
3. **Escrow Bound**: A withdrawal or refund can never exceed the current `escrow` balance.

## Property Testing Setup

We use `fast-check` to generate randomized sequences of `deposit`, `withdraw`, and `refund` events.

- **Runs**: Default 1000 iterations per test.
- **Shrinking**: If a failure is found, `fast-check` automatically simplifies the event sequence to the minimal reproduction case.
- **CI Stability**: Tests use deterministic seeds to ensure failures are reproducible in CI pipelines.

## Security Note

These invariants are modeled in the frontend/middleware to guide users and catch logic errors early. However, they are **not** a substitute for on-chain Soroban contract security. Final enforcement always happens via Soroban smart contracts.

## Future Work

- Integration with [StreamPay-Contracts](https://github.com/Streampay-Org/StreamPay-Contracts) formal verification models.
- Nightly "heavy" runs with 10,000+ iterations.
