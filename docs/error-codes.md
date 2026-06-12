# Error Codes Reference

This is a cross-reference of the error codes the API can return and the
contract-side errors they typically map from. The canonical envelope
shape is documented in the [README](../README.md#error-envelope).

## HTTP error codes

| Code                   | HTTP | Retryable | When you see it |
|------------------------|------|-----------|-----------------|
| `BAD_REQUEST`          | 400  | no        | Input failed schema validation. |
| `UNAUTHORIZED`         | 401  | no        | Missing or invalid bearer token. |
| `FORBIDDEN`            | 403  | no        | Authenticated but lacks permission. |
| `NOT_FOUND`            | 404  | no        | Resource does not exist (or not visible to you). |
| `REQUEST_TIMEOUT`      | 408  | yes       | Upstream did not respond in time. |
| `CONFLICT`             | 409  | no        | Idempotency-key replay with a different body. |
| `UNPROCESSABLE_ENTITY` | 422  | no        | Semantic validation failed (e.g. negative amount). |
| `RATE_LIMITED`         | 429  | yes       | Tenant exceeded per-route rate budget. |
| `INTERNAL_ERROR`       | 500  | yes       | Unhandled server error; check `request_id` in logs. |
| `SERVICE_UNAVAILABLE`  | 503  | yes       | Circuit breaker open or maintenance mode. |
| `GATEWAY_TIMEOUT`      | 504  | yes       | Horizon or Soroban RPC timed out. |
| `UNKNOWN_ERROR`        | -    | no        | Fallback when no other mapping matched. |

## Contract error to API code mapping

The Soroban `Error` enum lives in
`contracts/contracts/streampay-stream/src/error.rs`. The mapping is
applied in `app/lib/errors/`:

| Contract variant   | API code              | HTTP |
|--------------------|-----------------------|------|
| `NotFound`         | `NOT_FOUND`           | 404  |
| `Unauthorized`     | `FORBIDDEN`           | 403  |
| `ContractPaused`   | `SERVICE_UNAVAILABLE` | 503  |
| `InvalidAmount`    | `UNPROCESSABLE_ENTITY`| 422  |
| `InvalidTimeRange` | `UNPROCESSABLE_ENTITY`| 422  |
| `InvalidState`     | `CONFLICT`            | 409  |
| `OverWithdraw`     | `UNPROCESSABLE_ENTITY`| 422  |
| `AlreadySettled`   | `CONFLICT`            | 409  |
| `TokenNotAllowed`  | `FORBIDDEN`           | 403  |

## See also

- `docs/api-client-usage.md` — how to handle errors on the client.
- `app/lib/errors/` — concrete normaliser and mapping code.
