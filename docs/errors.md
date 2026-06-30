# StreamPay Error Handling

## Overview

StreamPay uses a unified error handling system based on [RFC 7807 (Problem Details for HTTP APIs)](https://tools.ietf.org/html/rfc7807) with stable, versioned internal error codes. This ensures consistent error messaging across all services and prevents raw backend/Horizon errors from leaking to clients.

## Error Response Format

All API errors follow a standardized envelope:

```json
{
  "type": "https://api.streampay.io/errors/insufficient-funds",
  "code": "INSUFFICIENT_FUNDS",
  "title": "Insufficient Funds",
  "detail": "You do not have enough funds to complete this transaction.",
  "status": 400,
  "requestId": "req-abc123-def456",
  "category": "blockchain",
  "retry": {
    "retryable": false
  },
  "meta": {
    "fieldErrors": {
      "amount": "Amount exceeds available balance"
    }
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | RFC 7807 type URI identifying the error |
| `code` | string | **Stable machine-readable error code (PRIMARY KEY)** |
| `title` | string | Short human-readable summary |
| `detail` | string | Safe user-facing message (no internal details) |
| `status` | number | HTTP status code |
| `requestId` | string | Correlation ID for request tracing |
| `category` | string | Error category for grouping |
| `retry` | object | Retry guidance for error recovery |
| `meta` | object | Optional structured metadata (safe only) |

## Error Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `client` | 4xx client errors | BAD_REQUEST, NOT_FOUND |
| `server` | 5xx server errors | INTERNAL_ERROR, SERVICE_UNAVAILABLE |
| `network` | Network connectivity | NETWORK_TIMEOUT, NETWORK_UNAVAILABLE |
| `blockchain` | Stellar/Horizon errors | INSUFFICIENT_FUNDS, TRANSACTION_FAILED |
| `validation` | Input validation | VALIDATION_ERROR, INVALID_FIELD_VALUE |
| `auth` | Authentication/authorization | UNAUTHORIZED, FORBIDDEN |
| `unknown` | Uncategorized | UNKNOWN_ERROR |

## Error Code Registry

### HTTP Client Errors (4xx)

| Code | HTTP Status | Title | User Message | Retryable |
|------|-------------|-------|--------------|-----------|
| `BAD_REQUEST` | 400 | Bad Request | The request could not be understood. Please check your input and try again. | ❌ |
| `UNAUTHORIZED` | 401 | Unauthorized | Please sign in to continue. | ❌ |
| `FORBIDDEN` | 403 | Forbidden | You do not have permission to perform this action. | ❌ |
| `NOT_FOUND` | 404 | Not Found | The requested resource could not be found. | ❌ |
| `METHOD_NOT_ALLOWED` | 405 | Method Not Allowed | This action is not supported. Please try a different approach. | ❌ |
| `CONFLICT` | 409 | Conflict | This action conflicts with the current state. Please refresh and try again. | ✅ |
| `UNPROCESSABLE_ENTITY` | 422 | Unprocessable Entity | We could not process your request. Please check your information and try again. | ❌ |
| `RATE_LIMITED` | 429 | Rate Limited | Too many requests. Please wait a moment and try again. | ✅ (3 retries, exponential backoff) |
| `REQUEST_TIMEOUT` | 408 | Request Timeout | The request timed out. Please try again. | ✅ (2 retries) |

### HTTP Server Errors (5xx)

| Code | HTTP Status | Title | User Message | Retryable |
|------|-------------|-------|--------------|-----------|
| `INTERNAL_ERROR` | 500 | Internal Server Error | Something went wrong on our end. Please try again later. | ✅ (3 retries, exponential backoff) |
| `SERVICE_UNAVAILABLE` | 503 | Service Unavailable | Our service is temporarily unavailable. Please try again later. | ✅ (5 retries, exponential backoff) |
| `GATEWAY_TIMEOUT` | 504 | Gateway Timeout | The connection timed out. Please try again later. | ✅ (3 retries, exponential backoff) |

### Stellar/Blockchain Errors

| Code | HTTP Status | Title | User Message | Retryable |
|------|-------------|-------|--------------|-----------|
| `INSUFFICIENT_FUNDS` | 400 | Insufficient Funds | You do not have enough funds to complete this transaction. | ❌ |
| `INVALID_SIGNATURE` | 400 | Invalid Signature | Transaction signature is invalid. Please try again. | ✅ (2 retries) |
| `TRUSTLINE_MISSING` | 400 | Trustline Missing | A required trustline is missing. Please add the trustline and try again. | ❌ |
| `TRANSACTION_FAILED` | 400 | Transaction Failed | The transaction could not be completed. Please try again later. | ✅ (2 retries) |
| `TRANSACTION_TIMEOUT` | 504 | Transaction Timeout | The transaction timed out. Please check your account history before retrying. | ✅ (3 retries, exponential backoff) |
| `ACCOUNT_NOT_FOUND` | 404 | Account Not Found | The Stellar account could not be found. | ❌ |
| `SEQUENCE_NUMBER_INVALID` | 400 | Invalid Sequence Number | Transaction sequence number is invalid. Please try again. | ✅ (3 retries) |

### Stream Domain Errors

| Code | HTTP Status | Title | User Message | Retryable |
|------|-------------|-------|--------------|-----------|
| `STREAM_NOT_FOUND` | 404 | Stream Not Found | The payment stream could not be found. | ❌ |
| `INVALID_STREAM_STATE` | 409 | Invalid Stream State | This action cannot be performed on the current stream state. | ❌ |
| `STREAM_CREATION_FAILED` | 500 | Stream Creation Failed | We could not create the payment stream. Please try again later. | ✅ (2 retries) |
| `SETTLEMENT_FAILED` | 500 | Settlement Failed | The settlement could not be completed. Please try again later. | ✅ (3 retries, exponential backoff) |
| `WITHDRAWAL_FAILED` | 500 | Withdrawal Failed | The withdrawal could not be completed. Please try again later. | ✅ (3 retries, exponential backoff) |

### Network Errors

| Code | HTTP Status | Title | User Message | Retryable |
|------|-------------|-------|--------------|-----------|
| `NETWORK_TIMEOUT` | 0 | Network Timeout | The connection timed out. Please check your internet connection and try again. | ✅ (3 retries, exponential backoff) |
| `NETWORK_UNAVAILABLE` | 0 | Network Unavailable | No internet connection detected. Please check your connection and try again. | ✅ (5 retries, exponential backoff) |
| `DNS_LOOKUP_FAILED` | 0 | DNS Lookup Failed | Could not connect to the server. Please try again later. | ✅ (3 retries, exponential backoff) |
| `CONNECTION_RESET` | 0 | Connection Reset | The connection was interrupted. Please try again. | ✅ (3 retries) |

### Validation Errors

| Code | HTTP Status | Title | User Message | Retryable |
|------|-------------|-------|--------------|-----------|
| `VALIDATION_ERROR` | 422 | Validation Error | Please check your input and try again. | ❌ |
| `INVALID_REQUEST` | 400 | Invalid Request | The request format is invalid. Please check your input. | ❌ |
| `MISSING_REQUIRED_FIELD` | 422 | Missing Required Field | Please fill in all required fields. | ❌ |
| `INVALID_FIELD_VALUE` | 422 | Invalid Field Value | One or more fields contain invalid values. Please check your input. | ❌ |

### Idempotency Errors

| Code | HTTP Status | Title | User Message | Retryable |
|------|-------------|-------|--------------|-----------|
| `IDEMPOTENCY_KEY_REUSE` | 409 | Idempotency Key Reuse | This request is already being processed. Please wait a moment. | ✅ (5 retries, exponential backoff) |
| `IDEMPOTENCY_CONFLICT` | 409 | Idempotency Conflict | This action is already being processed. Please refresh and try again. | ✅ (3 retries) |

### Catch-all

| Code | HTTP Status | Title | User Message | Retryable |
|------|-------------|-------|--------------|-----------|
| `UNKNOWN_ERROR` | 500 | Unknown Error | An unexpected error occurred. Please try again later. | ✅ (3 retries, exponential backoff) |

## Backend → Frontend Error Mapping

### Backend Error Codes

| Backend Code | Frontend Code |
|--------------|---------------|
| `VALIDATION_ERROR` | `VALIDATION_ERROR` |
| `INVALID_REQUEST` | `INVALID_REQUEST` |
| `MISSING_REQUIRED_FIELD` | `MISSING_REQUIRED_FIELD` |
| `INVALID_FIELD_VALUE` | `INVALID_FIELD_VALUE` |
| `UNAUTHORIZED` | `UNAUTHORIZED` |
| `FORBIDDEN` | `FORBIDDEN` |
| `AUTH_TOKEN_EXPIRED` | `UNAUTHORIZED` |
| `INVALID_TOKEN` | `UNAUTHORIZED` |
| `STREAM_NOT_FOUND` | `STREAM_NOT_FOUND` |
| `RESOURCE_NOT_FOUND` | `NOT_FOUND` |
| `INVALID_STREAM_STATE` | `INVALID_STREAM_STATE` |
| `STREAM_INACTIVE_STATE` | `INVALID_STREAM_STATE` |
| `CONFLICT` | `CONFLICT` |
| `IDEMPOTENCY_KEY_REUSE` | `IDEMPOTENCY_KEY_REUSE` |
| `IDEMPOTENCY_CONFLICT` | `IDEMPOTENCY_CONFLICT` |
| `STREAM_CREATION_FAILED` | `STREAM_CREATION_FAILED` |
| `SETTLEMENT_FAILED` | `SETTLEMENT_FAILED` |
| `WITHDRAWAL_FAILED` | `WITHDRAWAL_FAILED` |
| `INTERNAL_ERROR` | `INTERNAL_ERROR` |
| `SERVICE_UNAVAILABLE` | `SERVICE_UNAVAILABLE` |

### Stellar Horizon Operation Result Codes

| Horizon Code | Frontend Code |
|--------------|---------------|
| `op_underfunded` | `INSUFFICIENT_FUNDS` |
| `op_over_source_max` | `INSUFFICIENT_FUNDS` |
| `op_bad_auth` | `INVALID_SIGNATURE` |
| `op_bad_auth_extra` | `INVALID_SIGNATURE` |
| `op_no_trust` | `TRUSTLINE_MISSING` |
| `op_not_authorized` | `TRUSTLINE_MISSING` |
| `op_line_full` | `TRANSACTION_FAILED` |
| `op_no_account` | `ACCOUNT_NOT_FOUND` |
| `op_no_destination` | `ACCOUNT_NOT_FOUND` |
| `op_src_no_trust` | `TRUSTLINE_MISSING` |
| `op_src_not_authorized` | `TRUSTLINE_MISSING` |
| `tx_bad_auth` | `INVALID_SIGNATURE` |
| `tx_bad_auth_extra` | `INVALID_SIGNATURE` |
| `tx_bad_seq` | `SEQUENCE_NUMBER_INVALID` |
| `tx_failed` | `TRANSACTION_FAILED` |
| `tx_insufficient_balance` | `INSUFFICIENT_FUNDS` |
| `tx_insufficient_fee` | `INSUFFICIENT_FUNDS` |
| `tx_missing_operation` | `INVALID_REQUEST` |
| `tx_timeout` | `TRANSACTION_TIMEOUT` |

## Usage Examples

### Handling API Errors

```typescript
import { fetchWithIdempotency } from '@/lib/apiClient';
import { handleError } from '@/app/lib/errors';

async function createStream(data: CreateStreamData) {
  try {
    return await fetchWithIdempotency('/api/streams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (error) {
    // Error is already normalized to StreamPayError
    const normalizedError = handleError(error, 'createStream');
    
    // Check if retryable
    if (normalizedError.retry.retryable) {
      // Implement retry logic
    }
    
    throw normalizedError;
  }
}
```

### Using UI Components

```tsx
import { ErrorBanner } from '@/app/components/ErrorBanner';
import { ErrorToast } from '@/app/components/ErrorToast';
import type { StreamPayError } from '@/app/lib/errors';

// Banner for critical errors
<ErrorBanner
  error={error}
  onDismiss={() => setError(null)}
  onRetry={handleRetry}
  showRequestId={true}
/>

// Toast for transient errors
<ErrorToast
  error={error}
  onDismiss={() => removeToast(id)}
  onRetry={handleRetry}
  autoDismiss={true}
  autoDismissDelayMs={5000}
/>
```

### Form Validation Errors

```typescript
import { getFormErrors, hasFieldErrors } from '@/app/lib/errors';

function handleSubmitError(error: StreamPayError) {
  if (hasFieldErrors(error)) {
    const fieldErrors = getFormErrors(error);
    // Apply to form fields
    Object.entries(fieldErrors).forEach(([field, message]) => {
      setFieldError(field, message);
    });
  } else {
    // Show general error
    showToast(error);
  }
}
```

### Global Error Handler

```typescript
import { getGlobalErrorHandler } from '@/app/lib/errors';

// Configure global handler
const errorHandler = getGlobalErrorHandler({
  defaultPresentation: {
    type: 'toast',
    severity: 'error',
    autoDismiss: true,
  },
  onError: (event) => {
    // Send to analytics
    analytics.track('error', {
      code: event.error.code,
      category: event.error.category,
    });
  },
});

// Register component handler
const unsubscribe = errorHandler.registerHandler((error) => {
  // Update UI state
  setErrors((prev) => [...prev, error]);
});
```

## Security Requirements

### Production

- ❌ NO internal stack traces exposed
- ❌ NO raw Horizon responses exposed
- ❌ NO sensitive request payload leakage
- ✅ Always sanitize error output
- ✅ Correlate logs using `requestId` only

### Development

- ✅ Debug information available (with authentication)
- ✅ Original error codes and messages
- ✅ Stack traces (if available)

### Error Sanitization

The following fields are automatically redacted from error metadata:
- `password`
- `secret`
- `token`
- `key`
- `auth`
- `credential`
- `private`
- `signature`
- `seed`
- `mnemonic`
- `wallet`

## Retry Guidance

### Retryable Errors

| Error Code | Max Retries | Delay Strategy |
|------------|-------------|----------------|
| `NETWORK_TIMEOUT` | 3 | Exponential backoff, 2s base |
| `NETWORK_UNAVAILABLE` | 5 | Exponential backoff, 3s base |
| `RATE_LIMITED` | 3 | Exponential backoff, 2s base |
| `INTERNAL_ERROR` | 3 | Exponential backoff, 3s base |
| `SERVICE_UNAVAILABLE` | 5 | Exponential backoff, 5s base |
| `TRANSACTION_TIMEOUT` | 3 | Exponential backoff, 5s base |
| `SETTLEMENT_FAILED` | 3 | Exponential backoff, 3s base |

### Non-Retryable Errors

- `INSUFFICIENT_FUNDS` - User action required
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Permission issue
- `VALIDATION_ERROR` - Input correction required
- `STREAM_NOT_FOUND` - Resource doesn't exist

## Testing

### Error Flow Snapshots

The following error flows have snapshot tests:

1. **Insufficient Funds** - Stellar payment with low balance
2. **Unauthorized** - Expired/invalid JWT
3. **Network Timeout** - Connection timeout
4. **Transaction Failure** - Horizon submission failure
5. **Unknown Error** - Unrecognized error fallback

### Security Tests

- Verify no stack traces in production mode
- Verify raw backend payload is stripped
- Verify sensitive data redaction
- Verify requestId preservation

### Running Tests

```bash
# Run all error handling tests
npm test -- --testPathPattern="errors"

# Run with coverage
npm test -- --coverage --testPathPattern="errors"
```

## Migration Guide

### From Legacy Error Handling

```typescript
// Before
const response = await fetch('/api/streams');
if (!response.ok) {
  throw new Error(`Request failed: ${response.statusText}`);
}

// After
try {
  const data = await fetchWithIdempotency('/api/streams');
} catch (error) {
  // error is now StreamPayError with full context
  console.log(error.code); // 'INTERNAL_ERROR'
  console.log(error.retry.retryable); // true/false
}
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-04-28 | Initial unified error handling implementation |

## References

- [RFC 7807 - Problem Details for HTTP APIs](https://tools.ietf.org/html/rfc7807)
- [Stellar Horizon Errors](https://developers.stellar.org/api/introduction/http-status-codes-and-errors)
- [StreamPay OpenAPI Spec](/openapi.json)
