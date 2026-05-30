# Rate Limiting

StreamPay API implements rate limiting to protect against abuse, scraping, and DoS attacks.

## Default Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Read (GET) | 60 requests | 1 minute |
| Write (POST/DELETE) | 10 requests | 1 minute |

## Identification Priority

When determining rate limits, the API identifies clients in the following priority order:

1. **API Key** (`X-API-Key` header) - Highest priority
2. **Wallet** (JWT Bearer token `sub` claim) - For authenticated requests
3. **IP Address** (`X-Forwarded-For` or `X-Real-IP` header) - Fallback

### NAT Caveats

If your infrastructure uses shared NAT, multiple legitimate users may appear to share the same IP address. This could cause rate limits to trigger unexpectedly. Consider:

- Using API keys for server-to-server calls
- Using wallet authentication for user-level tracking
- Contacting support if you need higher limits for NAT-heavy environments

## 429 Response

When a rate limit is exceeded, the API returns a `429 Too Many Requests` response:

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please try again later."
  }
}
```

The response includes a `Retry-After` header indicating when you can retry:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
```

## Rate Limited Endpoints

All API endpoints are rate limited:

| Method | Endpoint | Limit Type |
|--------|----------|------------|
| GET | `/api/streams` | Read |
| GET | `/api/streams/{id}` | Read |
| POST | `/api/streams` | Write |
| DELETE | `/api/streams/{id}` | Write |
| POST | `/api/streams/{id}/start` | Write |
| POST | `/api/streams/{id}/pause` | Write |
| POST | `/api/streams/{id}/stop` | Write |
| POST | `/api/streams/{id}/settle` | Write |
| POST | `/api/streams/{id}/withdraw` | Write |
| GET | `/api/activity` | Read |
| GET | `/api/identity/me` | Read |

## Requesting Higher Limits

If your use case requires higher rate limits:

1. **For production deployments**: Contact StreamPay support with your:
   - Expected request volume
   - Use case description
   - Whether you need per-key or per-wallet limits

2. **For testing/development**: The in-memory rate limit store is suitable for single-instance deployments.

## Metrics and Monitoring

Rate limiting emits structured logs for monitoring:

```json
{
  "event": "rate_limit_throttled",
  "route": "/api/streams",
  "limitType": "read",
  "timestamp": "2026-04-28T12:00:00.000Z",
  "identityType": "wallet",
  "identityDisplay": "GATODH2T75IVFB..."
}
```

Monitor these events to tune rate limits and detect potential abuse.

## Implementation Details

### Token Bucket Algorithm

Rate limits use a token bucket algorithm, which allows for:

- **Burst handling**: Requests can use up to the limit in short bursts
- **Smooth refill**: Tokens refill at a constant rate
- **Fairness**: Each identifier gets an equal share of the limit

### Store Backends

| Backend | Use Case | Configuration |
|---------|----------|---------------|
| In-Memory | Development, single-instance | Default (no config needed) |
| Redis | Production, multi-instance | Set `RATE_LIMIT_STORE_TYPE=redis` and `RATE_LIMIT_REDIS_URL` |

### Security Considerations

- Rate limit thresholds are not exposed in error responses (no information leakage)
- Internal metrics track throttle counts by route for alerting
- In-memory whitelist is for single-instance use only

## Best Practices

1. **Handle 429 responses gracefully** - Implement exponential backoff
2. **Use idempotency keys** - For POST requests to safely retry on network failure
3. **Monitor your usage** - Track response headers to stay within limits
4. **Batch requests when possible** - Use list endpoints instead of individual GETs
