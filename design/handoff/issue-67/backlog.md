# Implementation Roadmap & Backlog

## Child Issues (Recommended)

### FE-1: Notification Settings UI
- Implement the toggles and sections defined in `design_spec.md`.
- Connect to a (future) user preferences API.
- Implement loading/success/error states.

### FE-2: In-App Toast System
- Create a global toast provider and component.
- Style toasts according to the "Success" state in the mockups.

### BE-1: Notification Preference API
- Create endpoints to GET/PATCH user notification settings.
- Implement validation for event types.

### BE-2: Stellar Failure Watcher
- Service to monitor Horizon/Soroban for failed settlements.
- Trigger email/push notifications for critical events.

## Event Mapping
- **Stream Started**: In-App + Email (Default: ON)
- **Stream Paused**: In-App + Email (Default: ON)
- **Funding Low**: In-App (Default: ON)
- **Settlement Failed**: Email (Default: ON, Critical)
- **Product Updates**: Email (Default: OFF)
