# Withdrawal Finality SLO

## Objective

Expose withdrawal truthfully as pending until chain finality is observed for the settlement transaction.

## Targets

- P50 pending-to-succeeded: under 15 seconds
- P95 pending-to-succeeded: under 90 seconds
- Pending-to-failed timeout: 90 seconds or 5 re-check attempts, whichever occurs first

## User State Contract

- `pending`: chain confirmation not yet observed
- `succeeded`: settlement transaction observed through Horizon pagination and marked successful
- `failed`: finality not observed within the timeout window

## Safety Constraints

- No `withdrawn` stream status before `succeeded`
- Repeated withdraw calls are idempotent re-checks
- `withdrawn` streams return stable success responses and do not execute duplicate state transitions
