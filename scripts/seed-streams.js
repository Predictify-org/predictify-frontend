#!/usr/bin/env node
// scripts/seed-streams.js
// Seeds sample payment streams against the local API for development.
// Reads STELLAR_SEED_PUBLIC_KEY and NEXT_PUBLIC_API_URL from environment.
//
// Usage:
//   node scripts/seed-streams.js
//   # or via stellar-dev.sh (called automatically)

"use strict";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const SENDER = process.env.STELLAR_SEED_PUBLIC_KEY || "";

/** @type {Array<{recipient: string, amount: string, asset: string, memo: string}>} */
const FIXTURE_STREAMS = [
  {
    recipient: "GBSAMPLERECIPIENT1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    amount: "10.0000000",
    asset: "XLM",
    memo: "fixture: monthly salary",
  },
  {
    recipient: "GBSAMPLERECIPIENT2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    amount: "5.5000000",
    asset: "XLM",
    memo: "fixture: weekly stipend",
  },
  {
    recipient: "GBSAMPLERECIPIENT3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    amount: "100.0000000",
    asset: "XLM",
    memo: "fixture: quarterly grant",
  },
];

async function seedStreams() {
  if (!SENDER) {
    console.warn("[seed-streams] STELLAR_SEED_PUBLIC_KEY not set; using placeholder sender.");
  }

  console.log(`[seed-streams] Seeding ${FIXTURE_STREAMS.length} streams against ${API_URL}`);

  let seeded = 0;
  let skipped = 0;

  for (const stream of FIXTURE_STREAMS) {
    const payload = {
      sender: SENDER || "GBPLACEHOLDERSENDERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      recipient: stream.recipient,
      amount: stream.amount,
      asset: stream.asset,
      memo: stream.memo,
    };

    try {
      const res = await fetch(`${API_URL}/streams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        console.log(`[seed-streams] ✓ Created stream ${data.id ?? "(no id)"}: ${stream.memo}`);
        seeded++;
      } else {
        const text = await res.text().catch(() => "");
        console.warn(`[seed-streams] ⚠ Stream creation returned ${res.status}: ${text.slice(0, 120)}`);
        skipped++;
      }
    } catch (err) {
      // API not running is expected in offline/CI environments
      console.warn(`[seed-streams] ⚠ Could not reach API at ${API_URL}: ${err.message}`);
      console.warn("[seed-streams]   Start the backend first, or set NEXT_PUBLIC_API_URL.");
      skipped++;
    }
  }

  console.log(`[seed-streams] Done: ${seeded} seeded, ${skipped} skipped.`);
  if (skipped > 0 && seeded === 0) {
    // Non-fatal: offline dev is valid
    process.exit(0);
  }
}

seedStreams().catch((err) => {
  console.error("[seed-streams] Fatal error:", err.message);
  process.exit(1);
});
