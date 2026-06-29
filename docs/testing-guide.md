# Testing Guide

A practical reference for writing and running tests in this repository.

## Test types

| Layer       | Runner | Location convention |
|-------------|--------|---------------------|
| Unit        | Jest   | `foo.ts` + `foo.test.ts` next to source. |
| Component   | Jest + Testing Library | `Component.test.tsx` next to component. |
| Route       | Jest   | `app/api/**/route.test.ts` next to handler. |
| E2E         | Jest   | `*.e2e.test.ts` in the route folder. |
| Contract    | Cargo  | `contracts/contracts/streampay-stream/src/test.rs`. |
| Property    | fast-check + Jest | `*.test.ts` using `fc.assert(...)`. |

## Running

```bash
# Full Jest suite
npm test

# Single file
npm test -- lib/format-bigint.test.ts

# Lifecycle E2E only (serial)
npm run test:e2e

# Contract tests
(cd contracts && cargo test)
```

## Conventions

- Prefer black-box assertions against module exports — internal helpers
  are not stable API.
- Reset shared mutable state in `beforeEach`. The repositories expose
  a `resetDb()` helper that the E2E harness uses for isolation.
- Don't hit the network. Stellar/Soroban calls are mocked at the
  adapter boundary; see the README "Security notes for lifecycle tests"
  section.
- Add property tests for any logic with non-trivial arithmetic
  (accrual, paging, retry backoff). The `escrow-invariants.test.ts`
  file is a good template.

## Useful flags

- `--runInBand` — run tests serially when shared state is unavoidable.
- `--detectOpenHandles` — diagnose hanging processes after a run.
- `--coverage` — emit `coverage/` for CI.

## Shape stability tests (issue #597)

`tests/streamsShape.test.ts` pins the exact JSON envelope returned by
`GET /api/streams` and `POST /api/streams` using Jest snapshots.

| Concern | How it is covered |
|---------|------------------|
| Envelope keys (`data`, `links`, `meta`) | `Object.keys` snapshot |
| camelCase field names (no snake_case leakage) | explicit `toHaveProperty` guards before snapshot |
| Error envelope shape (`error.code`, `.message`, `.request_id`, `.details`) | 422 and 400 snapshots |
| Volatile values | replaced with `<ISO_TIMESTAMP>`, `stream-<ID>`, `<CURSOR>`, `<REQUEST_ID>` by `stabilise()` before snapshotting |

```bash
# Run only the shape stability suite
npm test -- tests/streamsShape.test.ts

# Intentionally update snapshots after a deliberate v1 shape change
npx jest tests/streamsShape.test.ts --updateSnapshot
```

> Only run `--updateSnapshot` after confirming the change is
> backwards-compatible with wallet partners still on v1 (sunset: 2026-12-31).

## See also

- `jest.config.js` and `jest.setup.ts` for the runtime configuration.
- `docs/PRIVACY.md` for what fixtures may not contain.
