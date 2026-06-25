# Contract Coverage Gate

## Overview
cargo llvm-cov runs on every PR or push that touches contracts/ or the workflow itself.
The job fails (blocks merge) if line coverage for streampay-stream drops below 95%.

## How it works
- Collect: cargo llvm-cov instruments Rust source with LLVM coverage
- Gate: --fail-under-lines 95 blocks merge if coverage drops below 95%
- Report: LCOV file uploaded to Codecov for badge and PR annotations
- Artifact: LCOV archived 14 days for offline review

## Excluded code
Bench targets matching bench* are excluded via --exclude-from-report bench*

## Required secret
Add CODECOV_TOKEN in GitHub > Settings > Secrets > Actions for the Codecov upload step.

## Running locally
cd contracts/streampay-stream
cargo llvm-cov --all-features --workspace --open
