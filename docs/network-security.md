# Stellar Network Security Configuration

## Overview

This document describes the security hardening implemented for Stellar network configuration in StreamPay-Frontend. The changes prevent dangerous configuration mistakes that could lead to real asset loss.

## Security Problem Statement

The following dangerous scenarios are now prevented:

1. **Using mainnet secret keys against testnet Horizon** - Could cause testnet transactions to be signed with production keys
2. **Using testnet Horizon with production wallet secrets** - Could leak production credentials to testnet
3. **Accidentally defaulting to mainnet when env vars are missing** - Could silently route to production
4. **Displaying testnet balances as if they are real user funds** - Financial UX confusion
5. **Hardcoded network passphrases scattered across handlers** - Maintenance risk and security holes

## Implementation

### 1. Centralized Network Configuration

**File:** `app/lib/config/stellar.ts`

All Stellar network configuration is centralized in a single module:

- **Testnet Profile**: `Test SDF Network ; September 2015`
- **Mainnet Profile**: `Public Global Stellar Network ; September 2015`
- Horizon URLs, friendbot availability, explorer URLs
- Asset labeling rules for UI safety

**Usage:**
```typescript
import { getNetworkProfile } from './config/stellar';

const profile = getNetworkProfile('testnet');
console.log(profile.horizonUrl); // https://horizon-testnet.stellar.org
```

### 2. Fail-Fast Configuration Validation

**File:** `app/lib/config/index.ts`

The `validateConfig()` function performs strict validation at application boot:

- **Required variables**: `STELLAR_NETWORK`, `JWT_SECRET`
- **No silent fallbacks**: Missing vars cause immediate failure
- **CI guardrails**: CI environment cannot use mainnet or production secrets
- **JWT_SECRET validation**: Must be 32+ characters in production
- **Anomaly threshold validation**: Must be positive numbers

**Bootstrap:**
```typescript
import { bootstrapApplication } from './config/bootstrap';

// Call at application startup
const config = bootstrapApplication();
```

### 3. Secret Redaction in Logging

**File:** `app/lib/logger.ts`

All logs automatically redact sensitive values:

- JWT secrets
- Private keys
- Passwords
- Auth tokens
- Seed phrases

**Example:**
```typescript
logger.info('Configuration loaded', {
  JWT_SECRET: 'my-secret-key', // Automatically redacted to [REDACTED]
  PUBLIC_KEY: 'GABC123', // Not redacted
});
```

### 4. String Literal Removal

All hardcoded network passphrases and Horizon URLs have been removed from:

- `app/lib/assets.ts` - Now uses `getConfig().network.horizonUrl`
- `app/api/auth/wallet/route.ts` - Now uses `getConfig().jwtSecret`
- `app/api/identity/me/route.ts` - Now uses `getConfig().jwtSecret`
- `detector.ts` - Now uses `getConfig().anomalyThresholds`

### 5. CI Guardrails

**File:** `.github/workflows/ci.yml`

CI is enforced to use testnet only:

- Explicit environment variables set for testnet
- Security check step validates no production secrets
- Fails if mainnet configuration detected
- Fails if production JWT_SECRET detected

### 6. UI Safety Labels

**File:** `app/components/NetworkBadge.tsx`

New components for financial safety:

- `NetworkBadge` - Displays "TESTNET ONLY" warning on testnet
- `AssetLabel` - Adds "TESTNET" suffix to asset codes on testnet

**Usage:**
```tsx
<NetworkBadge showLabel={true} />
<AssetLabel assetCode="XLM" />
```

## Environment Variables

### Required Variables

| Variable | Purpose | Required | Example |
|----------|---------|----------|---------|
| `STELLAR_NETWORK` | Network selection | Yes | `testnet`, `mainnet` |
| `JWT_SECRET` | JWT signing secret | Yes | 32+ character random string |

### Optional Variables

| Variable | Purpose | Default | Example |
|----------|---------|---------|---------|
| `SERVICE_NAME` | Service identifier | `streampay-frontend` | `streampay-frontend` |
| `NODE_ENV` | Environment | `development` | `production` |
| `INTERNAL_AUTH_TOKEN` | Service-to-service auth | - | Random string |
| `ANOMALY_CREATION_THRESHOLD` | Fraud detection limit | `50` | `100` |
| `ANOMALY_SETTLE_THRESHOLD` | Fraud detection limit | `20` | `30` |

## Network Profiles

### Testnet

- **Passphrase**: `Test SDF Network ; September 2015`
- **Horizon URL**: `https://horizon-testnet.stellar.org`
- **Friendbot**: Available
- **Explorer**: `https://stellar.expert/testnet`
- **Asset Label**: `TESTNET`
- **Production**: `false`

### Mainnet

- **Passphrase**: `Public Global Stellar Network ; September 2015`
- **Horizon URL**: `https://horizon.stellar.org`
- **Friendbot**: Not available
- **Explorer**: `https://stellar.expert`
- **Asset Label**: (empty)
- **Production**: `true`

## Setup Instructions

### Local Development (Testnet)

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Configure for testnet:
   ```env
   STELLAR_NETWORK=testnet
   JWT_SECRET=dev-secret-key-at-least-32-chars
   NODE_ENV=development
   ```

3. Start the application:
   ```bash
   npm run dev
   ```

### Production Deployment (Mainnet)

1. Set production environment variables:
   ```env
   STELLAR_NETWORK=mainnet
   JWT_SECRET=<secure-32-char-random-string>
   NODE_ENV=production
   ```

2. Generate a secure JWT secret:
   ```bash
   openssl rand -base64 32
   ```

3. Deploy via your hosting platform

## Security Checklist

Before deploying to production:

- [ ] `STELLAR_NETWORK` is set to `mainnet` (if deploying to mainnet)
- [ ] `JWT_SECRET` is at least 32 characters
- [ ] `JWT_SECRET` is NOT the default value
- [ ] `NODE_ENV` is set to `production`
- [ ] No testnet secrets are used with mainnet configuration
- [ ] Horizon URL matches the selected network
- [ ] Internal auth tokens are set if using service mesh
- [ ] Anomaly thresholds are appropriate for your traffic
- [ ] CI is configured to use testnet only
- [ ] `.env.local` is in `.gitignore`
- [ ] No real credentials in `.env.example`

## Validation Rules

The following validation rules are enforced at boot:

1. **Missing STELLAR_NETWORK** → Fail with error
2. **Missing JWT_SECRET** → Fail with error
3. **Invalid network selection** → Fail with error
4. **JWT_SECRET too short** → Fail with error
5. **Production with default JWT_SECRET** → Fail with error
6. **CI with mainnet network** → Fail with error
7. **CI with production JWT_SECRET** → Fail with error
8. **Invalid anomaly thresholds** → Fail with error

## Error Messages

### Configuration Errors

- `STELLAR_NETWORK environment variable is required`
- `Invalid STELLAR_NETWORK: <value>. Supported networks: testnet, mainnet`
- `JWT_SECRET environment variable is required`
- `JWT_SECRET must be at least 32 characters for security`
- `Production environment cannot use default JWT_SECRET`
- `CI environment detected with mainnet network configuration`
- `CI environment detected with production JWT_SECRET`
- `ANOMALY_CREATION_THRESHOLD must be a positive number`
- `ANOMALY_SETTLE_THRESHOLD must be a positive number`

## Testing

### Unit Tests

Run configuration validation tests:
```bash
npm test -- app/lib/config/config.test.ts
```

Test coverage includes:
- Network profile validation
- Required variable validation
- CI guardrail validation
- Anomaly threshold validation
- Secret redaction
- Config caching

### Integration Tests

Test application boot scenarios:
```bash
npm test
```

## Troubleshooting

### Error: "STELLAR_NETWORK environment variable is required"

**Fix**: Set `STELLAR_NETWORK=testnet` or `STELLAR_NETWORK=mainnet` in `.env.local`

### Error: "JWT_SECRET must be at least 32 characters"

**Fix**: Generate a longer secret using `openssl rand -base64 32`

### Error: "CI environment detected with mainnet network configuration"

**Fix**: CI is restricted to testnet. Use testnet in CI or deploy manually.

### Error: "Production environment cannot use default JWT_SECRET"

**Fix**: Set a custom `JWT_SECRET` when `NODE_ENV=production`

## Migration Guide

If you have existing code using hardcoded values:

### Before
```typescript
const horizonUrl = 'https://horizon-testnet.stellar.org';
const jwtSecret = process.env.JWT_SECRET || 'default-secret';
```

### After
```typescript
import { getConfig } from './config';

const config = getConfig();
const horizonUrl = config.network.horizonUrl;
const jwtSecret = config.jwtSecret;
```

## Security Notes

### Authentication & Keys

- JWT secrets are never logged (automatically redacted)
- Wallet signing keys are handled by the Stellar SDK (not stored in this frontend)
- No private keys are stored in environment variables
- All secrets are validated at boot

### Chain Settlement

- Network passphrases are centralized to prevent mismatched signing
- Horizon URLs are validated against network selection
- No silent fallback to mainnet under any circumstance

### Money Movement

- Testnet assets are clearly labeled in the UI
- Network badges show "TESTNET ONLY" on testnet
- Asset labels include "TESTNET" suffix on testnet
- Production deployments require explicit mainnet configuration

## Reviewer Checklist

When reviewing changes to network configuration:

- [ ] No hardcoded network passphrases in new code
- [ ] No hardcoded Horizon URLs in new code
- [ ] All config imports from `./config/stellar.ts`
- [ ] No unsafe fallback defaults for secrets
- [ ] CI environment variables are testnet-only
- [ ] Secret redaction is used in any new logging
- [ ] UI safety labels are present on asset displays
- [ ] Tests cover new validation rules
- [ ] Documentation is updated

## Future Network Support

The architecture supports adding future Stellar networks:

1. Add network profile to `app/lib/config/stellar.ts`
2. Update `StellarNetwork` type
3. Add to `NETWORK_PROFILES` registry
4. Update documentation

Example:
```typescript
export const FUTURENET_PROFILE: StellarNetworkProfile = {
  name: 'future',
  passphrase: 'Future Network Passphrase',
  horizonUrl: 'https://horizon-future.stellar.org',
  hasFriendbot: true,
  explorerUrl: 'https://stellar.expert/future',
  assetLabel: 'FUTURE',
  isProduction: false,
};
```
