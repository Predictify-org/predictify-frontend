# Wallet MRU Local State

This document describes the frontend state management for the Wallet Modal's MRU (Most Recently Used) feature.

## Storage
We use the browser's `localStorage` to persist the user's most recently selected wallet provider across sessions.

- **Storage Key**: `streampay_mru_wallet`
- **Value**: The string `id` of the selected `WalletProvider` (e.g., `"freighter"`, `"albedo"`).

## Behavior
- Upon opening the `WalletModal`, the providers list is dynamically sorted.
- If a provider's `id` matches the value in `localStorage`, it is hoisted to the top of the list.
- When the user selects a wallet, the new `id` is saved to `localStorage`, making it the MRU wallet for the next modal opening.
- If `localStorage` is unavailable or empty, the default ordering is maintained.
