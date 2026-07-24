use predictify_hybrid::audit::{AuditEntry, AuditError, MarketAuditTrail};

#[test]
fn records_entries_per_market_and_preserves_order() {
    let mut trail = MarketAuditTrail::new("market-42".to_string());

    trail.append("created", "oracle", "market opened", 1_700_000_000)
        .expect("first append should succeed");
    trail.append("resolved", "oracle", "final outcome recorded", 1_700_000_100)
        .expect("second append should succeed");

    assert_eq!(trail.market_id(), "market-42");
    assert_eq!(trail.len(), 2);
    assert_eq!(trail.entries()[0].action, "created");
    assert_eq!(trail.entries()[1].action, "resolved");
}

#[test]
fn rejects_invalid_entries_without_required_context() {
    let mut trail = MarketAuditTrail::new("market-7".to_string());

    let invalid_action = trail.append("", "oracle", "missing action", 1_700_000_000);
    let invalid_actor = trail.append("resolved", "", "missing actor", 1_700_000_000);
    let invalid_details = trail.append("resolved", "oracle", "", 1_700_000_000);

    assert!(matches!(invalid_action, Err(AuditError::InvalidEntry { .. })));
    assert!(matches!(invalid_actor, Err(AuditError::InvalidEntry { .. })));
    assert!(matches!(invalid_details, Err(AuditError::InvalidEntry { .. })));
    assert!(trail.is_empty());
}

#[test]
fn serializes_audit_entries_for_off_chain_reads() {
    let entry = AuditEntry::new(
        "market-1".to_string(),
        "resolved".to_string(),
        "oracle".to_string(),
        "final answer captured".to_string(),
        1_700_000_200,
    );

    let json = serde_json::to_string(&entry).expect("entry should serialize");
    let decoded: AuditEntry = serde_json::from_str(&json).expect("entry should deserialize");

    assert_eq!(decoded.market_id, "market-1");
    assert_eq!(decoded.action, "resolved");
    assert_eq!(decoded.details, "final answer captured");
}
