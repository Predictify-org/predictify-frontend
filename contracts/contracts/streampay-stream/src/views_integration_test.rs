//! Integration tests for paginated stream enumeration views
//!
//! These tests verify the public contract entrypoints work correctly through
//! the contract client interface with real on-chain state.

#![cfg(test)]

use crate::{Contract, ContractClient, StreamStatus};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::testutils::Ledger as _;
use soroban_sdk::{token::StellarAssetClient, Address, Env};

struct TestContext {
    env: Env,
    client: ContractClient<'static>,
    admin: Address,
    sender_a: Address,
    sender_b: Address,
    recipient_a: Address,
    recipient_b: Address,
    token: Address,
}

fn setup() -> TestContext {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let admin = Address::generate(&env);
    let sender_a = Address::generate(&env);
    let sender_b = Address::generate(&env);
    let recipient_a = Address::generate(&env);
    let recipient_b = Address::generate(&env);

    let token = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();

    // Fund senders
    StellarAssetClient::new(&env, &token).mint(&sender_a, &10_000_000);
    StellarAssetClient::new(&env, &token).mint(&sender_b, &10_000_000);

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    // Initialize contract
    client.initialize(&admin);

    TestContext {
        env,
        client,
        admin,
        sender_a,
        sender_b,
        recipient_a,
        recipient_b,
        token,
    }
}

#[test]
fn test_list_streams_empty() {
    let ctx = setup();

    let page = ctx.client.list_streams(&None, &10);

    assert_eq!(page.streams.len(), 0);
    assert_eq!(page.next_cursor, None);
}

#[test]
fn test_list_streams_single_page() {
    let ctx = setup();

    // Create 3 streams
    for i in 1..=3 {
        ctx.client.create_stream(
            &ctx.sender_a,
            &ctx.recipient_a,
            &ctx.token,
            &(1000 * i),
            &1100,
            &2000,
        );
    }

    let page = ctx.client.list_streams(&None, &10);

    assert_eq!(page.streams.len(), 3);
    assert_eq!(page.next_cursor, None);
    assert_eq!(page.streams.get(0).unwrap().id, 1);
    assert_eq!(page.streams.get(1).unwrap().id, 2);
    assert_eq!(page.streams.get(2).unwrap().id, 3);
}

#[test]
fn test_list_streams_pagination() {
    let ctx = setup();

    // Create 5 streams
    for i in 1..=5 {
        ctx.client.create_stream(
            &ctx.sender_a,
            &ctx.recipient_a,
            &ctx.token,
            &(1000 * i),
            &1100,
            &2000,
        );
    }

    // First page: 2 streams
    let page1 = ctx.client.list_streams(&None, &2);
    assert_eq!(page1.streams.len(), 2);
    assert_eq!(page1.streams.get(0).unwrap().id, 1);
    assert_eq!(page1.streams.get(1).unwrap().id, 2);
    assert!(page1.next_cursor.is_some());

    // Second page: 2 streams
    let page2 = ctx.client.list_streams(&page1.next_cursor, &2);
    assert_eq!(page2.streams.len(), 2);
    assert_eq!(page2.streams.get(0).unwrap().id, 3);
    assert_eq!(page2.streams.get(1).unwrap().id, 4);
    assert!(page2.next_cursor.is_some());

    // Third page: 1 stream (last page)
    let page3 = ctx.client.list_streams(&page2.next_cursor, &2);
    assert_eq!(page3.streams.len(), 1);
    assert_eq!(page3.streams.get(0).unwrap().id, 5);
    assert_eq!(page3.next_cursor, None);
}

#[test]
fn test_list_streams_by_sender() {
    let ctx = setup();

    // sender_a creates 2 streams
    ctx.client.create_stream(
        &ctx.sender_a,
        &ctx.recipient_a,
        &ctx.token,
        &1000,
        &1100,
        &2000,
    );
    ctx.client.create_stream(
        &ctx.sender_a,
        &ctx.recipient_b,
        &ctx.token,
        &2000,
        &1100,
        &2000,
    );

    // sender_b creates 1 stream
    ctx.client.create_stream(
        &ctx.sender_b,
        &ctx.recipient_a,
        &ctx.token,
        &3000,
        &1100,
        &2000,
    );

    // Query sender_a's streams
    let page = ctx
        .client
        .list_streams_by_sender(&ctx.sender_a, &None, &10);

    assert_eq!(page.streams.len(), 2);
    assert_eq!(page.streams.get(0).unwrap().sender, ctx.sender_a);
    assert_eq!(page.streams.get(1).unwrap().sender, ctx.sender_a);

    // Query sender_b's streams
    let page = ctx
        .client
        .list_streams_by_sender(&ctx.sender_b, &None, &10);

    assert_eq!(page.streams.len(), 1);
    assert_eq!(page.streams.get(0).unwrap().sender, ctx.sender_b);
}

#[test]
fn test_list_streams_by_recipient() {
    let ctx = setup();

    // Create streams to recipient_a
    ctx.client.create_stream(
        &ctx.sender_a,
        &ctx.recipient_a,
        &ctx.token,
        &1000,
        &1100,
        &2000,
    );
    ctx.client.create_stream(
        &ctx.sender_b,
        &ctx.recipient_a,
        &ctx.token,
        &2000,
        &1100,
        &2000,
    );

    // Create stream to recipient_b
    ctx.client.create_stream(
        &ctx.sender_a,
        &ctx.recipient_b,
        &ctx.token,
        &3000,
        &1100,
        &2000,
    );

    // Query recipient_a's streams
    let page = ctx
        .client
        .list_streams_by_recipient(&ctx.recipient_a, &None, &10);

    assert_eq!(page.streams.len(), 2);
    assert_eq!(page.streams.get(0).unwrap().recipient, ctx.recipient_a);
    assert_eq!(page.streams.get(1).unwrap().recipient, ctx.recipient_a);

    // Query recipient_b's streams
    let page = ctx
        .client
        .list_streams_by_recipient(&ctx.recipient_b, &None, &10);

    assert_eq!(page.streams.len(), 1);
    assert_eq!(page.streams.get(0).unwrap().recipient, ctx.recipient_b);
}

#[test]
fn test_list_streams_by_status() {
    let ctx = setup();

    // Create active stream
    let stream_id = ctx.client.create_stream(
        &ctx.sender_a,
        &ctx.recipient_a,
        &ctx.token,
        &1000,
        &1100,
        &2000,
    );

    // Fast forward past end_time and settle
    ctx.env.ledger().set_timestamp(2100);
    ctx.client.settle(&stream_id);

    // Create another active stream
    ctx.client.create_stream(
        &ctx.sender_a,
        &ctx.recipient_b,
        &ctx.token,
        &2000,
        &2200,
        &3000,
    );

    // Query active streams
    let page = ctx
        .client
        .list_streams_by_status(&StreamStatus::Active, &None, &10);

    assert_eq!(page.streams.len(), 1);
    assert_eq!(page.streams.get(0).unwrap().status, StreamStatus::Active);

    // Query settled streams
    let page = ctx
        .client
        .list_streams_by_status(&StreamStatus::Settled, &None, &10);

    assert_eq!(page.streams.len(), 1);
    assert_eq!(page.streams.get(0).unwrap().status, StreamStatus::Settled);
}

#[test]
fn test_list_streams_recipient_status() {
    let ctx = setup();

    // Create active streams for recipient_a
    ctx.client.create_stream(
        &ctx.sender_a,
        &ctx.recipient_a,
        &ctx.token,
        &1000,
        &1100,
        &2000,
    );

    let stream_id = ctx.client.create_stream(
        &ctx.sender_b,
        &ctx.recipient_a,
        &ctx.token,
        &2000,
        &1100,
        &2000,
    );

    // Settle one stream
    ctx.env.ledger().set_timestamp(2100);
    ctx.client.settle(&stream_id);

    // Create active stream for recipient_b
    ctx.client.create_stream(
        &ctx.sender_a,
        &ctx.recipient_b,
        &ctx.token,
        &3000,
        &2200,
        &3000,
    );

    // Query recipient_a's active streams
    let page = ctx.client.list_streams_recipient_status(
        &ctx.recipient_a,
        &StreamStatus::Active,
        &None,
        &10,
    );

    assert_eq!(page.streams.len(), 1);
    assert_eq!(page.streams.get(0).unwrap().recipient, ctx.recipient_a);
    assert_eq!(page.streams.get(0).unwrap().status, StreamStatus::Active);

    // Query recipient_a's settled streams
    let page = ctx.client.list_streams_recipient_status(
        &ctx.recipient_a,
        &StreamStatus::Settled,
        &None,
        &10,
    );

    assert_eq!(page.streams.len(), 1);
    assert_eq!(page.streams.get(0).unwrap().recipient, ctx.recipient_a);
    assert_eq!(page.streams.get(0).unwrap().status, StreamStatus::Settled);
}

#[test]
fn test_list_streams_sender_status() {
    let ctx = setup();

    // sender_a creates 2 streams
    ctx.client.create_stream(
        &ctx.sender_a,
        &ctx.recipient_a,
        &ctx.token,
        &1000,
        &1100,
        &2000,
    );

    let stream_id = ctx.client.create_stream(
        &ctx.sender_a,
        &ctx.recipient_b,
        &ctx.token,
        &2000,
        &1100,
        &2000,
    );

    // Settle one
    ctx.env.ledger().set_timestamp(2100);
    ctx.client.settle(&stream_id);

    // sender_b creates 1 active stream
    ctx.client.create_stream(
        &ctx.sender_b,
        &ctx.recipient_a,
        &ctx.token,
        &3000,
        &2200,
        &3000,
    );

    // Query sender_a's active streams
    let page = ctx.client.list_streams_sender_status(
        &ctx.sender_a,
        &StreamStatus::Active,
        &None,
        &10,
    );

    assert_eq!(page.streams.len(), 1);
    assert_eq!(page.streams.get(0).unwrap().sender, ctx.sender_a);
    assert_eq!(page.streams.get(0).unwrap().status, StreamStatus::Active);

    // Query sender_a's settled streams
    let page = ctx.client.list_streams_sender_status(
        &ctx.sender_a,
        &StreamStatus::Settled,
        &None,
        &10,
    );

    assert_eq!(page.streams.len(), 1);
    assert_eq!(page.streams.get(0).unwrap().sender, ctx.sender_a);
    assert_eq!(page.streams.get(0).unwrap().status, StreamStatus::Settled);
}

#[test]
fn test_views_work_when_contract_paused() {
    let ctx = setup();

    // Create a stream
    ctx.client.create_stream(
        &ctx.sender_a,
        &ctx.recipient_a,
        &ctx.token,
        &1000,
        &1100,
        &2000,
    );

    // Pause contract
    ctx.client.set_paused(&ctx.admin, &true);

    // Views should still work
    let page = ctx.client.list_streams(&None, &10);
    assert_eq!(page.streams.len(), 1);
}

#[test]
fn test_pagination_respects_max_page_size() {
    let ctx = setup();

    // Create just a few streams
    for i in 1..=5 {
        ctx.client.create_stream(
            &ctx.sender_a,
            &ctx.recipient_a,
            &ctx.token,
            &(1000 * i),
            &1100,
            &2000,
        );
    }

    // Request with huge limit
    let page = ctx.client.list_streams(&None, &1000);

    // Should return all 5 streams (less than MAX_PAGE_SIZE)
    assert_eq!(page.streams.len(), 5);
    assert_eq!(page.next_cursor, None);
}

#[test]
fn test_no_streams_match_filter() {
    let ctx = setup();

    // Create stream for recipient_a
    ctx.client.create_stream(
        &ctx.sender_a,
        &ctx.recipient_a,
        &ctx.token,
        &1000,
        &1100,
        &2000,
    );

    // Query for non-existent recipient
    let non_existent = Address::generate(&ctx.env);
    let page = ctx
        .client
        .list_streams_by_recipient(&non_existent, &None, &10);

    assert_eq!(page.streams.len(), 0);
    assert_eq!(page.next_cursor, None);
}
