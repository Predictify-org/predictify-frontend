# Runbook: Stream Reconciliation Mismatch

This document outlines the steps to take when the nightly reconciliation job detects a mismatch between the StreamPay database and the on-chain (Stellar/Soroban) state.

## 1. Identify the Mismatch
Check the reconciliation report (logs or Slack alert). Each mismatch includes:
- **Stream ID**: The unique identifier of the stream.
- **Field**: The field that mismatched (e.g., `released_amount`, `total_amount`, `status`).
- **DB Value**: The value currently stored in our database.
- **On-Chain Value**: The value fetched directly from the Stellar/Soroban contract.

## 2. Verify On-Chain Truth
Before taking action, manually verify the stream state using a block explorer or the Stellar CLI.
- **Soroban**: Use `stellar contract read` or a Soroban explorer.
- **Classic Stellar**: Use [StellarExpert](https://stellar.expert).

## 3. Common Causes
- **Index Lag**: The indexer might be a few ledgers behind the current chain tip.
- **Rounding**: Small differences due to bigint/decimal conversion (check if within tolerance).
- **Failed Transactions**: A transaction might have been recorded in the DB but failed on-chain (or vice versa).
- **Double Credits**: Potential bug in the settlement logic.

## 4. Remediation Steps
### A. If DB is behind (Index Lag)
1. Trigger a manual backfill for the affected stream using the `backfill-indexer.ts` script.
2. Wait 5 minutes and run the reconciliation job again.

### B. If DB is ahead (Double Credit/Phantom Sync)
1. **Freeze the Stream**: If the UI allows it, pause the stream to prevent further withdrawals.
2. **Investigate Logs**: Search for the `correlation_id` of the last settlement transaction for that stream.
3. **Manual Fix**: If the mismatch is confirmed and intentional (e.g., manual adjustment needed), update the DB record to match the on-chain truth.

### C. If On-Chain is inconsistent
1. This indicates a potential smart contract bug or a deep chain reorganization (rare on Stellar).
2. Escalated to the Blockchain Engineering team immediately.

## 5. Prevention
- Review recent changes to `lib/indexer.ts` or the smart contract logic.
- Ensure `Idempotency-Key` is being used correctly for all mutating requests.
