# Notification Event Roadmap

This document maps StreamPay lifecycle events to their respective notification channels and default states.

## 1. Money Movement (Critical)
Events related to the actual flow of funds on the Stellar network.

| Event | In-App | Email | Default | Description |
| :--- | :---: | :---: | :--- | :--- |
| **Stream Started** | ✅ | ✅ | ON | Triggered when a new stream is successfully created and signed. |
| **Stream Paused** | ✅ | ✅ | ON | Triggered when a stream is paused by either party or due to an error. |
| **Funding Low** | ✅ | ✅ | ON | Warning when the source wallet balance falls below the threshold for 3 more intervals. |
| **Settlement Failed** | ✅ | ✅ | ON (CRIT) | **Critical**: Settlement failed on-chain (Horizon/Soroban error). Requires immediate action. |

## 2. Product Information (Optional)
Non-financial updates and community news.

| Event | In-App | Email | Default | Description |
| :--- | :---: | :---: | :--- | :--- |
| **Product Updates** | ✅ | ✅ | OFF | Monthly newsletter about new StreamPay features. |
| **Community News** | ✅ | ✅ | OFF | Updates from the StreamPay DAO and community events. |

## Channel Logic
- **In-App**: Persistent notification in the dashboard activity feed.
- **Email**: External notification via verified user email address.
- **Critical Failures**: Bypasses general "mute" settings (if implemented) to ensure financial security.
