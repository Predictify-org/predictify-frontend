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
