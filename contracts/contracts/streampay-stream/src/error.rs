//! # Contract error codes
//!
//! Every error returned by the StreamPay contract is one of the
//! discriminants in [`Error`]. The backend maps these codes one-to-one
//! into the public Problem+JSON error envelope, so:
//!
//! - **Discriminants are part of the public contract API.** Do not
//!   reuse a discriminant after it has shipped; add new variants at
//!   the end of the enum instead.
//! - **Variant names are not part of the API.** Renaming a variant is
//!   safe as long as the numeric discriminant stays stable.
//! - **Backend mapping** lives in `app/lib/errors/`. Adding a new
//!   variant here requires a matching entry there.

use soroban_sdk::contracterror;

/// Stable StreamPay contract error codes for backend Problem+JSON mapping.
///
/// Discriminants are part of the public contract API and must not be reused.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// 1: Requested stream or storage record was not found.
    NotFound = 1,
    /// 2: Caller is not authorized for the requested operation.
    Unauthorized = 2,
    /// 3: Contract-level pause guard blocked the operation.
    ContractPaused = 3,
    /// 4: Amount is zero, negative, or otherwise invalid.
    InvalidAmount = 4,
    /// 5: Time range or duration is invalid.
    InvalidTimeRange = 5,
    /// 6: Stream state does not allow the requested transition.
    InvalidState = 6,
    /// 7: Withdrawal exceeds currently accrued funds.
    OverWithdraw = 7,
    /// 8: Stream has already been fully settled.
    AlreadySettled = 8,
    /// 9: Token is not allowed for streaming.
    TokenNotAllowed = 9,
}
