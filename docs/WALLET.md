# Wallet Integration Guide

Complete documentation for integrating Stellar wallets into the Predictify frontend using the `useWallet` hook and wallet context layer.

## Table of Contents

- [Overview](#overview)
- [Supported Wallets](#supported-wallets)
- [Architecture](#architecture)
- [Network Configuration](#network-configuration)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Persistence and Reconnect](#persistence-and-reconnect)
- [Known Limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)

## Overview

The wallet layer provides a streamlined interface for connecting to Stellar wallets and signing transactions. It consists of three core components:

1. **`getKit()`** (`constants/wallet-kits.constant.ts`) - Initializes and manages the `StellarWalletsKit` singleton instance with SSR safety
2. **`useWallet` hook** (`hooks/useWallet.hook.ts`) - React hook exposing wallet connection, disconnection, and transaction signing
3. **`WalletContext`** (`context/WalletContext.tsx`) - React context that manages wallet state persistence in localStorage and automatic reconnection on mount

## Supported Wallets

The wallet layer supports the following Stellar wallets via `@creit.tech/stellar-wallets-kit`:

| Wallet | ID | Notes |
|--------|-----|-------|
| **Freighter** | `freighter` | Default wallet, requires Freighter browser extension |
| **LOBSTR** | `lobstr` | LOBSTR wallet support |
| **XBull** | `xbull` | XBull wallet support |
| **Albedo** | `albedo` | Albedo wallet support |
| **Rabet** | `rabet` | Rabet wallet support |

The wallet ID constants are imported from `@creit.tech/stellar-wallets-kit`:
```typescript
import {
  FREIGHTER_ID,
  LOBSTR_ID,
  XBULL_ID,
  ALBEDO_ID,
  RABET_ID,
} from "@creit.tech/stellar-wallets-kit";
```

## Architecture

### Component Interaction Flow

```
Component
  ↓ (uses)
useWallet Hook
  ↓ (reads state from & calls methods on)
WalletContext
  ↓ (uses)
getKit() / StellarWalletsKit
  ↓
User's Wallet (Browser Extension)
```

### getKit() - SSR Guard

The `getKit()` function in `constants/wallet-kits.constant.ts` initializes the `StellarWalletsKit` singleton on the client side only:

```typescript
import { StellarWalletsKit, WalletNetwork, allowAllModules } from "@creit.tech/stellar-wallets-kit";
import { getClientConfig } from "@/lib/config";

let kit: StellarWalletsKit | null = null;

export const getKit = (): StellarWalletsKit => {
  if (typeof window === 'undefined') {
    throw new Error('StellarWalletsKit can only be used on the client side');
  }
  
  if (!kit) {
    const config = getClientConfig();
    const network = config.stellar.network === 'mainnet' 
      ? WalletNetwork.MAINNET 
      : WalletNetwork.TESTNET;
    
    kit = new StellarWalletsKit({
      network,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  
  return kit;
};
```

**Key Points:**
- Throws an error if called on the server (SSR guard)
- Lazy initializes the kit singleton on first client-side access
- Automatically selects the network based on `NEXT_PUBLIC_STELLAR_NETWORK` environment variable
- Enables all wallet modules via `allowAllModules()`

## Network Configuration

### Environment Variables

Network configuration is controlled via the `NEXT_PUBLIC_STELLAR_NETWORK` environment variable:

```bash
# In your .env.local or deployment environment
NEXT_PUBLIC_STELLAR_NETWORK=testnet  # or 'mainnet'
```

### Configuration Loading

The network is read and validated in `lib/config.ts`:

```typescript
type Network = 'testnet' | 'mainnet';

function getStellarNetwork(): Network {
  const network = env.NEXT_PUBLIC_STELLAR_NETWORK.toLowerCase();
  
  if (network === 'mainnet' || network === 'testnet') {
    return network as Network;
  }
  
  // Default to testnet for safety
  return 'testnet';
}

export function getClientConfig() {
  const network = env.NEXT_PUBLIC_STELLAR_NETWORK.toLowerCase();
  
  return {
    stellar: {
      network: (network === 'mainnet' || network === 'testnet' 
        ? network 
        : 'testnet') as Network,
    },
  };
}
```

The network setting is used by `getKit()` to initialize the wallet kit with the appropriate `WalletNetwork` value.

## API Reference

### useWallet Hook

The `useWallet` hook provides the main interface for wallet interactions. It must be called from a component within a `WalletProvider`.

#### Hook Returns

```typescript
interface UseWalletReturn {
  // Methods
  connectWallet: (walletId: string) => Promise<ConnectResult>;
  disconnectWallet: () => Promise<DisconnectResult>;
  signTransaction: (xdr: string) => Promise<SignResult>;
  
  // State
  isConnecting: boolean;
  error: string | null;
  isConnected: boolean;
  walletAddress: string | null;
  walletName: string | null;
}
```

#### connectWallet(walletId: string)

Initiates connection to a wallet.

**Parameters:**
- `walletId`: One of `FREIGHTER_ID`, `LOBSTR_ID`, `XBULL_ID`, `ALBEDO_ID`, or `RABET_ID`

**Returns:**
```typescript
type ConnectResult = 
  | { success: true; address: string }
  | { success: false; error: string };
```

**Example:**
```typescript
const result = await connectWallet(FREIGHTER_ID);
if (result.success) {
  console.log('Connected wallet address:', result.address);
} else {
  console.error('Connection failed:', result.error);
}
```

**Side Effects:**
- Updates `WalletContext` state (address, name, connected)
- Persists wallet state to `localStorage` under key `'predictify_wallet_state'`
- Sets `isConnecting` to `true` during connection, `false` after

#### disconnectWallet()

Disconnects the currently connected wallet.

**Returns:**
```typescript
type DisconnectResult = 
  | { success: true }
  | { success: false; error: string };
```

**Example:**
```typescript
const result = await disconnectWallet();
if (result.success) {
  console.log('Wallet disconnected');
} else {
  console.error('Disconnection failed:', result.error);
}
```

**Side Effects:**
- Clears wallet state in `WalletContext`
- Removes wallet state from `localStorage`
- Calls the underlying `kit.disconnect()`

#### signTransaction(xdr: string)

Signs a transaction for the connected wallet.

**Parameters:**
- `xdr`: The Stellar transaction envelope in XDR format

**Returns:**
```typescript
type SignResult = 
  | { success: true; signedTxXdr: string }
  | { success: false; error: string };
```

**Example:**
```typescript
const result = await signTransaction(txXdr);
if (result.success) {
  console.log('Transaction signed:', result.signedTxXdr);
  // Now you can submit to the Stellar network
} else {
  console.error('Signing failed:', result.error);
}
```

**Requirements:**
- Must have an active wallet connection (`isConnected === true`)
- Throws error: `"No wallet connected"` if called without a connected wallet

**⚠️ Known Limitation:**
- Currently hardcodes `WalletNetwork.TESTNET` as the network passphrase, regardless of the configured network
- This will be fixed in a future release to use the network configuration from `getClientConfig()`

### State Properties

All state properties are reactive and update automatically:

- **`isConnecting`** (`boolean`) - `true` while a connection request is in progress
- **`error`** (`string | null`) - Most recent error message, or `null` if no error
- **`isConnected`** (`boolean`) - `true` if a wallet is currently connected
- **`walletAddress`** (`string | null`) - Stellar public address of connected wallet, or `null`
- **`walletName`** (`string | null`) - Human-readable name of connected wallet (e.g., "Freighter"), or `null`

## Usage Examples

### Basic Connect/Disconnect

```typescript
"use client";

import { useWallet } from "@/hooks/useWallet.hook";
import { FREIGHTER_ID } from "@creit.tech/stellar-wallets-kit";
import { Button } from "@/components/ui/button";

export function WalletConnectButton() {
  const { connectWallet, disconnectWallet, isConnected, walletName, isConnecting } = useWallet();

  const handleConnect = async () => {
    const result = await connectWallet(FREIGHTER_ID);
    if (!result.success) {
      alert(`Connection failed: ${result.error}`);
    }
  };

  const handleDisconnect = async () => {
    const result = await disconnectWallet();
    if (!result.success) {
      alert(`Disconnection failed: ${result.error}`);
    }
  };

  return (
    <div>
      {isConnected ? (
        <div>
          <p>Connected: {walletName}</p>
          <Button onClick={handleDisconnect}>Disconnect</Button>
        </div>
      ) : (
        <Button onClick={handleConnect} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      )}
    </div>
  );
}
```

### Multi-Wallet Connection Modal

```typescript
"use client";

import { useWallet } from "@/hooks/useWallet.hook";
import { FREIGHTER_ID, LOBSTR_ID, XBULL_ID, ALBEDO_ID, RABET_ID } from "@creit.tech/stellar-wallets-kit";
import { Button } from "@/components/ui/button";

const WALLET_OPTIONS = [
  { id: FREIGHTER_ID, name: "Freighter" },
  { id: LOBSTR_ID, name: "LOBSTR" },
  { id: XBULL_ID, name: "XBull" },
  { id: ALBEDO_ID, name: "Albedo" },
  { id: RABET_ID, name: "Rabet" },
];

export function WalletSelector() {
  const { connectWallet, isConnecting, error } = useWallet();

  const handleSelectWallet = async (walletId: string) => {
    const result = await connectWallet(walletId);
    if (!result.success) {
      console.error(`Failed to connect: ${result.error}`);
    }
  };

  return (
    <div>
      {error && <div className="text-red-600">{error}</div>}
      <div className="grid grid-cols-2 gap-2">
        {WALLET_OPTIONS.map((wallet) => (
          <Button
            key={wallet.id}
            onClick={() => handleSelectWallet(wallet.id)}
            disabled={isConnecting}
          >
            {wallet.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

### Transaction Signing

```typescript
"use client";

import { useWallet } from "@/hooks/useWallet.hook";
import { Button } from "@/components/ui/button";

export function SignTransactionButton({ txXdr }: { txXdr: string }) {
  const { signTransaction, isConnected, error } = useWallet();

  const handleSign = async () => {
    const result = await signTransaction(txXdr);
    if (result.success) {
      console.log("Transaction signed:", result.signedTxXdr);
      // Next step: submit to Stellar network (not yet implemented)
    } else {
      console.error("Signing failed:", result.error);
    }
  };

  return (
    <div>
      {error && <div className="text-red-600">{error}</div>}
      <Button onClick={handleSign} disabled={!isConnected}>
        Sign Transaction
      </Button>
    </div>
  );
}
```

### Using WalletProvider

Wrap your app or page with `WalletProvider`:

```typescript
import { WalletProvider } from "@/context/WalletContext";
import WalletConnectButton from "./wallet-connect-button";

export default function App() {
  return (
    <WalletProvider>
      <WalletConnectButton />
    </WalletProvider>
  );
}
```

## Persistence and Reconnect

### How It Works

The `WalletContext` manages wallet state persistence and automatic reconnection:

1. **On Mount**: The context component reads the stored wallet state from `localStorage` under the key `'predictify_wallet_state'`
2. **On Connection/Disconnection**: State changes are immediately persisted to `localStorage`
3. **Automatic Reconnect**: On subsequent page loads, if a previous connection was stored, the wallet state is restored automatically

### Storage Format

The wallet state is stored as JSON in `localStorage`:

```json
{
  "address": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "name": "Freighter",
  "connected": true
}
```

### Implementation Details

From `context/WalletContext.tsx`:

```typescript
const WALLET_STORAGE_KEY = 'predictify_wallet_state';

// Load on mount
useEffect(() => {
  try {
    const savedState = localStorage.getItem(WALLET_STORAGE_KEY);
    if (savedState) {
      const { address, name, connected } = JSON.parse(savedState);
      if (connected && address && name) {
        setAddress(address);
        setName(name);
        setConnected(true);
      }
    }
  } catch (error) {
    console.error('Error loading wallet state:', error);
  } finally {
    setIsLoading(false);
  }
}, []);

// Save on change
useEffect(() => {
  if (!isLoading) {
    const state = { address, name, connected };
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(state));
  }
}, [address, name, connected, isLoading]);
```

### User Experience

- Users stay logged in after page refresh
- Connection state persists across browser sessions
- Disconnection clears all stored state
- Loading state (`isLoading`) indicates when the context is initializing from storage

## Known Limitations

### 1. Hardcoded Testnet in signTransaction

**Issue:** The `signTransaction` method currently hardcodes `WalletNetwork.TESTNET` regardless of the configured network:

```typescript
const { signedTxXdr } = await kit.signTransaction(xdr, {
  address: walletState.address,
  networkPassphrase: WalletNetwork.TESTNET,  // ← Always testnet
});
```

**Impact:** Transactions will fail if the app is configured for mainnet, as the network passphrase must match the transaction's network.

**Status:** This will be fixed in a future release to respect `getClientConfig().stellar.network`.

### 2. Submit/Broadcast Not Implemented

**Issue:** The wallet layer does not provide a method to submit signed transactions to the Stellar network. The `signTransaction` return shape includes `signedTxXdr`, but no corresponding broadcast/submit method exists.

**Current Approach:** Applications must:
1. Call `signTransaction(xdr)` to get the signed XDR
2. Manually submit to a Stellar RPC endpoint (e.g., Horizon API)

**Future Work:** A `submitTransaction()` method may be added in a future release to streamline this process.

### 3. Dead Code

The top of `hooks/useWallet.hook.ts` contains a commented-out block showing an older, abandoned approach to wallet integration (lines 1-55). This code is not used and serves only as historical reference. It should be removed in a future cleanup.

## Troubleshooting

### "StellarWalletsKit can only be used on the client side"

**Cause:** You called `getKit()` or `useWallet` in a Server Component.

**Solution:** Ensure the component is marked with `"use client"`:
```typescript
"use client";
import { useWallet } from "@/hooks/useWallet.hook";
// ...
```

### "useWalletContext must be used within a WalletProvider"

**Cause:** You used `useWallet` in a component that is not wrapped by `WalletProvider`.

**Solution:** Wrap your component tree with `WalletProvider`:
```typescript
import { WalletProvider } from "@/context/WalletContext";

export default function App() {
  return (
    <WalletProvider>
      <YourComponent />
    </WalletProvider>
  );
}
```

### Wallet connection succeeds but `signTransaction` fails

**Cause:** Likely due to the hardcoded testnet limitation described above.

**Solution:** 
- Verify your app is configured for testnet via `NEXT_PUBLIC_STELLAR_NETWORK=testnet`
- Check that the transaction XDR was also created for testnet
- Ensure the wallet extension is also connected to testnet

### State not persisting after page reload

**Cause:** `localStorage` may not be enabled in the browser, or consent was denied.

**Solution:**
- Check that browser storage is allowed
- Verify no privacy/incognito mode is interfering
- Check browser console for `localStorage` access errors

## Environment Setup

### Required Environment Variables

```bash
# Network configuration
NEXT_PUBLIC_STELLAR_NETWORK=testnet
```

### Optional Environment Variables

```bash
# App branding
NEXT_PUBLIC_APP_NAME=Predictify
NEXT_PUBLIC_APP_URL=https://predictify.example.com

# API endpoint
NEXT_PUBLIC_API_URL=https://api.predictify.example.com
```

## Testing with pnpm

```bash
# Install dependencies
pnpm install

# Run linting
pnpm lint

# Build the project
pnpm build

# Run tests
pnpm test
```

## References

- **StellarWalletsKit Documentation:** https://github.com/CreitTech/stellar-wallets-kit
- **Stellar Documentation:** https://developers.stellar.org/
- **Hook Implementation:** `hooks/useWallet.hook.ts`
- **Context Implementation:** `context/WalletContext.tsx`
- **Configuration:** `lib/config.ts`
- **Wallet Kit Initialization:** `constants/wallet-kits.constant.ts`

---

**Last Updated:** June 2026  
**Status:** Stable with Known Limitations  
**Version:** 1.0
