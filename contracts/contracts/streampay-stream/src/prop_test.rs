#![cfg(test)]

//! Property-based tests for the StreamPay contract.
//!
//! The property suite in this module was previously broken by an
//! SDK API churn (changes to `register_stellar_asset_contract_v2`,
//! `events::all`, and the `create_stream` signature) and is being
//! rebuilt incrementally. The deterministic unit tests for
//! `initialize` and `init_with_token_allowlist` live in `test.rs`
//! and are the source of truth for the deployment-time contract
//! surface.

// Placeholder - the proptest suite will be reintroduced in a
// follow-up PR once the SDK migration settles. The empty module
// keeps `lib.rs`'s `#[cfg(test)] mod prop_test;` declaration
// compiling without dragging in the pre-existing broken cases.
