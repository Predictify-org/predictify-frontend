# StreamPay Soroban Contracts

This workspace contains the StreamPay Soroban contracts.

## streampay-stream

`streampay-stream` manages funded token streams with a draft-to-active
lifecycle:

- `create_stream(..., draft: true)` creates a funded Draft stream.
- `start_stream(stream_id)` can only be called by the stream sender and changes
  a Draft stream to Active.
- Draft streams accrue nothing. Activation anchors `start_time` and
  `last_update` to the current ledger timestamp and derives `end_time` from the
  configured duration.
- Escrow funding happens at `create_stream` for both Draft and Active streams,
  so a stream is fully funded before it can accrue or be withdrawn.

The contract exposes stable `#[contracterror]` codes from
`contracts/streampay-stream/src/error.rs` for backend error mapping.

## Tests

Run the contract tests from this directory:

```sh
cargo test -p streampay-stream
```
