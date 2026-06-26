# Backend Contributing Guide

Specific guidance for adding and modifying backend code in this repository.
For general contribution workflow see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Architecture at a glance

```
app/api/          Next.js route handlers (REST surface)
app/lib/          Server-side helpers used by route handlers
  config/         Environment configuration
  errors/         Canonical error envelope
  repositories/   Pluggable data store (in-memory / Postgres)
lib/              Shared client helpers (apiClient, indexer)
```

Request flow: browser HTTP -> Next.js route handler -> repository (getStore()) -> Stellar client

All data access goes through `getStore()` from `app/lib/db.ts`, which returns a
`PersistenceStore` backed by an in-memory map by default. The store interface is
pluggable so it can be swapped for a durable Postgres backend later.

---

## Worked example: adding a `/api/categories` endpoint

This walks through adding a new `categories` resource end-to-end: route handler,
repository interface, in-memory implementation, validation, and tests.

### 1. Define the type

Add a `Category` type to `app/types/openapi.ts`:

```ts
export interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
}
```

### 2. Extend the repository interface

In `app/lib/db.ts`, add `categories` to the `PersistenceStore`:

```ts
export interface PersistenceStore {
  readonly categories: KeyValueStore<string, Category>;
  // ...existing fields
}
```

### 3. Implement in-memory storage

In `app/lib/repositories/in-memory.ts`, add seed data and wire it into
`createInMemoryPersistenceStore`:

```ts
const initialCategories: Category[] = [
  { id: "cat-1", name: "Design", description: "Design services", created_at: "2026-01-01T00:00:00Z" },
];

class InMemoryCategoryStore extends InMemoryKeyValueStore<string, Category> implements KeyValueStore<string, Category> {}

export function createInMemoryPersistenceStore(): PersistenceStore {
  return {
    categories: new InMemoryKeyValueStore(new Map(initialCategories.map(c => [c.id, { ...c }]))),
    // ...existing fields
  };
}
```

### 4. Add validation

Create `app/lib/category-validation.ts` following the pattern from
`app/lib/stream-validation.ts`:

```ts
export function validateCreateCategoryBody(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    errors.push({ field: "name", code: "MISSING_FIELD", message: "name is required." });
  }
  return errors;
}
```

### 5. Create the route handler

Create `app/api/categories/route.ts`. Every route handler follows this skeleton:

```ts
import { NextResponse } from "next/server";
import { getStore } from "@/app/lib/db";
import { errorResponse } from "@/app/lib/errors";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";
import { validateCreateCategoryBody } from "@/app/lib/category-validation";

export async function GET(request: Request) {
  const { categories } = getStore();
  const result = await checkRateLimit(getClientIdentity(request), getLimitForRoute("GET", "/api/categories"));
  if (!result.allowed) return rateLimitResponse(result.retryAfter!);
  recordRequest("/api/categories");

  const all = Array.from(categories.values());
  return NextResponse.json({ data: all });
}

export async function POST(request: Request) {
  const { categories, idempotencyStore } = getStore();
  const result = await checkRateLimit(getClientIdentity(request), getLimitForRoute("POST", "/api/categories"));
  if (!result.allowed) return rateLimitResponse(result.retryAfter!);
  recordRequest("/api/categories");

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return errorResponse("INVALID_REQUEST", "Request body must be valid JSON", 400); }

  const errors = validateCreateCategoryBody(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid fields.", details: errors } }, { status: 422 });
  }

  const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
  const category = { id, name: body.name as string, description: (body.description as string) ?? "", created_at: new Date().toISOString() };
  categories.set(id, category);
  return NextResponse.json({ data: category }, { status: 201 });
}
```

For route handlers with dynamic segments (e.g. `/api/categories/[id]`), create
`app/api/categories/[id]/route.ts` and receive `{ params }`:

```ts
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = getStore().categories.get(id);
  if (!category) return errorResponse("NOT_FOUND", "Category not found", 404);
  return NextResponse.json({ data: category });
}
```

See `app/api/streams/route.ts` for a complete production example with
idempotency keys, pagination cursors, and token allowlisting.

### 6. Write tests

**Unit test** — co-located `app/api/categories/route.test.ts`:

```ts
import { resetDb } from "@/app/lib/db";
import { resetRateLimitStore } from "@/app/lib/rate-limit-store";
import { GET, POST } from "./route";

beforeEach(() => { resetDb(); resetRateLimitStore(); });

it("GET returns all categories", async () => {
  const res = await GET(new Request("http://localhost/api/categories"));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data).toBeInstanceOf(Array);
});
```

**E2E test** — add a case to `app/api/streams/stream-lifecycle.e2e.test.ts`
or create a dedicated `*.e2e.test.ts` using the same HTTP harness pattern
(createServer on random port, resetDb for isolation).

See `app/lib/stream-validation.test.ts` for validation-specific testing
and `app/lib/amount.test.ts` for pure-logic unit testing.

---

## Real code references

| What | Where | Key patterns |
|---|---|---|
| Route handler | `app/api/streams/route.ts` | Rate limiting, idempotency, validation, pagination cursors |
| Dynamic route | `app/api/streams/[id]/route.ts` and `app/api/streams/[id]/start/route.ts` | `{ params }` destructuring, state machine transitions |
| Repository interface | `app/lib/db.ts` | `PersistenceStore`, `KeyValueStore<K,V>`, `getStore()`, `resetDb()` |
| In-memory store | `app/lib/repositories/in-memory.ts` | `createInMemoryPersistenceStore()`, seed data, `withLock` |
| Postgres seam | `app/lib/repositories/postgres.ts` | Schema sketch, rollout plan |
| Error envelope | `app/lib/errors/index.ts` | `errorResponse(code, message, status)`, `ErrorCode` constants |
| Validation | `app/lib/stream-validation.ts` | `validateCreateStreamBody()`, `ValidationError[]` |
| Auth | `app/lib/auth.ts`, `app/lib/admin-guard.ts` | JWT from wallet challenge, admin route guard |
| Internal service auth | `app/lib/internal-service-auth.ts` | Service-to-service bearer tokens |
| Stellar client | `app/lib/stellarClient.ts` | Horizon/Soroban wrapper with caching, circuit breaker, concurrency limits |
| Rate limiting | `app/lib/rate-limit.ts` | `checkRateLimit()`, per-route config in `rate-limit-config.ts` |
| Idempotency | `app/lib/db.ts` (`checkIdempotency`, `setIdempotency`) | `Idempotency-Key` header, SHA-256 fingerprint, 24h TTL |
| State machine | `app/lib/state-machine.ts` | Stream status transitions, `transition()` |
| Stream service | `app/lib/stream-service.ts` | `StreamService.applyAction()`, orchestration layer |
| Event bus | `app/lib/event-bus.ts` | Pub/sub for real-time updates |
| Webhook delivery | `app/lib/webhook-delivery.ts` | HMAC signing, retry queue, delivery store |
| Audit log | `app/lib/audit-log.ts` | Structured audit trail |
| Logger | `app/lib/logger.ts` | Structured logging with correlation context |
| Health checks | `app/lib/health.ts` | `GET /healthz` and `GET /readyz` probes |
| OpenAPI spec | `openapi.json` | Full API contract |

---

## Error handling conventions

Every error response must use the canonical envelope from `app/lib/errors/index.ts`:

```ts
return errorResponse("CATEGORY_NOT_FOUND", "The requested category does not exist.", 404);
```

This produces `{ error: { code, message, request_id } }`. Never return a bare
`{ error: "string" }` or `{ success: false, error }`.

Well-known error codes are defined in `ErrorCode` — extend that object when
adding new error types for a new resource.

---

## Route handler checklist

When adding a new route handler, verify:

- [ ] Rate limiting wired via `checkRateLimit()` + `getLimitForRoute()`
- [ ] Idempotency key checked on mutating endpoints (`POST`, `PUT`, `PATCH`, `DELETE`)
- [ ] Validation errors return `422 VALIDATION_ERROR` with per-field `details`
- [ ] Auth checked for authenticated routes
- [ ] Error envelope via `errorResponse()` on all failure paths
- [ ] Stellar/Soroban calls go through `app/lib/stellarClient.ts` (never raw)
- [ ] Tests cover happy path + at least one failure path
