# StreamPay contract changelog

This changelog tracks user-visible changes to the Soroban contract
under `contracts/contracts/streampay-stream/`. Backend changes are
tracked in the repository-root `CHANGELOG.md`.

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Discriminant numbers in `error.rs` are part of the public contract API
and must never be reused — see the module rustdoc for details.

## [Unreleased]

### Added
- Module-level documentation for `error.rs`, `storage.rs`, and events
  schema in `events.rs`.
- `init_with_token_allowlist(admin, tokens)` entrypoint. Performs the
  work of `initialize` and then marks every address in `tokens` as
  `allowed = true` in a single transaction, replacing the
  previously-required `initialize` + N `set_token_allowed` two-step
  deploy flow. Old `initialize` path is unchanged for backward
  compatibility.

### Notes
- TTL tuning for stream and instance keys remains at the same constants
  the operational runbook assumes.

## [0.1.0] - Initial draft

### Added
- `initialize`, `create_stream`, `start_stream`, `withdraw`, `pause`,
  `resume`, `settle` entry points.
- Per-token allowlist via `set_token_allowed`.
- Global emergency pause via `set_paused`.
- `created`, `started`, `withdrawn`, `settled`, `paused`, `resumed`
  events.
