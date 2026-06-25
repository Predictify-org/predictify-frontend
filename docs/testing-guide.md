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

## See also

- `jest.config.js` and `jest.setup.ts` for the runtime configuration.
- `docs/PRIVACY.md` for what fixtures may not contain.
