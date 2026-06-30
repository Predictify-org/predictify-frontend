/**
 * Backfill Script: Rebuild the activity_timeline projection from raw events.
 *
 * Usage:
 *   npx ts-node scripts/backfill-activity-timeline.ts
 *
 * Environment variables:
 *   - DRY_RUN=1    Print what would be done without mutating state.
 *
 * This script reads all ActivityEvent records from the raw event store
 * and backfills the denormalized activity_timeline projection store.
 * It is designed to be idempotent — running it multiple times produces
 * the same state as a single run.
 */

import { getStore, setStore } from "@/app/lib/db";
import { createInMemoryPersistenceStore } from "@/app/lib/repositories/in-memory";
import { activityEventToTimelineEntry, type ActivityTimelineEntry } from "@/app/lib/repositories/activity-timeline";
import type { ActivityEvent } from "@/app/types/openapi";

interface BackfillStats {
  totalRaw: number;
  projected: number;
  skipped: number;
  durationMs: number;
}

async function runBackfill(): Promise<BackfillStats> {
  const start = Date.now();
  const store = getStore();
  const dryRun = process.env.DRY_RUN === "1";

  const rawEvents: ActivityEvent[] = [];
  store.streamRepository.activity.forEach((event) => {
    rawEvents.push(event);
  });

  if (rawEvents.length === 0) {
    console.log("No raw events found. Nothing to backfill.");
    return { totalRaw: 0, projected: 0, skipped: 0, durationMs: Date.now() - start };
  }

  const latestProjected = store.activityTimeline.getLatestProjectedTimestamp();
  let projected = 0;
  let skipped = 0;

  const entries: ActivityTimelineEntry[] = [];

  for (const event of rawEvents) {
    if (latestProjected && event.timestamp <= latestProjected) {
      const existing = store.activityTimeline.query({
        limit: 1,
        streamId: event.streamId,
        type: event.type,
      });
      if (existing.data.length > 0) {
        skipped++;
        continue;
      }
    }

    entries.push(activityEventToTimelineEntry(event));
    projected++;
  }

  if (entries.length > 0) {
    if (dryRun) {
      console.log(`[DRY RUN] Would backfill ${entries.length} entries into activity_timeline.`);
    } else {
      store.activityTimeline.backfill(entries);
      console.log(`Backfilled ${entries.length} entries into activity_timeline.`);
    }
  }

  const durationMs = Date.now() - start;
  console.log(`Statistics: ${projected} projected, ${skipped} skipped, ${durationMs}ms`);

  return { totalRaw: rawEvents.length, projected, skipped, durationMs };
}

function main(): void {
  if (!getStore()) {
    setStore(createInMemoryPersistenceStore(false));
  }

  runBackfill()
    .then((stats) => {
      console.log(`Backfill complete. ${stats.projected} events projected in ${stats.durationMs}ms.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Backfill failed:", err);
      process.exit(1);
    });
}

if (require.main === module) {
  main();
}

export { runBackfill };
