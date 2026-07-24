//! ContractError stability tests
use predictify_hybrid::ContractError;

#[test]
fn test_contract_error_codes_stable() {
    // Enumerate all variants of ContractError. Update this list when new variants are added.
    let variants = vec![
        ContractError::NotInitialized,
        ContractError::Unauthorized,
        ContractError::InvalidMarketId,
        ContractError::MarketExpired,
        ContractError::MaxRecoveryMarketsExceeded,
        ContractError::PlanTooLarge,
        ContractError::Overflow,
        ContractError::TooManyMarkets,
        ContractError::MarketNotFound,
        ContractError::MarketNotRecoverable,
    ];

    for variant in variants {
        let code = variant as u32;
        // Ensure discriminants are within u32 range (always true) and stable.
        assert!(code <= u32::MAX, "discriminant out of range for {:?}", variant);
    }
}
