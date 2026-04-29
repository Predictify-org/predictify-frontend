// spike/temporal/child-workflow.ts
// Prototype: parent workflow manages stream lifecycle; child workflow handles ticks.
//
// Pattern:
//   parentWorkflow(streams[]) → for each stream → startChild(streamWorkflow)
//   streamWorkflow(config)    → tick loop (same as sleep-until but as a child)
//
// Child workflows are independently retryable, cancellable, and observable.
// The parent can add/remove streams dynamically via signals.

import {
  nextTickAt,
  isExpired,
  sleepDurationMs,
  tickId,
  missedTicks,
  type StreamConfig,
  type TickResult,
} from "./workflow-logic";

// ── Temporal SDK stubs ────────────────────────────────────────────────────────
async function sleep(_ms: number): Promise<void> { /* replaced by SDK */ }

// In production: import { startChild, CancellationScope } from '@temporalio/workflow'
async function startChild<T>(
  _workflowFn: (...args: unknown[]) => Promise<T>,
  _options: { workflowId: string; args: unknown[] }
): Promise<{ result: () => Promise<T> }> {
  // Stub: returns a handle whose result() resolves immediately
  return { result: async () => ({ ticks: [] }) as unknown as T };
}

// ── Child workflow ────────────────────────────────────────────────────────────

/**
 * streamChildWorkflow — tick loop for a single stream, run as a Temporal child.
 *
 * Key properties:
 * - Workflow ID = streamId → exactly-once execution per stream.
 * - `continueAsNew` should be used for very long-running streams to bound history size.
 *   (omitted here for clarity; add when history exceeds ~10k events)
 */
export async function streamChildWorkflow(
  config: StreamConfig,
  catchUpFrom?: number // if set, process missed ticks from this timestamp first
): Promise<{ ticks: TickResult[] }> {
  const results: TickResult[] = [];
  let tickSeq = 0;

  // Catch-up: process any ticks missed during downtime
  if (catchUpFrom !== undefined) {
    const missed = missedTicks(catchUpFrom, Date.now(), config.cadence);
    for (const scheduledAt of missed) {
      results.push({
        streamId: config.streamId,
        tickSequence: tickSeq,
        scheduledAt,
        status: isExpired(config, scheduledAt) ? "expired" : "settled",
      });
      tickSeq++;
    }
  }

  // Normal tick loop
  let cursor = config.startedAt;
  while (true) {
    const next = nextTickAt(cursor, config.cadence);
    if (isExpired(config, next)) break;

    const ms = sleepDurationMs(Date.now(), next);
    if (ms > 0) await sleep(ms);

    results.push({
      streamId: config.streamId,
      tickSequence: tickSeq,
      scheduledAt: next,
      status: "settled",
    });

    void tickId(config.streamId, tickSeq); // idempotency key passed to activity in production
    cursor = next;
    tickSeq++;

    // Safety: break after first tick in prototype (avoid infinite loop in tests)
    break;
  }

  return { ticks: results };
}

// ── Parent workflow ───────────────────────────────────────────────────────────

export interface ParentWorkflowResult {
  started: string[];   // stream IDs for which a child was started
}

/**
 * parentWorkflow — starts one child workflow per stream.
 *
 * In production:
 * - Receives `addStream` / `removeStream` signals to manage the set dynamically.
 * - Uses `CancellationScope` to cancel a child when a stream is stopped.
 * - Awaits all children on shutdown.
 */
export async function parentWorkflow(
  configs: StreamConfig[]
): Promise<ParentWorkflowResult> {
  const started: string[] = [];

  for (const config of configs) {
    // Each child has a stable workflow ID = streamId.
    // Temporal deduplicates: starting the same ID twice is a no-op.
    await startChild(streamChildWorkflow, {
      workflowId: `stream-${config.streamId}`,
      args: [config],
    });
    started.push(config.streamId);
  }

  return { started };
}
