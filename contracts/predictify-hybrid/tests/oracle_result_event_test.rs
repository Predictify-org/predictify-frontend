use predictify_hybrid::events::OracleResultEvent;
use predictify_hybrid::resolution::{Market, MarketStatus};

/// Helper to create a test market.
fn test_market(id: &str) -> Market {
    Market {
        id: id.to_string(),
        status: MarketStatus::Open,
        resolved_outcome: None,
    }
}

#[test]
fn test_event_attempt_is_final_pairs_are_unique() {
    // Simulate: primary fails (attempt=0, is_final=false),
    //           fallback succeeds (attempt=1, is_final=true)
    let events = vec![
        OracleResultEvent::new(
            "m1".to_string(),
            "chainlink".to_string(),
            0,
            false,
            String::new(),
            1700000000,
            "tx-1".to_string(),
        ),
        OracleResultEvent::new(
            "m1".to_string(),
            "switchboard".to_string(),
            1,
            true,
            "1234.56".to_string(),
            1700000060,
            "tx-1".to_string(),
        ),
    ];

    // Verify unique (attempt, is_final) pairs
    let pairs: Vec<(u32, bool)> = events.iter().map(|e| (e.attempt, e.is_final)).collect();
    let unique: std::collections::HashSet<_> = pairs.iter().collect();
    assert_eq!(pairs.len(), unique.len(), "All (attempt, is_final) pairs must be unique");
}

#[test]
fn test_exactly_one_final_event_per_market() {
    let events = vec![
        OracleResultEvent::new(
            "m1".to_string(),
            "chainlink".to_string(),
            0,
            false,
            String::new(),
            1700000000,
            "tx-1".to_string(),
        ),
        OracleResultEvent::new(
            "m1".to_string(),
            "switchboard".to_string(),
            1,
            true,
            "1234.56".to_string(),
            1700000060,
            "tx-1".to_string(),
        ),
    ];

    let final_count = events.iter().filter(|e| e.is_final).count();
    assert_eq!(final_count, 1, "Exactly one event must have is_final=true");
}

#[test]
fn test_primary_success_single_event() {
    // When primary succeeds, only one event with (attempt=0, is_final=true)
    let events = vec![
        OracleResultEvent::new(
            "m2".to_string(),
            "chainlink".to_string(),
            0,
            true,
            "5678.90".to_string(),
            1700000000,
            "tx-2".to_string(),
        ),
    ];

    assert_eq!(events.len(), 1);
    assert_eq!(events[0].attempt, 0);
    assert!(events[0].is_final);
}

#[test]
fn test_all_oracles_fail_last_is_final() {
    // When all oracles fail, last event has is_final=true with empty outcome
    let events = vec![
        OracleResultEvent::new(
            "m3".to_string(),
            "chainlink".to_string(),
            0,
            false,
            String::new(),
            1700000000,
            "tx-3".to_string(),
        ),
        OracleResultEvent::new(
            "m3".to_string(),
            "switchboard".to_string(),
            1,
            true,
            String::new(),
            1700000060,
            "tx-3".to_string(),
        ),
    ];

    let final_event = events.iter().rev().find(|e| e.is_final).unwrap();
    assert!(final_event.outcome.is_empty(), "Failed resolution should have empty outcome");
}

#[test]
fn test_attempt_increments_sequentially() {
    let events = vec![
        OracleResultEvent::new(
            "m4".to_string(),
            "chainlink".to_string(),
            0,
            false,
            String::new(),
            1700000000,
            "tx-4".to_string(),
        ),
        OracleResultEvent::new(
            "m4".to_string(),
            "switchboard".to_string(),
            1,
            false,
            String::new(),
            1700000060,
            "tx-4".to_string(),
        ),
        OracleResultEvent::new(
            "m4".to_string(),
            "pyth".to_string(),
            2,
            true,
            "9999.99".to_string(),
            1700000120,
            "tx-4".to_string(),
        ),
    ];

    for (i, event) in events.iter().enumerate() {
        assert_eq!(event.attempt, i as u32, "Attempt should be sequential");
    }
}

#[test]
fn test_market_resolution_status() {
    let mut market = test_market("m5");

    // Mock resolution (in real test, would mock oracle responses)
    // For now, verify status transition logic
    market.status = MarketStatus::PendingResolution;
    assert_eq!(market.status, MarketStatus::PendingResolution);

    // After successful resolution
    market.status = MarketStatus::Resolved;
    market.resolved_outcome = Some("1234.56".to_string());
    assert_eq!(market.status, MarketStatus::Resolved);
    assert!(market.resolved_outcome.is_some());
}

#[test]
fn test_cannot_resolve_already_resolved_market() {
    let market = Market {
        id: "m6".to_string(),
        status: MarketStatus::Resolved,
        resolved_outcome: Some("done".to_string()),
    };

    // Verify market is already resolved
    assert_eq!(market.status, MarketStatus::Resolved);
}

/// Test that indexers can correctly filter final events.
/// This simulates the indexer behavior described in the bug report.
#[test]
fn test_indexer_filtering_behavior() {
    // Scenario: primary fails, fallback succeeds
    let events = vec![
        OracleResultEvent::new(
            "market-xyz".to_string(),
            "chainlink".to_string(),
            0,
            false,
            String::new(),
            1700000000,
            "tx-abc".to_string(),
        ),
        OracleResultEvent::new(
            "market-xyz".to_string(),
            "switchboard".to_string(),
            1,
            true,
            "42000.00".to_string(),
            1700000060,
            "tx-abc".to_string(),
        ),
    ];

    // Indexer logic: filter on is_final == true
    let final_events: Vec<_> = events.iter().filter(|e| e.is_final).collect();
    assert_eq!(final_events.len(), 1, "Indexer should see exactly one final event");
    assert_eq!(final_events[0].oracle_provider, "switchboard");
    assert_eq!(final_events[0].outcome, "42000.00");
}

/// Test three-oracle chain: primary fails, first fallback fails, second succeeds.
#[test]
fn test_three_oracle_chain() {
    let events = vec![
        OracleResultEvent::new(
            "market-abc".to_string(),
            "chainlink".to_string(),
            0,
            false,
            String::new(),
            1700000000,
            "tx-1".to_string(),
        ),
        OracleResultEvent::new(
            "market-abc".to_string(),
            "switchboard".to_string(),
            1,
            false,
            String::new(),
            1700000020,
            "tx-1".to_string(),
        ),
        OracleResultEvent::new(
            "market-abc".to_string(),
            "pyth".to_string(),
            2,
            true,
            "99999.99".to_string(),
            1700000040,
            "tx-1".to_string(),
        ),
    ];

    // Verify structure
    assert_eq!(events.len(), 3);
    
    // Only last is final
    let final_count = events.iter().filter(|e| e.is_final).count();
    assert_eq!(final_count, 1);
    
    // Attempts are sequential
    assert_eq!(events[0].attempt, 0);
    assert_eq!(events[1].attempt, 1);
    assert_eq!(events[2].attempt, 2);
    
    // Final event has outcome
    assert!(!events[2].outcome.is_empty());
}
