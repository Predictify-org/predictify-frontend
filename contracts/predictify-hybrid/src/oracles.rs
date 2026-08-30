use crate::events::{EventError, OracleResultEvent};
use serde::{Deserialize, Serialize};

/// Supported oracle providers.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum OracleProvider {
    Chainlink,
    Switchboard,
    Pyth,
}

impl OracleProvider {
    /// Human-readable name for logging and events.
    pub fn name(&self) -> &str {
        match self {
            OracleProvider::Chainlink => "chainlink",
            OracleProvider::Switchboard => "switchboard",
            OracleProvider::Pyth => "pyth",
        }
    }
}

/// Configuration for oracle resolution order.
pub struct OracleConfig {
    /// Primary oracle provider.
    pub primary: OracleProvider,
    /// Ordered list of fallback providers (tried in sequence on failure).
    pub fallbacks: Vec<OracleProvider>,
}

impl OracleConfig {
    /// Build a resolution chain: primary + fallbacks.
    pub fn resolution_chain(&self) -> Vec<&OracleProvider> {
        let mut chain = vec![&self.primary];
        chain.extend(self.fallbacks.iter());
        chain
    }
}

/// Result of querying a single oracle.
#[derive(Debug, Clone)]
pub struct OracleResponse {
    pub provider: OracleProvider,
    pub outcome: Option<String>,
    pub success: bool,
    pub error: Option<String>,
}

/// Query an oracle provider for a market outcome.
///
/// In production this would call the actual oracle contract/API.
/// This implementation simulates the call for testing purposes.
pub async fn query_oracle(
    provider: &OracleProvider,
    market_id: &str,
) -> OracleResponse {
    // Placeholder: in production, dispatch to the real oracle SDK
    tracing::info!(
        oracle = provider.name(),
        market_id,
        "Querying oracle"
    );

    OracleResponse {
        provider: provider.clone(),
        outcome: None,
        success: false,
        error: Some("Oracle query not implemented".to_string()),
    }
}

/// Resolve a market using the configured oracle chain.
///
/// Returns a vector of `OracleResultEvent`s — one per attempt. The caller
/// (typically `resolution.rs`) is responsible for emitting these on-chain.
///
/// # Emission semantics
///
/// - Each attempt produces exactly one event.
/// - `is_final` is `true` only on the last event in the chain (whether
///   success or exhausted fallbacks).
/// - `attempt` is 0-indexed (primary = 0, first fallback = 1, etc.).
pub async fn resolve_with_oracle_chain(
    config: &OracleConfig,
    market_id: &str,
    tx_hash: &str,
) -> Result<Vec<OracleResultEvent>, EventError> {
    let chain = config.resolution_chain();
    let mut events = Vec::new();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| EventError::Emission(e.to_string()))?
        .as_secs();

    for (attempt, provider) in chain.iter().enumerate() {
        let response = query_oracle(provider, market_id).await;

        let is_final = if response.success {
            // Successful oracle — this is the terminal event
            true
        } else {
            // Failed — is_final only if this was the last provider in the chain
            attempt == chain.len() - 1
        };

        let outcome = response.outcome.unwrap_or_default();

        let event = OracleResultEvent::new(
            market_id.to_string(),
            provider.name().to_string(),
            attempt as u32,
            is_final,
            outcome,
            now,
            tx_hash.to_string(),
        );

        events.push(event);

        // Stop after first success (or after exhausting all providers)
        if response.success {
            break;
        }
    }

    Ok(events)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_oracle_provider_names() {
        assert_eq!(OracleProvider::Chainlink.name(), "chainlink");
        assert_eq!(OracleProvider::Switchboard.name(), "switchboard");
        assert_eq!(OracleProvider::Pyth.name(), "pyth");
    }

    #[test]
    fn test_resolution_chain_order() {
        let config = OracleConfig {
            primary: OracleProvider::Chainlink,
            fallbacks: vec![OracleProvider::Switchboard, OracleProvider::Pyth],
        };

        let chain = config.resolution_chain();
        assert_eq!(chain.len(), 3);
        assert_eq!(chain[0], &OracleProvider::Chainlink);
        assert_eq!(chain[1], &OracleProvider::Switchboard);
        assert_eq!(chain[2], &OracleProvider::Pyth);
    }

    #[test]
    fn test_resolution_chain_single_primary() {
        let config = OracleConfig {
            primary: OracleProvider::Chainlink,
            fallbacks: vec![],
        };

        let chain = config.resolution_chain();
        assert_eq!(chain.len(), 1);
    }
}
