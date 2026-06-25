# Supported Assets (v1)

StreamPay supports Stellar Native (XLM) and any valid Stellar Classic assets (Alpha-numeric 4 or 12). 

## Asset Types

### 1. Stellar Native (XLM)
- **Code**: `XLM`
- **Trustline**: Required by default for all Stellar accounts. No pre-flight needed.
- **Precision**: 7 decimal places (Stroops).

### 2. Stellar Classic Assets (Custom)
- **Format**: `CODE:ISSUER_ADDRESS`
- **Trustline**: The recipient **must** establish a trustline for the specific asset before a stream can be successfully funded or paid out.
- **Pre-flight Check**: StreamPay-Frontend performs an automated check against Horizon to verify trustline existence.

## Validation Matrix

| Case | Result | Actionable Error |
| :--- | :--- | :--- |
| Valid XLM | Success | N/A |
| Valid USDC:G... | Success (if trustline exists) | N/A |
| Missing Trustline | Reject | "Missing trustline for [CODE]." |
| Account Not Found | Reject | "Recipient account does not exist on-chain." |
| Invalid Format | Reject | "Invalid asset format. Expected CODE:ISSUER" |

## Minimum Reserves
Users must maintain the Stellar base reserve + increments for each trustline. StreamPay does not currently sponsor reserves for trustlines in v1.
