# Monitoring & Alerting Guide

This directory contains Prometheus alert rules and SLO definitions for StreamPay settlement operations.

## Service Level Objectives (SLOs)

| Metric | Target (SLO) | Alert Threshold (Critical) |
|--------|--------------|---------------------------|
| Stellar Submission Success | > 99% | > 5% failure rate (5m) |
| Settlement Latency (p95) | < 60s | > 60s (5m) |
| Max Job Age | < 30m | > 30m |
| DLQ Depth | 0 | > 10 items |

## Documented Metrics

The following metrics are expected to be exposed by the settlement service or middleware:

- `streampay_stellar_submissions_total{status="success|failure"}`: Counter of total chain submissions.
- `streampay_settlement_job_oldest_seconds`: Gauge representing the age of the oldest pending job in the queue.
- `streampay_dlq_depth`: Gauge representing the number of items in the Dead Letter Queue.
- `streampay_settlement_duration_seconds`: Histogram of time elapsed from user "Settle" click to successful chain confirmation.

## Tuning Guide & Alert Fatigue

To avoid alert fatigue:
- **Staging vs. Production**: Staging thresholds should be more relaxed or silenced during known maintenance windows. In staging, `SettlementJobStuck` can be set to 2 hours to avoid noise from shared dev environments.
- **Flapping Alerts**: The `for: 5m` clause is used to ensure transient spikes don't trigger unnecessary pages.
- **Severity Levels**: Only `HighStellarSubmissionFailureRate` and `DLQGrowthDetected` are marked as `critical` (paging). Latency and Job Age are `warning` (Slack notification only).

## Multi-Region Caveats

- Metrics should be aggregated across regions unless specific regional network issues are suspected.
- `streampay_dlq_depth` should be monitored per region if the message queue is regional.
- Latency may vary significantly based on the user's distance to the Stellar Horizon/Soroban RPC node.

## Runbooks

All alerts link to the [Settlement Failures Runbook](../../docs/runbooks/RUNBOOK_SETTLEMENT_FAILURES.md).
