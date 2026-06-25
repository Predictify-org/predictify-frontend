// spike/temporal/sleep-until-workflow.ts
// Prototype: sleep-until-next-tick pattern for a single stream.
//
// This file uses Temporal SDK type signatures for illustration.
// It does NOT require a running Temporal server to read or review.
// To run for real: npm install @temporalio/workflow @temporalio/worker @temporalio/client
//
// Pattern: settle → sleep(nextTick - now) → repeat until expired.
// The workflow is durable: if the worker restarts, Temporal replays history
// and resumes the sleep from the correct remaining duration.

import {
  nextTickAt,
  isExpired,
  sleepDurationMs,
  tickId,
  type StreamConfig,
  type TickResult,
} from "./workflow-logic";

// ── Temporal SDK stubs (replaced by real imports in production) ──────────────
// These type-only stubs let the file compile without the SDK installed.
// In production: import { sleep, defineSignal, setHandler } from '@temporalio/workflow';

type SignalDef<T = void> = { name: string; _type?: T };
function defineSignal<T = void>(name: string): SignalDef<T> { return { name }; }

// Stub: in real Temporal workflow, this is a durable timer.
async function sleep(_ms: number): Promise<void> { /* replaced by SDK */ }

// ── Signals ──────────────────────────────────────────────────────────────────
export const pauseSignal = defineSignal("pause");
export const resumeSignal = defineSignal("resume");
export const stopSignal = defineSignal("stop");

// ── Activity stub ─────────────────────────────────────────────────────────────
// In production, activities are registered separately and called via
// `proxyActivities`. They run outside the workflow sandbox and can access
// secrets, make network calls, etc.
export interface StreamActivities {
  settleTick(streamId: string, tickSeq: number, scheduledAt: number): Promise<string>; // returns tx hash
}

// ── Workflow ──────────────────────────────────────────────────────────────────

/**
 * sleepUntilWorkflow — durable tick loop for a single stream.
 *
 * Lifecycle:
 *   1. Compute next tick timestamp.
 *   2. Sleep until that timestamp (durable — survives worker restart).
 *   3. Call settleTick activity (retried automatically by Temporal on failure).
 *   4. Repeat until stream expires or stop signal received.
 *
 * @param config  Stream configuration (cadence, start, end).
 * @param settle  Activity proxy (injected; not called in unit tests).
 */
export async function sleepUntilWorkflow(
  config: StreamConfig,
  settle?: StreamActivities
): Promise<TickResult[]> {
  const results: TickResult[] = [];
  let tickSeq = 0;
  let paused = false;
  let stopped = false;

  // Signal handlers (no-ops in unit tests; wired by Temporal runtime in production)
  // setHandler(pauseSignal, () => { paused = true; });
  // setHandler(resumeSignal, () => { paused = false; });
  // setHandler(stopSignal, () => { stopped = true; });

  let cursor = config.startedAt;

  while (!stopped) {
    const next = nextTickAt(cursor, config.cadence);

    if (isExpired(config, next)) {
      break;
    }

    // Durable sleep: in Temporal this is a timer that survives restarts.
    const ms = sleepDurationMs(Date.now(), next);
    if (ms > 0) {
      await sleep(ms);
    }

    if (stopped) break;

    if (paused) {
      // Wait for resume signal — in production this uses condition()
      results.push({ streamId: config.streamId, tickSequence: tickSeq, scheduledAt: next, status: "skipped" });
      cursor = next;
      tickSeq++;
      continue;
    }

    // Call settlement activity
    const id = tickId(config.streamId, tickSeq);
    try {
      if (settle) {
        await settle.settleTick(config.streamId, tickSeq, next);
      }
      results.push({ streamId: config.streamId, tickSequence: tickSeq, scheduledAt: next, status: "settled" });
    } catch {
      // Temporal retries the activity automatically; this catch is for the prototype only
      results.push({ streamId: config.streamId, tickSequence: tickSeq, scheduledAt: next, status: "skipped" });
    }

    void id; // used for idempotency key in production
    cursor = next;
    tickSeq++;
  }

  return results;
}
