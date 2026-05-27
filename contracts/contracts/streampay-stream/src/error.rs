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
