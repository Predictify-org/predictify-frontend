# Privacy & PII Handling

This document outlines StreamPay's PII retention policies, Data Subject Request (DSR) procedures, and data masking strategies.

## PII Inventory

The following fields are identified as PII and are subject to retention and deletion policies:

### Stream Records
- `email`: Recipient or contact email.
- `label`: User-defined name for the stream.
- `memo`: Transaction-specific notes.
- `partnerId`: External identifier for business partners.

### User Records
- `wallet_address`: Unique identifier for the user's wallet.
- `email`: User's registered email address.
- `display_name`: Human-readable name.

## Retention Policy

- **Legal/Audit Requirement**: Aggregate data (Stream ID, amounts, status, timestamps) must be retained for **7 years**.
- **PII Scrubbing**: All PII fields are permanently scrubbed from the database after a deletion request is processed.
- **Backups**: Backup rotation follows the primary database scrubbing (PII is aged out of backups according to our standard backup lifecycle).

## DSR Fulfillment (Account Deletion)

### API Endpoint
`DELETE /api/v1/identity/me/delete`

### Process
1. **Request Received**: User triggers deletion via the API.
2. **Identification**: System identifies all streams and records associated with the user's `wallet_address` or `email`.
3. **Scrubbing**: PII fields are set to `undefined` or `null`. Original records remain for audit purposes but are "de-identified".
4. **Completion**: Deletion is guaranteed within **30 days** (202 Accepted returned initially).

## Data Masking & Redaction

- **Role-Based Access**:
  - `admin`: Full visibility of PII for support and debugging.
  - `user`: Masked PII (e.g., `e***l@example.com`) and redacted labels.
- **Exports**: All data exports redact PII by default unless explicitly requested with administrative privileges.

## Privacy Review Notes

- **Aggregates Only**: We do not store "orphaned" PII. Once the user record is deleted, the remaining stream data is strictly for accounting and cannot be re-linked to a natural person.
- **Idempotency**: Deletion requests are idempotent to prevent errors during repeated attempts.
- **No Substitute for On-Chain Privacy**: Note that on-chain transaction data (hashes, public keys) is immutable and outside the scope of this DSR fulfillment.
