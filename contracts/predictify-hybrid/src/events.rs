use serde::{Deserialize, Serialize};

/// Oracle result event emitted when an oracle reports a market outcome.
///
/// Each emission carries a unique `(attempt, is_final)` pair so downstream
/// indexers can distinguish primary vs. fallback attempts and identify the
/// terminal resolution event unambiguously.
///
/// # Disambiguation rules
///
/// | `attempt` | `is_final` | Meaning |
/// |-----------|------------|---------|
/// | 0         | false      | Primary oracle succeeded — result pending fallback confirmation |
/// | 0         | true       | Primary oracle succeeded and is the final resolution |
/// | 1+        | false      | Fallback oracle attempt — result pending confirmation |
/// | 1+        | true       | Fallback oracle succeeded — this is the terminal resolution |
///
/// Indexers should filter on `is_final == true` to count exactly one
/// resolution event per market.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OracleResultEvent {
    /// Unique market identifier.
    pub market_id: String,

    /// Oracle provider that produced this result (e.g. "chainlink", "switchboard").
    pub oracle_provider: String,

    /// Sequential attempt number starting at 0 for the primary oracle.
    /// Increments for each fallback provider tried.
    pub attempt: u32,

    /// Whether this event represents the final, settled resolution for the market.
    /// Exactly one event per resolved market must carry `is_final == true`.
    pub is_final: bool,

    /// The resolved outcome value (e.g. price, boolean, enum).
    pub outcome: String,

    /// Unix timestamp (seconds) when the oracle reported.
    pub reported_at: u64,

    /// Stellar transaction hash that emitted this event.
    pub tx_hash: String,
}

impl OracleResultEvent {
    /// Create a new oracle result event.
    ///
    /// # Arguments
    ///
    /// * `market_id` - The market being resolved
    /// * `oracle_provider` - Which oracle produced the result
    /// * `attempt` - 0 for primary, 1+ for fallbacks
    /// * `is_final` - `true` if this is the terminal resolution
    /// * `outcome` - The resolved value
    /// * `reported_at` - Unix timestamp
    /// * `tx_hash` - Transaction hash
    pub fn new(
        market_id: String,
        oracle_provider: String,
        attempt: u32,
        is_final: bool,
        outcome: String,
        reported_at: u64,
        tx_hash: String,
    ) -> Self {
        Self {
            market_id,
            oracle_provider,
            attempt,
            is_final,
            outcome,
            reported_at,
            tx_hash,
        }
    }
}

/// Errors that can occur when constructing or emitting events.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventError {
    Serialization(String),
    Emission(String),
}

impl std::fmt::Display for EventError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EventError::Serialization(msg) => write!(f, "Event serialization failed: {msg}"),
            EventError::Emission(msg) => write!(f, "Event emission failed: {msg}"),
        }
    }
}

impl std::error::Error for EventError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_oracle_result_event_creation() {
        let event = OracleResultEvent::new(
            "market-001".to_string(),
            "chainlink".to_string(),
            0,
            true,
            "1234.56".to_string(),
            1700000000,
            "tx-hash-abc".to_string(),
        );

        assert_eq!(event.market_id, "market-001");
        assert_eq!(event.oracle_provider, "chainlink");
        assert_eq!(event.attempt, 0);
        assert!(event.is_final);
        assert_eq!(event.outcome, "1234.56");
    }

    #[test]
    fn test_primary_vs_fallback_disambiguation() {
        let primary = OracleResultEvent::new(
            "market-001".to_string(),
            "chainlink".to_string(),
            0,
            false,
            "1234.56".to_string(),
            1700000000,
            "tx-primary".to_string(),
        );

        let fallback = OracleResultEvent::new(
            "market-001".to_string(),
            "switchboard".to_string(),
            1,
            true,
            "1235.00".to_string(),
            1700000060,
            "tx-fallback".to_string(),
        );

        // Same market, different attempt numbers
        assert_eq!(primary.market_id, fallback.market_id);
        assert_ne!(primary.attempt, fallback.attempt);

        // Only fallback is final
        assert!(!primary.is_final);
        assert!(fallback.is_final);
    }

    #[test]
    fn test_serialization_roundtrip() {
        let event = OracleResultEvent::new(
            "market-002".to_string(),
            "switchboard".to_string(),
            1,
            true,
            "yes".to_string(),
            1700000120,
            "tx-hash-xyz".to_string(),
        );

        let json = serde_json::to_string(&event).expect("serialization should succeed");
        let deserialized: OracleResultEvent =
            serde_json::from_str(&json).expect("deserialization should succeed");

        assert_eq!(event, deserialized);
    }

    #[test]
    fn test_event_error_display() {
        let err = EventError::Serialization("bad data".to_string());
        assert!(err.to_string().contains("bad data"));

        let err = EventError::Emission("network error".to_string());
        assert!(err.to_string().contains("network error"));
    }
}
