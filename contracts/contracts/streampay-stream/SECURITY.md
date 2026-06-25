# streampay-stream security notes

## Withdraw token-transfer boundary

`withdraw` follows **checks-effects-interactions (CEI)**:

1. **Checks** — auth, pause guard, status, and withdrawable ceiling.
2. **Effects** — `released_amount`, `last_update`, and terminal `Settled` status are written to storage **before** the SEP-41 `transfer`.
3. **Interactions** — the contract calls the stream token's `transfer`.
4. **Post-transfer guard** — storage is re-read and accounting invariants are asserted.

Soroban prevents classical cross-contract reentrancy, but SEP-41 tokens remain an external trust boundary. A malicious or buggy token implementation could still interact unexpectedly with host storage or future protocol features. The post-transfer re-read verifies that persisted stream accounting still matches the values written in step 2 and that identity fields (`id`, `sender`, `recipient`, `token`, `total_amount`) are unchanged.

If any invariant fails, `withdraw` returns [`Error::InvalidState`](src/error.rs) and the transaction rolls back atomically together with the token transfer.

## Invariants checked after transfer

- `released_amount == expected_released`
- `last_update == expected_last_update`
- `status == expected_status`
- `0 <= released_amount <= total_amount`
- stream identity fields match the pre-transfer snapshot

## Testing

- `withdraw_post_transfer_guard_rejects_storage_drift` — unit test corrupts persisted storage and exercises the guard directly.
- `withdraw_survives_malicious_token_reentrant_transfer_attempt` — mock SEP-41 token attempts a nested `withdraw` during `transfer`; the outer call must fail without committing partial accounting.

## Related reading

- [Soroban reentrancy design](https://stellar.org/blog/developers/sorobans-technical-design-decisions-learnings-from-ethereum)
- Contract README: [README.md](README.md)
