#![no_main]
use libfuzzer_sys::fuzz_target;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::StellarAssetClient,
    Address, Env,
};
use streampay_stream::{Contract, ContractClient};

fuzz_target!(|data: &[u8]| {
    if data.len() < 32 {
        return;
    }

    // Unpack inputs from raw fuzzed bytes
    let total_amount = i128::from_le_bytes(data[0..16].try_into().unwrap());
    let start_time = u64::from_le_bytes(data[16..24].try_into().unwrap());
    let end_time = u64::from_le_bytes(data[24..32].try_into().unwrap());

    // Setup Soroban environment
    let env = Env::default();
    env.mock_all_auths();
    // Default ledger timestamp set to 1,000 (standard for tests)
    env.ledger().set_timestamp(1_000);

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    // Initialize the contract admin state
    if client.try_initialize(&admin).is_ok() {
        // Register token and mint some initial tokens to sender
        let token = env
            .register_stellar_asset_contract_v2(admin.clone())
            .address();

        // Mint a standard balance (10,000,000,000) to sender
        StellarAssetClient::new(&env, &token).mint(&sender, &10_000_000_000);

        // Call try_create_stream to ensure that no inputs can trigger a panic in the fuzzer.
        // Instead, bad inputs must return a typed Error or Soroban SDK invocation error.
        let _ = client.try_create_stream(
            &sender,
            &recipient,
            &token,
            &total_amount,
            &start_time,
            &end_time,
        );
    }
});
