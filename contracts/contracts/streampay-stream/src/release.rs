//! # Linear release/accrual math
//!
//! Pure functions for computing vested amounts in a payment stream using
//! overflow-safe checked arithmetic. The contract uses `overflow-checks = true`,
//! but these functions explicitly use checked operations to guarantee safety
//! and make the invariants clear.
//!
//! ## Math
//!
//! For a stream with:
//! - `total_amount`: total tokens to be streamed
//! - `duration`: length of the stream in seconds
//! - `start_time`: ledger timestamp when streaming begins
//! - `end_time`: ledger timestamp when streaming ends
//!
//! The vested amount at time `now` is:
//!
//! ```text
//! vested = total_amount * elapsed / duration
//! ```
//!
//! where `elapsed = clamp(now, start_time, end_time) - start_time`.
//!
//! This is clamped to `[0, total_amount]` so that:
//! - Before `start_time`: returns 0
//! - At/after `end_time`: returns `total_amount`
//! - In between: linear interpolation
//!
//! ## Overflow safety
//!
//! The multiplication `total_amount * elapsed` could overflow i128 if both
//! are large. We use `checked_mul` and `checked_div` to detect overflow and
//! panic rather than silently wrapping. In production, this would be handled
//! by returning an error, but for the pure math functions we panic to make
//! the invariant violation obvious during testing.

use super::Stream;
use core::cmp::{max, min};

/// Computes the total amount that has vested at a given ledger timestamp.
///
/// This is a pure function that performs linear interpolation based on elapsed
/// time, clamped to the stream's time bounds and total amount.
///
/// # Arguments
///
/// * `stream` - The stream to compute vested amount for
/// * `now` - The current ledger timestamp (seconds since Unix epoch)
///
/// # Returns
///
/// The vested amount as an i128, always in the range `[0, total_amount]`.
///
/// # Formula
///
/// ```text
/// elapsed = clamp(now, start_time, end_time) - start_time
/// vested = total_amount * elapsed / duration
/// ```
///
/// # Clamping behavior
///
/// - If `now < start_time`: returns 0 (stream hasn't started)
/// - If `now >= end_time`: returns `total_amount` (stream fully vested)
/// - Otherwise: returns linear interpolation based on elapsed time
///
/// # Overflow safety
///
/// Uses `checked_mul` and `checked_div` to detect overflow. Panics if overflow
/// would occur, which should never happen with valid stream parameters.
///
/// # Examples
///
/// ```
/// let stream = Stream {
///     total_amount: 1000,
///     start_time: 1000,
///     end_time: 2000,
///     duration: 1000,
///     released_amount: 0,
///     // ... other fields
/// };
///
/// assert_eq!(vested_amount(&stream, 1000), 0);   // at start
/// assert_eq!(vested_amount(&stream, 1500), 500); // halfway
/// assert_eq!(vested_amount(&stream, 2000), 1000); // at end
/// assert_eq!(vested_amount(&stream, 3000), 1000); // past end
/// ```
pub fn vested_amount(stream: &Stream, now: u64) -> i128 {
    // Clamp now to [start_time, end_time]
    let clamped_now = max(stream.start_time, min(now, stream.end_time));
    
    // Compute elapsed time since start
    let elapsed = clamped_now.saturating_sub(stream.start_time);
    
    // Handle edge case: zero duration (should never happen with valid streams)
    if stream.duration == 0 {
        return stream.total_amount;
    }
    
    // Compute vested amount using checked arithmetic
    // vested = total_amount * elapsed / duration
    let total = stream.total_amount;
    let elapsed_i128 = elapsed as i128;
    let duration_i128 = stream.duration as i128;
    
    // Multiply before divide to preserve precision
    let product = total.checked_mul(elapsed_i128)
        .expect("vested_amount: overflow in total_amount * elapsed");
    
    let vested = product.checked_div(duration_i128)
        .expect("vested_amount: overflow in division");
    
    // Clamp to [0, total_amount] as a safety measure
    // (the math should already guarantee this, but we enforce it defensively)
    max(0, min(vested, total))
}

/// Computes the amount available for withdrawal at a given ledger timestamp.
///
/// This is the vested amount minus the amount already released. Never returns
/// a negative value.
///
/// # Arguments
///
/// * `stream` - The stream to compute withdrawable amount for
/// * `now` - The current ledger timestamp (seconds since Unix epoch)
///
/// # Returns
///
/// The withdrawable amount as an i128, always >= 0.
///
/// # Formula
///
/// ```text
/// withdrawable = vested_amount(stream, now) - released_amount
/// ```
///
/// # Invariants
///
/// - Always returns >= 0 (clamped if necessary)
/// - Monotonically non-decreasing as `now` increases (assuming no withdrawals)
/// - At most `total_amount - released_amount`
///
/// # Examples
///
/// ```
/// let stream = Stream {
///     total_amount: 1000,
///     released_amount: 200,
///     start_time: 1000,
///     end_time: 2000,
///     duration: 1000,
///     // ... other fields
/// };
///
/// assert_eq!(withdrawable(&stream, 1000), 0);    // nothing vested yet
/// assert_eq!(withdrawable(&stream, 1500), 300); // 500 vested - 200 released
/// assert_eq!(withdrawable(&stream, 2000), 800); // 1000 vested - 200 released
/// ```
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
    use soroban_sdk::{Address, contracttype};

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
        let large_amount = i128::MAX / 2;
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

        let cases = vec![
            // (total, start, end, now, expected)
            (1000, 1000, 2000, 500, 0),    // before start
            (1000, 1000, 2000, 1000, 0),   // at start
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

        let cases = vec![
            // (total, released, start, end, now, expected)
            (1000, 0, 1000, 2000, 1000, 0),     // nothing vested
            (1000, 0, 1000, 2000, 1500, 500),   // half vested
            (1000, 200, 1000, 2000, 1500, 300), // half vested, some released
            (1000, 500, 1000, 2000, 1500, 0),   // half vested, more released
            (1000, 1000, 1000, 2000, 2000, 0),  // fully released
            (1000, 0, 1000, 2000, 3000, 1000),  // past end, nothing released
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
