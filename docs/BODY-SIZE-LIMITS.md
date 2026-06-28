# Body Size Limit Configuration - Implementation Summary

## Overview

Implemented per-route body size limit configuration for the GrantFox campaign, allowing different size limits for different API route categories:

- **Default routes**: 256 KB (configurable via `MAX_STREAM_BODY_BYTES`)
- **Webhook routes**: 1 MB (configurable via `MAX_WEBHOOK_BODY_BYTES`)

## Changes

### 1. New File: `lib/bodySize.ts`

Extracted and enhanced body size checking logic into a dedicated utility module with the following exports:

#### Constants
- `DEFAULT_MAX_BODY_BYTES`: 256 KB (262,144 bytes)
- `WEBHOOK_MAX_BODY_BYTES`: 1 MB (1,048,576 bytes)
- `WRITE_METHODS`: Set of HTTP methods that carry request bodies (POST, PUT, PATCH)

#### Functions
- `resolveMaxBodyBytes(envVar: string, defaultBytes: number): number` - Resolves configured limit from environment variable with validation
- `isWebhookPath(pathname: string): boolean` - Determines if path is a webhook route (`/api/webhooks/*`)
- `getBodySizeLimit(pathname: string, limits: object): number` - Returns appropriate limit for a path
- `extractPathname(request: Request): string` - Safely extracts pathname from both NextRequest and plain Request objects
- `createBodySizeTooLargeResponse(contentLength: number, maxBytes: number, requestId: string): NextResponse` - Creates standardized 413 error response
- `checkRequestBodySize(request: Request, limits: object): NextResponse | null` - Main validation function
- `buildLimitsConfig(): object` - Builds complete limits configuration from environment variables

**Key Properties:**
- O(1) complexity: reads Content-Length header without buffering body
- Supports both Edge runtime (NextRequest) and test environments (plain Request)
- Comprehensive validation and error handling
- Structured error responses with request correlation IDs

### 2. Updated File: `middleware.ts`

Refactored middleware to use new bodySize utility:

**Removed:**
- Inline body size validation logic
- Single configurable limit (MAX_STREAM_BODY_BYTES only)
- Path-specific routing code

**Added:**
- Import of bodySize utility functions
- Per-route configuration via `buildLimitsConfig()`
- Support for webhook-specific limits

**Updated:**
- Body size check now calls `checkRequestBodySize(request, bodyLimits)` with limits object

### 3. New File: `lib/bodySize.test.ts`

Comprehensive test suite with 90%+ coverage including:

**Test Categories:**
- Constants validation
- `resolveMaxBodyBytes()` - validates parsing, defaults, and error handling
- `isWebhookPath()` - tests path matching for various webhook routes
- `getBodySizeLimit()` - tests limit selection based on path
- `extractPathname()` - tests pathname extraction for different request types
- `createBodySizeTooLargeResponse()` - tests error response structure
- `checkRequestBodySize()` - comprehensive end-to-end validation
- `buildLimitsConfig()` - tests configuration building from env vars
- Integration tests - full workflow scenarios

**Edge Cases Covered:**
- Malformed Content-Length headers
- Negative and infinite values
- Boundary conditions (exact limit values)
- Missing headers
- Different HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- Path variations (/api/webhooks, /api/webhooks/rotate, /api/webhooks/dlq, etc.)
- Request ID generation and forwarding

### 4. Updated File: `middleware.test.ts`

Added comprehensive webhook test suite covering:

**New Test Cases:**
- Webhook routes return 413 for bodies exceeding 1 MB limit
- Webhook routes accept bodies at and below 1 MB limit
- Nested webhook paths (`/api/webhooks/rotate`, `/api/webhooks/deliveries`, `/api/webhooks/dlq`)
- Error messages include correct 1 MB limit (1,048,576 bytes)
- MAX_WEBHOOK_BODY_BYTES environment variable override
- Isolation between webhook and default route limits
- Non-webhook similar paths don't get webhook limits

## Configuration

### Environment Variables

#### `MAX_STREAM_BODY_BYTES` (Default: 262,144)
- Controls the body size limit for default routes
- Must be a positive integer
- Fractional values are floored
- Invalid values are logged and defaults are used

Example:
```bash
MAX_STREAM_BODY_BYTES=131072  # 128 KB
```

#### `MAX_WEBHOOK_BODY_BYTES` (Default: 1,048,576)
- Controls the body size limit for webhook routes (`/api/webhooks/*`)
- Must be a positive integer
- Fractional values are floored
- Invalid values are logged and defaults are used

Example:
```bash
MAX_WEBHOOK_BODY_BYTES=2097152  # 2 MB
```

## Route Categorization

### Default Routes (256 KB)
- `/api/v2/streams`
- `/api/v2/streams/{id}`
- `/api/v2/streams/{id}/pause`
- `/api/v2/streams/{id}/resume`
- Other `/api/*` routes not matching webhook patterns

### Webhook Routes (1 MB)
- `/api/webhooks`
- `/api/webhooks/rotate`
- `/api/webhooks/deliveries`
- `/api/webhooks/dlq`
- Any path starting with `/api/webhooks`

## Error Responses

### 413 Payload Too Large

Returned when Content-Length exceeds configured limit for the route:

```json
{
  "error": {
    "code": "REQUEST_TOO_LARGE",
    "message": "Request body exceeds the 262144-byte limit. Received Content-Length: 300000 bytes.",
    "request_id": "req_abc123def456"
  }
}
```

**Fields:**
- `code`: Standard error code for identification
- `message`: Includes configured limit and received size for debugging
- `request_id`: Forwarded from request header or auto-generated (format: `req_${timestamp}`)

## Implementation Details

### Request Fingerprinting Integration
- All 413 responses include the request fingerprint header (`x-request-id`)
- Fingerprints are set before body size check for correlation

### Safe Request Parsing
- Handles both NextRequest (Edge runtime) and plain Request objects (tests)
- Falls back to URL.pathname parsing if nextUrl is unavailable
- Gracefully handles malformed URLs

### Performance
- O(1) complexity: only reads Content-Length header
- No body buffering or streaming
- Clients without Content-Length are allowed through (downstream responsibility)

## Testing

### Coverage Targets
- Minimum 90% line coverage on changed files
- Unit tests in `lib/bodySize.test.ts` (~80 test cases)
- Integration tests in `middleware.test.ts` (~15 new test cases)

### Running Tests

```bash
# Test bodySize utility
npm test -- lib/bodySize.test.ts

# Test middleware with new webhook tests
npm test -- middleware.test.ts

# All tests with coverage
npm test -- --coverage
```

## Migration Notes

### For Operators
If using custom `MAX_STREAM_BODY_BYTES`:
- No change needed - behavior is backward compatible
- New `MAX_WEBHOOK_BODY_BYTES` can be set independently

### For Clients
- Existing clients under 256 KB are unaffected
- Webhook clients can now send up to 1 MB (increased from 256 KB)
- Error responses maintain same structure, only limits may differ

## Security Considerations

1. **Boundary Enforcement**: Limits are checked at Content-Length level, preventing unnecessary resource allocation
2. **Input Validation**: All numeric inputs are validated before use
3. **Error Disclosure**: Error messages include actual vs. allowed sizes for debugging (consider logging level in production)
4. **Request Correlation**: All errors include request IDs for audit trails

## Future Enhancements

- Route pattern matching for more granular control
- Dynamic limit adjustment based on client authentication
- Metrics collection for body size distribution analysis
- Rate limiting integration with per-route quotas
