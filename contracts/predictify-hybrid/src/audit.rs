use serde::{Deserialize, Serialize};

/// A single audit entry for a market.
///
/// These records are designed for off-chain reads and indexers. They are kept
/// compact and serializable so that a frontend or backend can read them without
/// needing access to contract internals.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AuditEntry {
    /// Market identifier associated with the entry.
    pub market_id: String,
    /// Human-readable action name such as "created" or "resolved".
    pub action: String,
    /// Actor or subsystem that produced the audit event.
    pub actor: String,
    /// Freeform context describing the action.
    pub details: String,
    /// Unix timestamp in seconds when the entry was recorded.
    pub timestamp: u64,
}

impl AuditEntry {
    /// Create a new audit entry.
    pub fn new(
        market_id: String,
        action: String,
        actor: String,
        details: String,
        timestamp: u64,
    ) -> Self {
        Self {
            market_id,
            action,
            actor,
            details,
            timestamp,
        }
    }
}

/// A per-market audit trail stored as an ordered list of entries.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MarketAuditTrail {
    market_id: String,
    entries: Vec<AuditEntry>,
}

impl MarketAuditTrail {
    /// Create an empty audit trail for a single market.
    pub fn new(market_id: String) -> Self {
        Self {
            market_id: market_id.clone(),
            entries: Vec::new(),
        }
    }

    /// Return the market identifier for this trail.
    pub fn market_id(&self) -> &str {
        &self.market_id
    }

    /// Return the ordered entries stored in this trail.
    pub fn entries(&self) -> &[AuditEntry] {
        &self.entries
    }

    /// Append a new audit entry if the supplied metadata is valid.
    pub fn append(
        &mut self,
        action: &str,
        actor: &str,
        details: &str,
        timestamp: u64,
    ) -> Result<(), AuditError> {
        if action.trim().is_empty() || actor.trim().is_empty() || details.trim().is_empty() {
            return Err(AuditError::InvalidEntry {
                market_id: self.market_id.clone(),
                reason: "action, actor, and details must be non-empty".to_string(),
            });
        }

        self.entries.push(AuditEntry::new(
            self.market_id.clone(),
            action.to_string(),
            actor.to_string(),
            details.to_string(),
            timestamp,
        ));

        Ok(())
    }

    /// Return the number of entries in the trail.
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Return true when the trail contains no entries.
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

/// Errors returned while appending to a market audit trail.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AuditError {
    /// The input data is incomplete or invalid.
    InvalidEntry { market_id: String, reason: String },
}

impl std::fmt::Display for AuditError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidEntry { market_id, reason } => {
                write!(f, "invalid audit entry for market {market_id}: {reason}")
            }
        }
    }
}

impl std::error::Error for AuditError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_empty_trail_for_market() {
        let trail = MarketAuditTrail::new("market-a".to_string());
        assert_eq!(trail.market_id(), "market-a");
        assert!(trail.is_empty());
    }

    #[test]
    fn appends_valid_entries() {
        let mut trail = MarketAuditTrail::new("market-b".to_string());
        trail.append("created", "user", "market opened", 1_700_000_000)
            .expect("valid entry should be accepted");

        assert_eq!(trail.len(), 1);
        assert_eq!(trail.entries()[0].action, "created");
    }

    #[test]
    fn rejects_blank_metadata() {
        let mut trail = MarketAuditTrail::new("market-c".to_string());
        let err = trail.append("", "user", "missing action", 1_700_000_000).unwrap_err();

        assert!(matches!(err, AuditError::InvalidEntry { .. }));
    }
}
