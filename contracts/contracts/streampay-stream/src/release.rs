//! # Linear release/accrual math
//!
//! Pure functions for computing vested amounts in a payment stream using
//! overflow-safe checked arithmetic. The contract uses `overflow-checks = true`,
//! but these functions explicitly use checked operations to guarantee safety
//! and make the invariants clear.

use super::{Stream, StreamStatus};
use core::cmp::{max, min};

/// Computes the total amount that has vested at a given ledger timestamp.
/// 
/// Account for paused duration: time "stops" while the stream is paused.
pub fn vested_amount(stream: &Stream, now: u64) -> i128 {
    if stream.status == StreamStatus::Draft {
        return 0;
    }

    // Clamp now to [start_time, end_time]
    let mut effective_now = max(stream.start_time, min(now, stream.end_time));
    
    // If currently paused, accrual stopped at pause_time
    if stream.status == StreamStatus::Paused {
        effective_now = min(effective_now, stream.pause_time);
    }
    
    // Compute elapsed time since start, excluding paused time
    let elapsed = effective_now
        .saturating_sub(stream.start_time)
        .saturating_sub(stream.total_paused_duration);
    
    // Handle edge case: zero duration (should never happen with valid streams)
    if stream.duration == 0 {
        return stream.total_amount;
    }
    
    // vested = total_amount * elapsed / duration
    // Use checked_mul/div to prevent overflow
    (stream.total_amount)
        .checked_mul(elapsed as i128)
        .expect("vested_amount multiply overflow")
        .checked_div(stream.duration as i128)
        .expect("vested_amount divide overflow")
}

/// Computes the amount available for withdrawal (vested - already released).
pub fn withdrawable(stream: &Stream, now: u64) -> i128 {
    let vested = vested_amount(stream, now);
    let available = vested.saturating_sub(stream.released_amount);
    
    // Defensive clamp to ensure non-negative (should already be guaranteed)
    max(0, available)
}
