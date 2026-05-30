# Runbook: Settlement Failures & DLQ Growth

**Service:** Settlement
**On-Call:** Engineering / DevOps
**Severity:** Critical (if paged)

## Symptoms
- `HighStellarSubmissionFailureRate` alert firing.
- `DLQGrowthDetected` alert firing.
- Users reporting "Settle successful" message but on-chain state not updating.

## Potential Causes
1. **Stellar Network Congestion**: High base fees or network instability.
2. **Horizon/Soroban RPC Failure**: The node we are connecting to is down or out of sync.
3. **Smart Contract Bug**: A recent deployment introduced a condition that causes transactions to revert.
4. **Insufficient Funds**: The source account (escrow manager) does not have enough XLM for fees.

## Troubleshooting Steps

1. **Check RPC Health**:
   Verify if the Stellar/Soroban RPC is responsive.
   ```bash
   curl -X POST https://horizon-testnet.stellar.org -d '...' # Replace with actual endpoint
   ```

2. **Check Account Balances**:
   Ensure the StreamPay hot wallet/escrow account has sufficient XLM.

3. **Inspect DLQ Messages**:
   Log into the message queue console (e.g., AWS SQS, RabbitMQ) and inspect the payload of the oldest message in the DLQ. Look for `error_code` or `revert_reason`.

4. **Verify On-Chain**:
   Use a Stellar Explorer (e.g., StellarExpert) to look at recent transactions for the escrow contract address.

## Resolution
- **Congestion**: Increase the `MAX_FEE` setting in the environment variables and restart the service.
- **RPC Failure**: Switch to a secondary RPC provider.
- **Bug**: Roll back the last deployment to the previous stable tag.
- **DLQ**: Once the root cause is fixed, use the `replay-dlq.sh` script to move messages back to the main queue.

## Post-Mortem
If this alert was a False Positive, update the thresholds in `operations/alerts/streams.yaml`.
