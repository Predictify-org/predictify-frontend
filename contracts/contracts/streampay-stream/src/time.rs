//! Checked time arithmetic helpers for streampay-stream.
//!
//! All operations return typed `Error::InvalidTimeRange` on overflow or
//! invalid arguments. This centralises time math and avoids ad-hoc
//! subtraction/addition spread across the codebase.

use core::cmp::{max, min};
use super::error::Error;
use super::storage::StreamStatus;

/// Add seconds to a base timestamp with overflow checking.
pub fn add_seconds_checked(base: u64, seconds: u64) -> Result<u64, Error> {
    base.checked_add(seconds).ok_or(Error::InvalidTimeRange)
}

/// Subtract seconds with checking (a - b).
pub fn sub_checked(a: u64, b: u64) -> Result<u64, Error> {
    a.checked_sub(b).ok_or(Error::InvalidTimeRange)
}

/// Compute the duration between `start` and `end` (end - start) safely.
pub fn duration_checked(start: u64, end: u64) -> Result<u64, Error> {
    end.checked_sub(start).ok_or(Error::InvalidTimeRange)
}

/// Compute elapsed seconds since `start` at ledger time `now`, clamped to
/// [start, end] and excluding `total_paused_duration`. If the stream is
/// currently paused, accrual is capped at `pause_time`.
pub fn elapsed_checked(
    now: u64,
    start: u64,
    end: u64,
    total_paused_duration: u64,
    pause_time: u64,
    status: StreamStatus,
) -> Result<u64, Error> {
    // Clamp now to [start, end]
    let mut effective_now = max(start, min(now, end));

    // If paused, accrual stops at pause_time
    if status == StreamStatus::Paused {
        effective_now = min(effective_now, pause_time);
    }

    // elapsed = effective_now - start - total_paused_duration
    let since_start = effective_now.checked_sub(start).ok_or(Error::InvalidTimeRange)?;
    let elapsed = since_start.checked_sub(total_paused_duration).ok_or(Error::InvalidTimeRange)?;
    Ok(elapsed)
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::StreamStatus;

    #[test]
    fn add_seconds_basic() {
        assert_eq!(add_seconds_checked(10, 5).unwrap(), 15);
    }

    #[test]
    fn add_seconds_overflow() {
        assert!(add_seconds_checked(u64::MAX - 1, 10).is_err());
    }

    #[test]
    fn duration_basic() {
        assert_eq!(duration_checked(100, 200).unwrap(), 100);
    }

    #[test]
    fn duration_underflow() {
        assert!(duration_checked(200, 100).is_err());
    }

    #[test]
    fn elapsed_normal_and_paused() {
        // normal running
        let e = elapsed_checked(150, 100, 200, 0, 0, StreamStatus::Active).unwrap();
        assert_eq!(e, 50);

        // paused caps at pause_time
        let e2 = elapsed_checked(170, 100, 300, 0, 160, StreamStatus::Paused).unwrap();
        // effective_now = min(170, pause_time=160) => 160; elapsed = 60
        assert_eq!(e2, 60);
    }
}
