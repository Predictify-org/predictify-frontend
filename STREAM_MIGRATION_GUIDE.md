# Stream Storage Migration Guide

## Overview

This document describes the versioned migration system for stream entries from V1 (flat) to V2 (nested) storage layout.

## Schema Versions

### V1 (Legacy) - Flat Structure

All fields at root level:

```typescript
{
  id: string;
  recipient: string;
  rate: string;
  email?: string;
  settlementTxHash?: string;
  withdrawalState?: string;
  withdrawalAttempts?: number;
  // ... 15+ more fields
}
```

**Issues:**
- 20+ fields at root level
- PII mixed with operational data
- Nested objects flattened with prefixes
- Difficult to maintain and extend

### V2 (Current) - Grouped Structure

Logically grouped into namespaces:

```typescript
{
  id: string;
  v: 2;
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
  state: {
    status: string;
    nextAction?: string;
  };
  payment: {
    recipient: string;
    rate: string;
    schedule: string;
    token: string;
  };
  pii?: {
    email?: string;
    label?: string;
    memo?: string;
    partnerId?: string;
  };
  accounting?: {
    senderAddress?: string;
    vestedAmount?: string;
    releasedAmount?: string;
  };
  settlement?: {
    txHash?: string;
    pausedAt?: string;
  };
  withdrawal?: {
    state: string;
    requestedAt: string;
    attempts: number;
    // ...
  };
  cancellation?: {
    recipientPayout: string;
    // ...
  };
}
```

**Benefits:**
- Clear separation of concerns
- PII grouped together for compliance
- Nested objects properly structured
- Easier to extend and maintain
- Version field for future migrations

## API Changes

### Import the Migration Engine

```typescript
import {
  detectVersion,
  migrateStreamV1toV2,
  migrateStreamV2toV1,
  batchMigrateV1toV2,
} from "@/app/lib/migration/engine";
```

### Detect Version

```typescript
const version = detectVersion(stream);
// Returns: 1 | 2
```

### Migrate Single Stream

```typescript
// V1 to V2
const v2Stream = migrateStreamV1toV2(v1Stream);

// V2 to V1 (for legacy compatibility)
const v1Stream = migrateStreamV2toV1(v2Stream);
```

### Batch Migration

```typescript
const result = batchMigrateV1toV2(streams);
// Returns: { migrated: number; failed: number; errors: Array<...> }
```

## File Structure

```
app/lib/migration/
├── schema.ts          # Type definitions and constants
├── engine.ts          # Migration logic and transformers
└── engine.test.ts     # Comprehensive test suite (15 tests)
```

## Migration Mapping

### Basic Fields
- V1: `createdAt` → V2: `metadata.createdAt`
- V1: `status` → V2: `state.status`
- V1: `recipient` → V2: `payment.recipient`

### Grouped Fields
- V1: `email`, `label`, `memo`, `partnerId` → V2: `pii.*`
- V1: `senderAddress`, `vestedAmount` → V2: `accounting.*`
- V1: `settlementTxHash`, `pausedAt` → V2: `settlement.*`

### Flattened Objects
- V1: `withdrawalState`, `withdrawalAttempts`, ... → V2: `withdrawal.*`
- V1: `cancellationRecipientPayout`, ... → V2: `cancellation.*`

## Usage Examples

### Check Stream Version

```typescript
import { detectVersion } from "@/app/lib/migration/engine";

const stream = getStreamFromDB(id);
const version = detectVersion(stream);

if (version === 1) {
  console.log("Stream is in legacy format");
}
```

### Migrate All Streams

```typescript
import { batchMigrateV1toV2 } from "@/app/lib/migration/engine";

async function migrateAllStreams() {
  const allStreams = await db.getAllStreams();
  const result = batchMigrateV1toV2(allStreams);
  
  console.log(`Migrated: ${result.migrated}`);
  console.log(`Failed: ${result.failed}`);
  
  if (result.errors.length > 0) {
    console.error("Migration errors:", result.errors);
  }
}
```

### Handle Version Transparently

```typescript
import { detectVersion, migrateStreamV1toV2 } from "@/app/lib/migration/engine";

function normalizeStream(raw: any): StreamV2 {
  const version = detectVersion(raw);
  return version === 1 ? migrateStreamV1toV2(raw) : raw;
}
```

## Testing

Run the migration test suite:

```bash
npm test app/lib/migration/engine.test.ts
```

**Coverage:**
- Version detection (3 tests)
- V1→V2 migration (7 tests)
- V2→V1 migration (2 tests)
- Batch migration (3 tests)
- All edge cases covered

## Deployment Notes

### Rollout Plan

1. **Phase 1**: Deploy migration system (no breaking changes)
2. **Phase 2**: Update repository layer to use V2 internally
3. **Phase 3**: Migrate persisted data (background job)
4. **Phase 4**: Deprecate V1 support (future)

### Backward Compatibility

- Current system accepts both V1 and V2
- `detectVersion()` handles auto-detection
- `migrateStreamV2toV1()` available for legacy output

### Performance

- Migrations are O(1) per stream
- Batch operations suitable for bulk operations
- No database transactions required

## Future Enhancements

1. **V3 Schema**: Add additional grouping (e.g., `events`, `audit`)
2. **Auto-Migration**: Transparent upgrade on read/write
3. **Schema Validation**: Runtime validation of migrated streams
4. **Migration Audit**: Track which streams have been migrated

## Troubleshooting

### Migration Failed

Check error details:

```typescript
const result = batchMigrateV1toV2(streams);
if (result.errors.length > 0) {
  result.errors.forEach(err => {
    console.log(`Stream ${err.id}: ${err.error}`);
  });
}
```

### Wrong Version Detected

Ensure stream has required fields:
- V1: Should have flat `status`, `recipient`, etc.
- V2: Should have `metadata`, `state`, `payment` objects

### Type Mismatches

Use type guards:

```typescript
import type { StreamV2 } from "@/app/lib/migration/schema";

const stream: any = getStream();
const version = detectVersion(stream);

if (version === 2) {
  const v2: StreamV2 = stream;
  // Type-safe access to v2 fields
}
```

## References

- `app/lib/migration/schema.ts` - Type definitions
- `app/lib/migration/engine.ts` - Transformation logic
- `app/types/openapi.ts` - Canonical Stream type
