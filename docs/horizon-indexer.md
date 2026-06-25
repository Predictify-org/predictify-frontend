# Horizon Events Indexer

The Horizon Events Indexer (`lib/indexer.ts`) tracks on-chain Stellar events to drive stream settlement and escrow states. It persists cursors, supports safe backfills, and deduplicates events idempotently to handle network gaps or reorgs without silent data loss.

## How to Re-index

If you need to re-index from a specific ledger or re-sync the entire network due to a database wipe or deployment of a new schema:

1. **Pause the Main Loop:** Stop the active indexer process to prevent race conditions during backfill.
2. **Update Cursor State:** If you want to force a full re-index, clear the network's `last_ledger` cursor from the database. Alternatively, set it to your desired starting ledger.
3. **Run Backfill:** Execute the backfill job. The indexer will use a safe `overlapWindow` to scan backward from the current cursor, preventing missed events during the deployment or restart window.
   ```typescript
   // Example usage in a script
   const indexer = new HorizonIndexer(config);
   await indexer.backfill(targetLedger, fetchEventsForBackfill);
   ```
4. **Resume Indexer:** Restart the main event stream loop. Because of idempotency using natural keys (`network:event_id:event_type`), duplicate events re-processed during the overlap will be safely ignored.

## Time to Backfill

Backfill speeds depend heavily on your RPC/Horizon provider's rate limits and latency.
- **Paging Limits:** Horizon typically returns up to 200 records per page.
- **Estimated Throughput:** An average backfill job processing pure ledger transitions without heavy database mutations can process roughly 50,000 to 100,000 events per minute.
- **Re-indexing an entire month** (~500,000 ledgers) could take anywhere from 10 to 30 minutes, depending on the volume of matching events (`payment`, `invoke_host_function`, etc.).

## Disk Expectations

The indexer strictly persists cursors and deduplication keys.
- **Cursor State:** Negligible. A single row/record per network containing `last_ledger` and `last_updated_at`.
- **Deduplication Set:** Storing processed event keys (`testnet:evt_123:payment`) requires some space. 
  - Assuming string keys are ~50 bytes each, 1,000,000 events will consume ~50MB of memory or disk space.
  - *Recommendation:* In a production durable store (like Redis or PostgreSQL), configure a TTL (Time-To-Live) for idempotency keys (e.g., 7-14 days) to prevent unbounded disk growth while maintaining safe overlap guarantees for typical deployment windows.

## Alerting and Diagnostics

The indexer implements structured logging and stall checks:
- **Stall Alerts:** Emits an alert if the cursor is not updated within the defined `stallThresholdMs` (e.g., 5-10 minutes), helping catch silent failures or RPC unreachability.
- **Structured Error Logs:** Errors are logged with a JSON payload including a `correlation_id` and `stream_id` to trace transaction states efficiently.
