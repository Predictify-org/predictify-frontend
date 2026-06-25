# Webhook Delivery with Exponential Backoff and DLQ

## Overview

StreamPay implements **at-least-once** webhook delivery with exponential backoff, jitter, idempotent delivery IDs, and Dead Letter Queue (DLQ) handling. This ensures events are reliably delivered to customer endpoints even in the face of transient failures, while preventing event loss.

## Delivery Guarantees

### At-Least-Once Semantics

StreamPay webhooks use **at-least-once** delivery, not exactly-once. This means:
- Events will be delivered at least once (possibly multiple times)
- Customers MUST implement idempotency deduplication using the `X-StreamPay-Delivery-Id` header
- The delivery ID is immutable across all retry attempts for the same event

### Success Criteria

A webhook delivery is considered successful when the endpoint responds with:
- **2xx status code** (200-299)
- **Minimum requirement**: HTTP 200 OK

### Retry Behavior

Webhooks are retried on:
- **5xx errors** (500-599): Server errors
- **408 Request Timeout**: Client timeout
- **429 Too Many Requests**: Rate limiting
- **Network timeouts**: Connection failures, DNS errors

Webhooks are **NOT retried** on:
- **2xx success**: Delivery complete
- **4xx errors** (except 408, 429): Client errors (400, 401, 403, 404, etc.)

## Exponential Backoff Strategy

### Delay Calculation

```
delay = min(initialDelay * (backoffMultiplier ^ attemptNumber) + jitter, maxDelay)
```

### Default Configuration

| Parameter | Value | Notes |
|-----------|-------|-------|
| Initial Delay | 1 second | First retry after 1s |
| Max Delay | 1 hour | Longest wait between retries |
| Max Retries | 10 attempts | Total delivery attempts |
| Jitter Factor | 20% | Prevents thundering herd |
| Backoff Multiplier | 2x | Exponential growth |

### Retry Schedule Example

For a failed webhook event:

| Attempt | Delay | Status | Action |
|---------|-------|--------|--------|
| 1 | Immediate | 503 | Fail, schedule retry |
| 2 | ~1.0-1.2s | 503 | Fail, schedule retry |
| 3 | ~2.0-2.4s | 503 | Fail, schedule retry |
| 4 | ~4.0-4.8s | 503 | Fail, schedule retry |
| 5 | ~8.0-9.6s | 503 | Fail, schedule retry |
| 6 | ~16.0-19.2s | 503 | Fail, schedule retry |
| 7 | ~32.0-38.4s | 503 | Fail, schedule retry |
| 8 | ~64.0-76.8s | 503 | Fail, schedule retry |
| 9 | ~128.0-153.6s | 503 | Fail, schedule retry |
| 10 | ~256.0-307.2s | 503 | Fail → **DLQ** |

**Total time to exhaustion**: ~14-18 minutes

### Jitter Purpose

Jitter (randomization) serves two purposes:
1. **Prevents thundering herd**: If many webhooks fail simultaneously, jitter spreads their retries across time
2. **Avoids retry storms**: Coordinated retries would overwhelm a recovering service

## Idempotent Delivery IDs

Every webhook delivery receives a unique, immutable **delivery ID** that persists across all retry attempts:

```
X-StreamPay-Delivery-Id: dlv_1c7f5k9q2m8x3d5p
```

### Customer Deduplication Requirement

**Critical**: Customers MUST deduplicate webhooks using this header. StreamPay will retry failed events, potentially sending the same event multiple times.

Example deduplication (pseudocode):
```python
def handle_webhook(request):
    delivery_id = request.headers['X-StreamPay-Delivery-Id']
    
    # Check if we've already processed this delivery
    if is_processed(delivery_id):
        return 200  # Idempotent success
    
    # Process the event
    process_event(request.body)
    
    # Mark as processed
    mark_processed(delivery_id)
    
    return 200
```

## HMAC-SHA256 Signature

Every webhook is signed with **HMAC-SHA256** to prevent tampering and verify authenticity.

### Signature Header Format

```
X-StreamPay-Signature: t=<timestamp>,id=<delivery-id>,v1=<signature>
```

### Signature Calculation

The signature covers the event timestamp, delivery ID, and payload:

```
signableContent = "${timestamp}.${deliveryId}.${payload}"
signature = HMAC-SHA256(secret, signableContent)
```

### Per-Attempt Signatures

**Important**: Each retry attempt generates a **new signature** because:
- Timestamp changes: Retries occur at different times
- Delivery ID remains the same: For idempotency
- Payload remains the same: Event data doesn't change

```
Attempt 1: t=1700000000,id=dlv_123,v1=abc123...
Attempt 2: t=1700000062,id=dlv_123,v1=def456...  ← Different signature (timestamp changed)
Attempt 3: t=1700000128,id=dlv_123,v1=ghi789...  ← Different signature (timestamp changed)
```

### Verification Example

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  secret: string,
  signatureHeader: string,
  timestamp: string,
  deliveryId: string
): boolean {
  // Parse header
  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  // Verify timestamp freshness (5 minute tolerance)
  const requestTime = parseInt(parts.t, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - requestTime) > 300) {
    throw new Error('Signature timestamp too old');
  }

  // Recreate signature
  const signableContent = `${timestamp}.${deliveryId}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signableContent)
    .digest('hex');

  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(parts.v1, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

## Circuit Breaker Pattern

To prevent cascading failures when an endpoint is permanently unavailable, StreamPay implements a **circuit breaker** per endpoint:

### States

| State | Condition | Behavior |
|-------|-----------|----------|
| **Closed** (normal) | Healthy endpoint | Retries happen normally |
| **Open** | 5+ consecutive failures | New deliveries immediately fail and move to DLQ |
| **Half-Open** | Timeout expired (5 min) | Next delivery attempts to recover the endpoint |

### Benefits

- Reduces wasted retry attempts to a broken endpoint
- Allows failed endpoints to recover without retry spam
- Improves resource efficiency

## Dead Letter Queue (DLQ)

When a webhook exhausts all retries (10 attempts over ~18 minutes), it moves to the DLQ.

### DLQ Entry Contents

Each DLQ entry contains:
- **Delivery ID**: Immutable ID for the failed delivery
- **Endpoint**: URL that failed
- **Event**: Full event payload
- **Failure Reason**: Why it was moved to DLQ
- **Last Attempt**: Status code, timestamp, and error message
- **Timestamp**: When the entry was created

### DLQ Management

**StreamPay Responsibilities**:
- ✅ Stores failed deliveries in DLQ with full metadata
- ✅ Provides API to query DLQ entries
- ✅ Logs all DLQ movements for audit trails
- ✅ Implements retention policy (see Retention below)

**Customer Responsibilities**:
- ✅ Monitor their endpoint logs and alerts
- ✅ Check DLQ when suspicious
- ✅ Implement manual retry mechanisms if needed
- ✅ Fix endpoint issues and request manual replay

### Querying DLQ

```bash
# Get all DLQ entries
GET /api/webhooks/dlq

# Get DLQ entries since a timestamp
GET /api/webhooks/dlq?since=2024-01-15T10:00:00Z

# Example response
{
  "data": [
    {
      "dlqId": "dlq_abc123",
      "deliveryId": "dlv_123",
      "endpointId": "ep_456",
      "endpointUrl": "https://customer.example.com/webhooks",
      "eventId": "evt_789",
      "eventType": "stream.settled",
      "reason": "Max retries (10) exceeded: HTTP 503",
      "lastAttempt": {
        "attemptNumber": 10,
        "statusCode": 503,
        "error": "Service Unavailable",
        "timestamp": "2024-01-15T10:15:32Z"
      },
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "count": 1
  }
}
```

## Observability

### Webhook Headers (Request)

All webhook requests include these headers for tracing:

```
X-StreamPay-Delivery-Id: dlv_abc123              # Idempotent delivery ID
X-StreamPay-Event-Id: evt_def456                 # Event ID
X-StreamPay-Event-Type: stream.settled           # Event type
X-StreamPay-Timestamp: 1700000000                # Unix timestamp
X-StreamPay-Attempt: 3                           # Attempt number (1, 2, 3, ...)
X-StreamPay-Signature: t=...,id=...,v1=...      # HMAC signature
```

### Delivery Status Tracking

Query delivery status:

```bash
# Get all deliveries
GET /api/webhooks/deliveries

# Filter by status (pending, delivered, failed, dlq)
GET /api/webhooks/deliveries?status=dlq

# Filter by endpoint
GET /api/webhooks/deliveries?endpoint_id=ep_123

# Example response
{
  "data": [
    {
      "deliveryId": "dlv_123",
      "endpointUrl": "https://customer.example.com/webhooks",
      "status": "delivered",
      "attempts": 2,
      "createdAt": "2024-01-15T10:00:00Z",
      "finalizedAt": "2024-01-15T10:00:32Z"
    }
  ],
  "pagination": {
    "total": 1,
    "count": 1
  }
}
```

### Structured Logging

All webhook operations are logged with full correlation context:

```json
{
  "level": "info",
  "message": "Webhook delivery attempt completed",
  "delivery_id": "dlv_123",
  "endpoint_id": "ep_456",
  "endpoint_url": "https://customer.example.com/webhooks",
  "event_id": "evt_789",
  "event_type": "stream.settled",
  "attempt": 3,
  "status_code": 503,
  "success": false,
  "correlation_id": "cor_abc123",
  "timestamp": "2024-01-15T10:00:32Z"
}
```

## PII and Data Minimization

### PII in Payloads

Webhook payloads contain business data about streams and payments. Sensitive information handling:

**Included in webhooks**:
- Stream amount and velocity
- Event type and timestamp
- Settlement and payment state

**NOT included in webhooks**:
- Customer internal notes
- Phone numbers (if collected)
- Email addresses (except stream recipient wallet)
- Tax IDs or personal identification

### Payload Example

```json
{
  "id": "evt_abc123",
  "eventType": "stream.settled",
  "streamId": "stream_xyz",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "stream": {
      "id": "stream_xyz",
      "recipient": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "totalAmount": "1000000000",
      "releasedAmount": "1000000000",
      "status": "ended",
      "settlementTxHash": "1234567890abcdef"
    }
  }
}
```

### Retention Policy

| Data Type | Retention Period | Rationale |
|-----------|------------------|-----------|
| Delivered webhooks | 30 days | Audit trail, compliance |
| DLQ entries | 90 days | Troubleshooting, investigation |
| Attempt logs | 30 days | Performance analysis |
| Signatures | Not stored | Computed per-request |

**Customer Responsibility**: Customers should apply their own retention policies to webhook logs in their systems.

## Service Level Objectives (SLO)

### Delivery SLO

**Target**: 99.5% of webhooks successfully delivered within 5 minutes of event creation

This means:
- 99.5% of events reach the customer's endpoint
- For events that do fail, SLA applies to retry attempts
- Events in DLQ are considered "failed" against SLO

### Latency SLO

| Percentile | Target | Notes |
|-----------|--------|-------|
| p50 (median) | < 100ms | Local delivery, no retries |
| p95 | < 500ms | Same, may include network latency |
| p99 | < 2s | Includes rare timeout/retry scenarios |

### Recovery SLO

For temporarily unavailable endpoints:
- **Detection**: Circuit opens after 5 consecutive failures
- **Recovery window**: Circuit half-opens after 5 minutes
- **Retry**: Next delivery after 5-minute window attempts recovery

## Security Considerations

### Authentication and Authorization

- **Webhook Secret**: Each endpoint has a unique secret (customer-provided or generated)
- **HMAC Verification**: Customers must verify signatures with their secret
- **No Bearer Tokens**: Webhooks use HMAC, not OAuth bearer tokens

### Signature Verification Is Mandatory

**Why**: Webhooks are HTTP requests over the internet. Without verification:
- Attackers could forge events
- Man-in-the-middle could modify payloads
- Replays could be accepted

**Implementation**: All webhook handlers must verify `X-StreamPay-Signature` before processing.

### Timestamp Validation

**Clock Skew Tolerance**: 5 minutes (300 seconds)

This allows for:
- Minor clock differences between StreamPay and customer servers
- Network delays in extreme cases
- Should be **tuned down** to < 1 minute for production

### Do Not Resign Different Payloads

**Important Security Note**: The same HMAC secret and delivery ID are used across all retry attempts. This is safe because:

✅ **Same** across retries:
- Event data (payload)
- Delivery ID
- Secret key

🚫 **Different** across retries:
- Timestamp (causes signature to change)
- Attempt number (in headers, not signed)

**Why this matters**: If we changed the payload per attempt or used different secrets, signature verification would fail on retries, breaking idempotency. Instead, new timestamps naturally produce new signatures while keeping the payload immutable.

### DoS Prevention

StreamPay implements DDoS protection:
- Rate limiting per endpoint
- Circuit breaker to prevent retry storms
- Timeout enforcement (30 seconds per request)
- Payload size limits (10 MB)

### Supply Chain Security

All webhook delivery code is:
- ✅ Logged with full audit trail
- ✅ Covered by integration tests
- ✅ Signed with HMAC
- ✅ Subject to security scanning

## Implementation Checklist for Customers

When integrating StreamPay webhooks:

- [ ] Generate and securely store webhook secret
- [ ] Implement HMAC-SHA256 signature verification
- [ ] Extract `X-StreamPay-Delivery-Id` from headers
- [ ] Store delivery ID in idempotency database
- [ ] Check idempotency before processing
- [ ] Return 2xx status code on success
- [ ] Implement retry logic on 5xx errors (optional, StreamPay will retry)
- [ ] Log all webhook operations with delivery ID
- [ ] Monitor endpoint availability
- [ ] Alert on repeated failures
- [ ] Periodically query DLQ for missed events
- [ ] Validate timestamp freshness (within 5 minutes)
- [ ] Handle webhook payloads synchronously (no long delays)
- [ ] Respond within 30 seconds timeout

## Troubleshooting

### Webhook Not Received

1. Check firewall/network rules allow inbound requests
2. Verify endpoint URL is correct and publicly routable
3. Check endpoint is returning 2xx status code
4. Monitor logs for retry attempts with `correlation_id`
5. Check DLQ for any entries

### Duplicates Received

This is expected behavior! Always implement idempotency deduplication using `X-StreamPay-Delivery-Id`.

### Wrong Signature

- Verify secret is correct (case-sensitive)
- Check timestamp is within 5-minute tolerance
- Verify delivery ID matches header
- Ensure constant-time comparison is used

### Endpoint Circuit Breaker Opened

If we see 5+ consecutive failures:
1. Fix the endpoint issue
2. Wait 5 minutes for circuit to half-open
3. Next delivery will attempt recovery
4. If successful, circuit closes

---

## API Reference

### Delivery Status Endpoint

```
GET /api/webhooks/deliveries
Query Parameters:
  - status: pending | delivered | failed | dlq (optional)
  - endpoint_id: filter by endpoint (optional)

Response:
{
  "data": [
    {
      "deliveryId": "dlv_123",
      "endpointUrl": "https://...",
      "status": "delivered",
      "attempts": 2,
      "createdAt": "2024-01-15T10:00:00Z",
      "finalizedAt": "2024-01-15T10:00:32Z"
    }
  ],
  "pagination": {
    "total": 100,
    "count": 10
  }
}
```

### DLQ Endpoint

```
GET /api/webhooks/dlq
Query Parameters:
  - since: ISO timestamp (optional)

Response:
{
  "data": [
    {
      "dlqId": "dlq_123",
      "deliveryId": "dlv_123",
      "endpointUrl": "https://...",
      "eventType": "stream.settled",
      "reason": "Max retries exceeded",
      "lastAttempt": {...},
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "count": 5
  }
}
```

---

## Related Documentation

- [Security and Authentication](./SECURITY.md)
- [Observability and Tracing](./observability-tracing-guide.md)
- [Stream Settlement Guide](./payout-math.md)
- [API Documentation](../openapi.json)
