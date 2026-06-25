# Cron Jobs

Scheduled background tasks for StreamPay.

## Nightly Reconciliation

**Script:** `scripts/reconcile.ts`
**Schedule:** `0 2 * * *` (02:00 UTC daily)

### What it does

1. Fetches all streams from the database (paginated, 50 at a time).
2. Fetches matching on-chain state from the Soroban/Stellar RPC.
3. Compares `total_amount`, `released_amount`, `status`, and `recipient_address`.
4. Writes a `reconciliation.nightly.completed` entry to the append-only audit log.
5. Emits a JSON discrepancy report to stdout for log aggregation.
6. Exits `0` on SUCCESS or MISMATCH_FOUND; exits `1` on FAILED (pages on-call).

### Running manually

```bash
# Production run
npm run reconcile

# Dry run (skips DB status persistence)
RECONCILE_DRY_RUN=true npm run reconcile

# With a custom amount tolerance (bigint base units)
RECONCILE_TOLERANCE=100 npm run reconcile
```

### Environment variables

| Variable              | Default | Description                                                  |
|-----------------------|---------|--------------------------------------------------------------|
| `RECONCILE_TOLERANCE` | `0`     | Bigint tolerance for amount comparisons (base units)         |
| `RECONCILE_DRY_RUN`   | `false` | Skip persisting run status to the database when `true`       |

### Exit codes

| Code | Meaning                                              |
|------|------------------------------------------------------|
| `0`  | SUCCESS — all streams match on-chain state           |
| `0`  | MISMATCH_FOUND — discrepancies logged; review audit  |
| `1`  | FAILED — critical error (DB/RPC unreachable)         |

MISMATCH_FOUND exits `0` intentionally. The audit log entry and JSON stdout report are the notification surface. Configure your log aggregator or alerting rules to trigger on `"status":"MISMATCH_FOUND"` in the structured log output rather than on the exit code.

### Crontab example (Linux/macOS)

```cron
# StreamPay nightly reconciliation — 02:00 UTC
0 2 * * * cd /app && npm run reconcile >> /var/log/streampay/reconcile.log 2>&1
```

### Kubernetes CronJob example

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: streampay-reconcile
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid        # never overlap
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: reconcile
              image: streampay-frontend:latest
              command: ["npm", "run", "reconcile"]
              envFrom:
                - secretRef:
                    name: streampay-env
```

### Resumability

The script processes streams in pages of 50. If a page-level DB fetch fails the job marks itself FAILED and stops — the next scheduled run will restart from the beginning. Per-stream RPC errors are recorded in `report.errors` but do not abort the rest of the page; the job continues and finishes with status FAILED only if any errors were encountered.

This means partial pages are safe to re-run: the job is idempotent with respect to audit log writes (each run appends a new entry with its own UUID and timestamp).

### Runbook

See [docs/reconciliation-runbook.md](../docs/reconciliation-runbook.md) for step-by-step remediation when mismatches are detected.
