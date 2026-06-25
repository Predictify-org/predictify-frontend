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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::StreamStatus;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Address;

    /// Helper to create a test stream
    fn test_stream(
        total_amount: i128,
        released_amount: i128,
        start_time: u64,
        end_time: u64,
    ) -> Stream {
        Stream {
            id: 1,
            sender: Address::generate(&soroban_sdk::Env::default()),
            recipient: Address::generate(&soroban_sdk::Env::default()),
            token: Address::generate(&soroban_sdk::Env::default()),
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
        assert_eq!(vested_amount(&stream, 1000), 0);
    }

    #[test]
    fn test_vested_amount_at_midpoint() {
        let stream = test_stream(1000, 0, 1000, 2000);
        assert_eq!(vested_amount(&stream, 1500), 500);
    }

    #[test]
    fn test_vested_amount_at_end() {
        let stream = test_stream(1000, 0, 1000, 2000);
        assert_eq!(vested_amount(&stream, 2000), 1000);
    }

    #[test]
    fn test_vested_amount_past_end() {
        let stream = test_stream(1000, 0, 1000, 2000);
        assert_eq!(vested_amount(&stream, 3000), 1000);
    }

    #[test]
    fn test_vested_amount_before_start() {
        let stream = test_stream(1000, 0, 1000, 2000);
        assert_eq!(vested_amount(&stream, 500), 0);
    }

    #[test]
    fn test_vested_amount_clamped_to_total() {
        let stream = test_stream(1000, 0, 1000, 2000);
        // Even with very large now, should not exceed total_amount
        assert_eq!(vested_amount(&stream, u64::MAX), 1000);
    }

    #[test]
    fn test_vested_amount_never_negative() {
        let stream = test_stream(1000, 0, 1000, 2000);
        assert!(vested_amount(&stream, 0) >= 0);
        assert!(vested_amount(&stream, 500) >= 0);
        assert!(vested_amount(&stream, 1000) >= 0);
    }

    #[test]
    fn test_vested_amount_monotonic() {
        let stream = test_stream(1000, 0, 1000, 2000);
        let v1 = vested_amount(&stream, 1200);
        let v2 = vested_amount(&stream, 1400);
        let v3 = vested_amount(&stream, 1600);
        assert!(v1 <= v2 && v2 <= v3);
    }

    #[test]
    fn test_withdrawable_basic() {
        let stream = test_stream(1000, 200, 1000, 2000);
        assert_eq!(withdrawable(&stream, 1000), 0);
        assert_eq!(withdrawable(&stream, 1500), 300);
        assert_eq!(withdrawable(&stream, 2000), 800);
    }

    #[test]
    fn test_withdrawable_never_negative() {
        let stream = test_stream(1000, 500, 1000, 2000);
        // Even with released_amount > vested, should not be negative
        assert!(withdrawable(&stream, 1000) >= 0);
        assert!(withdrawable(&stream, 1200) >= 0);
    }

    #[test]
    fn test_withdrawable_fully_withdrawn() {
        let stream = test_stream(1000, 1000, 1000, 2000);
        assert_eq!(withdrawable(&stream, 2000), 0);
    }

    #[test]
    fn test_large_amount_near_i128_max() {
        // Test with a large amount that could cause overflow if not using checked arithmetic
        let large_amount = i128::MAX / 1000;
        let stream = test_stream(large_amount, 0, 1000, 2000);
        let vested = vested_amount(&stream, 1500);
        assert!(vested >= 0 && vested <= large_amount);
        assert_eq!(vested, large_amount / 2);
    }

    #[test]
    fn test_zero_duration_edge_case() {
        // This should not happen in practice, but we handle it defensively
        let mut stream = test_stream(1000, 0, 1000, 1000);
        stream.duration = 0;
        assert_eq!(vested_amount(&stream, 1000), 1000);
    }

    #[test]
    fn test_table_driven_vested_amount() {
        struct TestCase {
            total: i128,
            start: u64,
            end: u64,
            now: u64,
            expected: i128,
        }

        let cases = [
            TestCase { total: 1000, start: 1000, end: 2000, now: 500, expected: 0 },
            TestCase { total: 1000, start: 1000, end: 2000, now: 1000, expected: 0 },
            TestCase { total: 1000, start: 1000, end: 2000, now: 1250, expected: 250 },
            TestCase { total: 1000, start: 1000, end: 2000, now: 1500, expected: 500 },
            TestCase { total: 1000, start: 1000, end: 2000, now: 1750, expected: 750 },
            TestCase { total: 1000, start: 1000, end: 2000, now: 2000, expected: 1000 },
            TestCase { total: 1000, start: 1000, end: 2000, now: 3000, expected: 1000 },
            TestCase { total: 100, start: 0, end: 100, now: 0, expected: 0 },
            TestCase { total: 100, start: 0, end: 100, now: 50, expected: 50 },
            TestCase { total: 100, start: 0, end: 100, now: 100, expected: 100 },
            TestCase { total: 1, start: 0, end: 1, now: 0, expected: 0 },
            TestCase { total: 1, start: 0, end: 1, now: 1, expected: 1 },
        ];

        for case in cases {
            let stream = test_stream(case.total, 0, case.start, case.end);
            let result = vested_amount(&stream, case.now);
            assert_eq!(
                result, case.expected,
                "vested_amount failed: total={}, start={}, end={}, now={}, expected={}, got={}",
                case.total, case.start, case.end, case.now, case.expected, result
            );
        }
    }

    #[test]
    fn test_table_driven_withdrawable() {
        struct TestCase {
            total: i128,
            released: i128,
            start: u64,
            end: u64,
            now: u64,
            expected: i128,
        }

        let cases = [
            TestCase { total: 1000, released: 0, start: 1000, end: 2000, now: 1000, expected: 0 },
            TestCase { total: 1000, released: 0, start: 1000, end: 2000, now: 1500, expected: 500 },
            TestCase { total: 1000, released: 200, start: 1000, end: 2000, now: 1500, expected: 300 },
            TestCase { total: 1000, released: 500, start: 1000, end: 2000, now: 1500, expected: 0 },
            TestCase { total: 1000, released: 1000, start: 1000, end: 2000, now: 2000, expected: 0 },
            TestCase { total: 1000, released: 0, start: 1000, end: 2000, now: 3000, expected: 1000 },
        ];

        for case in cases {
            let stream = test_stream(case.total, case.released, case.start, case.end);
            let result = withdrawable(&stream, case.now);
            assert_eq!(
                result, case.expected,
                "withdrawable failed: total={}, released={}, start={}, end={}, now={}, expected={}, got={}",
                case.total, case.released, case.start, case.end, case.now, case.expected, result
            );
        }
    }
}
