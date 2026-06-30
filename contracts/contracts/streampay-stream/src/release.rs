//! # Linear release/accrual math
//!
//! Pure functions for computing vested amounts in a payment stream using
//! overflow-safe checked arithmetic. All arithmetic uses checked operations
//! that propagate [`Error::Overflow`] instead of panicking, making the
//! contract safe for production use even with extreme inputs.
//!
//! The contract's `Cargo.toml` sets `overflow-checks = true`, but these
//! functions explicitly use checked operations to guarantee safety at the
//! type level and make the invariants clear to reviewers.

use super::{Error, Stream, StreamStatus};
use core::cmp::{max, min};

/// Computes the total amount that has vested at a given ledger timestamp.
///
/// Accounts for paused duration: time "stops" while the stream is paused.
///
/// # Returns
///
/// * `Ok(vested)` — the vested amount, always in `[0, total_amount]`.
/// * `Err(Error::Overflow)` — if any arithmetic step overflows `i128`.
pub fn vested_amount(stream: &Stream, now: u64) -> Result<i128, Error> {
    if stream.status == StreamStatus::Draft {
        return Ok(0);
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

    // Handle edge case: zero duration (should never happen with valid streams,
    // but we handle it defensively).
    if stream.duration == 0 {
        return Ok(stream.total_amount);
    }

    // vested = total_amount * elapsed / duration
    // All casts from u64 to i128 are safe because u64::MAX < i128::MAX.
    stream
        .total_amount
        .checked_mul(i128::from(elapsed)) // total_amount ∈ [0, i128::MAX], elapsed cast is lossless
        .ok_or(Error::Overflow)? // propagate overflow
        .checked_div(i128::from(stream.duration)) // duration > 0 at this point, cast is lossless
        .ok_or(Error::Overflow) // propagate overflow (shouldn't happen for division by non-zero)
}

/// Computes the amount available for withdrawal (vested - already released).
///
/// # Returns
///
/// * `Ok(available)` — non-negative withdrawable amount.
/// * `Err(Error::Overflow)` — if the vested-amount calculation overflows.
pub fn withdrawable(stream: &Stream, now: u64) -> Result<i128, Error> {
    let vested = vested_amount(stream, now)?;
    let available = vested.saturating_sub(stream.released_amount);

    // Defensive clamp to ensure non-negative (should already be guaranteed
    // by saturating_sub, but we keep this for readability).
    Ok(max(0, available))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::StreamStatus;
    use soroban_sdk::{testutils::Address as _, Address};

    /// Helper to create a test stream. Uses a shared `Env` so that
    /// `Address::generate` (which lives in `soroban_sdk::testutils`)
    /// resolves at compile time.
    fn test_stream(
        total_amount: i128,
        released_amount: i128,
        start_time: u64,
        end_time: u64,
    ) -> Stream {
        let env = soroban_sdk::Env::default();
        Stream {
            id: 1,
            sender: Address::generate(&env),
            recipient: Address::generate(&env),
            token: Address::generate(&env),
            total_amount,
            released_amount,
            start_time,
            end_time,
            duration: end_time - start_time,
            last_update: start_time,
            status: StreamStatus::Active,
            pause_time: 0,
            total_paused_duration: 0,
        }
    }

    #[test]
    fn test_vested_amount_at_start() {
        let stream = test_stream(1000, 0, 1000, 2000);
        assert_eq!(vested_amount(&stream, 1000), Ok(0));
    }

    #[test]
    fn test_vested_amount_at_midpoint() {
        let stream = test_stream(1000, 0, 1000, 2000);
        assert_eq!(vested_amount(&stream, 1500), Ok(500));
    }

    #[test]
    fn test_vested_amount_at_end() {
        let stream = test_stream(1000, 0, 1000, 2000);
        assert_eq!(vested_amount(&stream, 2000), Ok(1000));
    }

    #[test]
    fn test_vested_amount_past_end() {
        let stream = test_stream(1000, 0, 1000, 2000);
        assert_eq!(vested_amount(&stream, 3000), Ok(1000));
    }

    #[test]
    fn test_vested_amount_before_start() {
        let stream = test_stream(1000, 0, 1000, 2000);
        assert_eq!(vested_amount(&stream, 500), Ok(0));
    }

    #[test]
    fn test_vested_amount_clamped_to_total() {
        let stream = test_stream(1000, 0, 1000, 2000);
        // Even with very large now, should not exceed total_amount
        assert_eq!(vested_amount(&stream, u64::MAX), Ok(1000));
    }

    #[test]
    fn test_vested_amount_never_negative() {
        let stream = test_stream(1000, 0, 1000, 2000);
        let v0 = vested_amount(&stream, 0).unwrap();
        let v500 = vested_amount(&stream, 500).unwrap();
        let v1000 = vested_amount(&stream, 1000).unwrap();
        assert!(v0 >= 0);
        assert!(v500 >= 0);
        assert!(v1000 >= 0);
    }

    #[test]
    fn test_vested_amount_monotonic() {
        let stream = test_stream(1000, 0, 1000, 2000);
        let v1 = vested_amount(&stream, 1200).unwrap();
        let v2 = vested_amount(&stream, 1400).unwrap();
        let v3 = vested_amount(&stream, 1600).unwrap();
        assert!(v1 <= v2 && v2 <= v3);
    }

    #[test]
    fn test_withdrawable_basic() {
        let stream = test_stream(1000, 200, 1000, 2000);
        assert_eq!(withdrawable(&stream, 1000), Ok(0));
        assert_eq!(withdrawable(&stream, 1500), Ok(300));
        assert_eq!(withdrawable(&stream, 2000), Ok(800));
    }

    #[test]
    fn test_withdrawable_never_negative() {
        let stream = test_stream(1000, 500, 1000, 2000);
        // Even with released_amount > vested, should not be negative
        let w1000 = withdrawable(&stream, 1000).unwrap();
        let w1200 = withdrawable(&stream, 1200).unwrap();
        assert!(w1000 >= 0);
        assert!(w1200 >= 0);
    }

    #[test]
    fn test_withdrawable_fully_withdrawn() {
        let stream = test_stream(1000, 1000, 1000, 2000);
        assert_eq!(withdrawable(&stream, 2000), Ok(0));
    }

    #[test]
    fn test_large_amount_near_i128_max() {
        // Use a large amount that could cause overflow if not using
        // checked arithmetic. We pick a value whose product with the
        // duration still fits in i128: i128::MAX / 1000 ensures
        // amount * duration is well under i128::MAX.
        let large_amount = i128::MAX / 1000;
        let stream = test_stream(large_amount, 0, 1000, 2000);
        let vested = vested_amount(&stream, 1500).unwrap();
        assert!(vested >= 0 && vested <= large_amount);
        assert_eq!(vested, large_amount / 2);
    }

    /// Verify that an extreme `total_amount` whose product with elapsed
    /// overflows `i128` yields `Err(Error::Overflow)` instead of panicking.
    #[test]
    fn test_overflow_propagates_on_extreme_input() {
        let stream = test_stream(i128::MAX, 0, 0, 1000);
        // elapsed = 500, duration = 1000
        // i128::MAX * 500 overflows i128
        let result = vested_amount(&stream, 500);
        assert_eq!(result, Err(Error::Overflow));
    }

    #[test]
    fn test_zero_duration_edge_case() {
        // This should not happen in practice, but we handle it
        // defensively.
        let mut stream = test_stream(1000, 0, 1000, 1000);
        stream.duration = 0;
        assert_eq!(vested_amount(&stream, 1000), Ok(1000));
    }

    #[test]
    fn test_table_driven_vested_amount() {
        // (total, start, end, now, expected)
        let cases: [(i128, u64, u64, u64, i128); 12] = [
            (1000, 1000, 2000, 500, 0),     // before start
            (1000, 1000, 2000, 1000, 0),    // at start
            (1000, 1000, 2000, 1250, 250),  // 25% through
            (1000, 1000, 2000, 1500, 500),  // 50% through
            (1000, 1000, 2000, 1750, 750),  // 75% through
            (1000, 1000, 2000, 2000, 1000), // at end
            (1000, 1000, 2000, 3000, 1000), // past end
            (100, 0, 100, 0, 0),            // zero start time
            (100, 0, 100, 50, 50),          // zero start time, mid
            (100, 0, 100, 100, 100),        // zero start time, at end
            (1, 0, 1, 0, 0),                // minimal duration
            (1, 0, 1, 1, 1),                // minimal duration, at end
        ];

        for case in &cases {
            let stream = test_stream(case.0, 0, case.1, case.2);
            let result = vested_amount(&stream, case.3);
            assert_eq!(
                result,
                Ok(case.4),
                "vested_amount failed: total={}, start={}, end={}, now={}, expected={}, got={:?}",
                case.0,
                case.1,
                case.2,
                case.3,
                case.4,
                result
            );
        }
    }

    #[test]
    fn test_table_driven_withdrawable() {
        // (total, released, start, end, now, expected)
        let cases: [(i128, i128, u64, u64, u64, i128); 6] = [
            (1000, 0, 1000, 2000, 1000, 0),     // nothing vested
            (1000, 0, 1000, 2000, 1500, 500),   // half vested
            (1000, 200, 1000, 2000, 1500, 300), // half vested, some released
            (1000, 500, 1000, 2000, 1500, 0),   // half vested, more released
            (1000, 1000, 1000, 2000, 2000, 0),  // fully released
            (1000, 0, 1000, 2000, 3000, 1000),  // past end, nothing released
        ];

        for case in &cases {
            let stream = test_stream(case.0, case.1, case.2, case.3);
            let result = withdrawable(&stream, case.4);
            assert_eq!(
                result, Ok(case.5),
                "withdrawable failed: total={}, released={}, start={}, end={}, now={}, expected={}, got={:?}",
                case.0, case.1, case.2, case.3, case.4, case.5, result
            );
        }
    }
}
