# Pact Contract Fixtures — /api/v2/streams

Pact-style contract tests that verify the live v2/streams route handlers
match the response shapes the UI depends on.

## Structure
## State Transitions Covered

| Fixture | State | Available Actions |
|---|---|---|
| stream-active | active | pause, stop |
| stream-paused | paused | start, stop |
| stream-ended | ended | (none) |
| stream-create | draft (on creation) | start |

## Running

```bash
# Run only contract tests
npm test -- contracts

# Run with verbose output
npm test -- contracts --verbose
```

## Adding a New Fixture

1. Add a JSON file to `fixtures/` following the Pact interaction schema.
2. The verifier picks it up automatically via `loadAllFixtures()` — no code changes needed.
3. Ensure `providerState` describes the server state clearly for future provider-side verification.

## CI

The `npm test -- contracts` command is included in the CI matrix.
Failures here mean the UI contract has drifted from the live API shape.
