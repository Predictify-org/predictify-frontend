# API Client Usage

The `lib/apiClient.ts` module wraps `fetch` with idempotency keys,
timeouts, retry, and error normalisation. Use the typed helpers
(`get`, `post`, `put`, `patch`, `del`) instead of calling `fetch`
directly from React components.

## Basic GET

```ts
import { get } from '@/lib/apiClient';

type StreamList = { streams: Stream[]; next_cursor: string | null };

const data = await get<StreamList>('/api/v2/streams?limit=20');
```

## POST with body

```ts
import { post } from '@/lib/apiClient';

const created = await post<Stream>('/api/v2/streams', {
  recipient: 'G...',
  amount: '100.0000000',
  asset_code: 'USDC',
  duration_seconds: 86_400,
});
```

`post`, `put`, and `patch` automatically:

- attach `Content-Type: application/json`
- generate an `Idempotency-Key` per request
- generate a unique `x-request-id`

## Timeouts and retries

```ts
const data = await get<Page>('/api/exports/large.csv', {}, {
  timeoutMs: 60_000,
  retries: 3,
  retryDelayMs: 500,
  useExponentialBackoff: true,
});
```

Retries only fire on errors the normaliser marks as retryable
(network errors, 408, 429, 502, 503, 504). 4xx client errors short-
circuit immediately.

## Error handling

All thrown values are `StreamPayError` objects with `code`, `message`,
`status`, and `request_id`. The `request_id` is forwarded to the server
log so you can grep for it when triaging.

```ts
try {
  await post('/api/v2/streams', body);
} catch (err) {
  const e = err as StreamPayError;
  toast.error(`${e.message} (request id: ${e.request_id})`);
}
```
