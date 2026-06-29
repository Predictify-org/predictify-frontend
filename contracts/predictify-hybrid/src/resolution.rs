use crate::events::OracleResultEvent;
use crate::oracles::{resolve_with_oracle_chain, OracleConfig};
use serde::{Deserialize, Serialize};

/// Market resolution state.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum MarketStatus {
    /// Market is open for betting.
    Open,
    /// Market is awaiting oracle resolution.
    PendingResolution,
    /// Market has been resolved — exactly one `is_final` event exists.
    Resolved,
    /// Market resolution failed after exhausting all oracle providers.
    Failed,
}

/// Represents a market awaiting or having completed resolution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Market {
    pub id: String,
    pub status: MarketStatus,
    pub resolved_outcome: Option<String>,
}

/// Service for resolving markets via oracle providers.
pub struct ResolutionService;

impl ResolutionService {
    /// Resolve a market using the configured oracle chain.
    ///
    /// # Emission guarantees
    ///
    /// - Each oracle attempt emits exactly one `OracleResultEvent`.
    /// - `attempt` is 0-indexed (primary = 0, first fallback = 1, ...).
    /// - `is_final == true` on exactly one event per resolved market.
    /// - If primary fails and fallback succeeds, two events are emitted:
    ///   `(attempt=0, is_final=false)` and `(attempt=1, is_final=true)`.
    /// - If all oracles fail, the last event carries `is_final=true` with
    ///   an empty outcome, signalling resolution failure.
    ///
    /// # Arguments
    ///
    /// * `market` - The market to resolve (mutated in place on success)
    /// * `oracle_config` - Oracle provider chain configuration
    /// * `tx_hash` - Stellar transaction hash for the resolution
    ///
    /// # Returns
    ///
    /// The list of `OracleResultEvent`s to emit on-chain. The caller
    /// should emit all returned events in order.
    pub async fn resolve_market(
        market: &mut Market,
        oracle_config: &OracleConfig,
        tx_hash: &str,
    ) -> Result<Vec<OracleResultEvent>, ResolutionError> {
        if market.status == MarketStatus::Resolved {
            return Err(ResolutionError::AlreadyResolved(market.id.clone()));
        }

        if market.status == MarketStatus::Failed {
            return Err(ResolutionError::MarketFailed(market.id.clone()));
        }

        market.status = MarketStatus::PendingResolution;

        let events = resolve_with_oracle_chain(oracle_config, &market.id, tx_hash)
            .await
            .map_err(|e| ResolutionError::OracleError(e.to_string()))?;

        // Determine final outcome from the last event
        if let Some(final_event) = events.iter().rev().find(|e| e.is_final) {
            if !final_event.outcome.is_empty() {
                market.status = MarketStatus::Resolved;
                market.resolved_outcome = Some(final_event.outcome.clone());
            } else {
                market.status = MarketStatus::Failed;
            }
        } else {
            // No is_final event — should not happen, but handle gracefully
            market.status = MarketStatus::Failed;
        }

        Ok(events)
    }
}

/// Errors that can occur during market resolution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResolutionError {
    AlreadyResolved(String),
    MarketFailed(String),
    OracleError(String),
}

impl std::fmt::Display for ResolutionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ResolutionError::AlreadyResolved(id) => {
                write!(f, "Market {id} is already resolved")
            }
            ResolutionError::MarketFailed(id) => {
                write!(f, "Market {id} has failed resolution")
            }
            ResolutionError::OracleError(msg) => {
                write!(f, "Oracle error: {msg}")
            }
        }
    }
}

impl std::error::Error for ResolutionError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_market_status_transitions() {
        let mut market = Market {
            id: "test-market".to_string(),
            status: MarketStatus::Open,
            resolved_outcome: None,
        };

        // Verify initial status
        assert_eq!(market.status, MarketStatus::Open);

        // Simulate status transitions
        market.status = MarketStatus::PendingResolution;
        assert_eq!(market.status, MarketStatus::PendingResolution);

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

    #[test]
    fn test_resolution_error_display() {
        let err = ResolutionError::AlreadyResolved("m1".to_string());
        assert!(err.to_string().contains("m1"));

        let err = ResolutionError::MarketFailed("m2".to_string());
        assert!(err.to_string().contains("m2"));

        let err = ResolutionError::OracleError("timeout".to_string());
        assert!(err.to_string().contains("timeout"));
    }

    #[test]
    fn test_market_failed_status() {
        let market = Market {
            id: "m7".to_string(),
            status: MarketStatus::Failed,
            resolved_outcome: None,
        };

        assert_eq!(market.status, MarketStatus::Failed);
        assert!(market.resolved_outcome.is_none());
    }
}
