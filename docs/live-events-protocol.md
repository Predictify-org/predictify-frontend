# StreamPay Live Events Protocol (SSE)

The StreamPay dashboard uses Server-Sent Events (SSE) to receive real-time updates for stream state changes and settlement completions.

## Endpoint
`GET /api/streams/events`

## Query Parameters
| Parameter | Required | Description |
|-----------|----------|-------------|
| `streamId`| Yes      | The unique identifier of the stream to subscribe to. |

## Authentication
Requires a JWT `Bearer` token in the `Authorization` header.
- Token must be valid (not expired).
- The authenticated user must be the owner or recipient of the requested stream.

## Event Types

### `stream:updated`
Triggered whenever the stream status or metadata changes.
**Payload:**
```json
{
  "id": "stream_123",
  "status": "active",
  "updatedAt": "2026-04-29T12:00:00Z",
  ...
}
```

### `settle:finished`
Triggered specifically when a settlement process completes (status becomes `settled` or `ended`).
**Payload:** Same as `stream:updated`.

### `keep-alive` (Comment)
A `: keep-alive\n\n` comment is sent every 30 seconds to prevent connection timeouts.

## Implementation Notes
- **Backpressure**: The implementation uses a standard `ReadableStream` which handles basic backpressure by stopping the event loop if the buffer is full.
- **Security**: 403 Forbidden is returned if the user tries to guess a `streamId` they do not own.
- **Message Caps**: Event payloads are structured JSON objects; clients should handle potential large payloads if metadata grows.

## Example Client Usage (JavaScript)
```javascript
const eventSource = new EventSource('/api/streams/events?streamId=stream-ada&token=' + token);

eventSource.addEventListener('stream:updated', (event) => {
  const data = JSON.parse(event.data);
  console.log('Stream updated:', data);
});

eventSource.addEventListener('settle:finished', (event) => {
  console.log('Settlement finished!');
});

eventSource.onerror = (err) => {
  console.error('SSE Error:', err);
};
```
