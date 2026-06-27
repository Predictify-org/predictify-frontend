## Streams API

### Endpoints

#### GET /api/streams/:id/events (SSE)
Server-Sent Events endpoint for live stream deltas.

**Authentication:** JWT Bearer token required  
**Headers:**
- `Authorization: Bearer <JWT token>`
- `x-tenant-id: <tenant-id>` (required)
- `x-correlation-id: <correlation-id>` (optional, for tracing)

**Response:**
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache, no-transform`
- `Connection: keep-alive`

**Events:**
- `stream:updated` - Emitted when stream state changes
- `settle:finished` - Emitted when settlement completes

**Protocol:**
- Server sends `: keep-alive` comments every 30s to keep connection alive
- Client must handle reconnection on disconnect
- Users can only subscribe to streams they own (recipient) or if they have admin role

**Error Responses:**
- `401 UNAUTHORIZED` - Missing or invalid JWT token
- `400 MISSING_TENANT` - Missing x-tenant-id header
- `422 VALIDATION_ERROR` - Invalid stream ID format
- `404 NOT_FOUND` - Stream does not exist
- `403 FORBIDDEN` - User does not have permission to subscribe

## Running E2E Tests and Coverage

```bash
# Run the lifecycle E2E suite
npm run test:e2e

# Run with coverage report
npm run test:e2e:coverage
# HTML report: coverage/lcov-report/index.html
```

### Coverage target
≥ 90% line coverage of `app/api/streams/` route handlers.

### Mock architecture
- `getStellarSettlementClient().settleStream` — mocked via `globalThis.__STREAMPAY_STELLAR_SETTLEMENT_CLIENT__`.
  Override per-test with `settleSpy.mockRejectedValueOnce(...)` for error branches.
- Withdrawal finality fetch — mocked via `global.fetch = jest.fn(...)`.
  Default: returns a matching tx hash (`mockHorizonFound`). Override with `mockHorizonPending()` for pending/failed states.
  `serverFetch` (captured before any test) is used for all HTTP calls to the test server so Horizon mocks don't intercept them.

### Adding new tests
All E2E tests live in `stream-lifecycle.e2e.test.ts`. Follow the `describe` block structure:

1. **happy path** — full lifecycle, one route per step, assert status + `nextAction`
2. **idempotent replays** — same `Idempotency-Key` twice, assert spy call count unchanged
3. **invalid-state 409** — wrong state transitions, assert `INVALID_STREAM_STATE`
4. **rate-limit / approval** — exhaust write bucket (429), org policy denials (403), approval gate (409)
