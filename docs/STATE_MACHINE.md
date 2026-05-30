# Stream State Machine

This document defines the authoritative state machine for StreamPay streams. All state transitions are enforced at the service layer to ensure consistency and prevent illegal operations.

## Transition Matrix

| Current State | Start | Pause | Stop | Settle | Withdraw |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Draft** | Active | ❌ | Ended | ❌ | ❌ |
| **Active** | (Idem) | Paused | Ended | Ended | ❌ |
| **Paused** | Active | (Idem) | Ended | Ended | ❌ |
| **Ended** | ❌ | ❌ | (Idem) | (Idem) | Withdrawn |
| **Withdrawn** | ❌ | ❌ | ❌ | ❌ | (Idem) |

*Legend:*
- **State Name**: Resulting state if the transition is legal.
- **(Idem)**: Idempotent transition (success with no state change).
- **❌**: Illegal transition (rejected with `409 Conflict`).

## Dashboard Copy Mapping

These mappings ensure that the internal technical states align with the user-visible copy in the StreamPay dashboard.

| Internal State | Dashboard Badge | Description | Primary Action |
| :--- | :--- | :--- | :--- |
| `draft` | **Draft** | Ready to be launched. | **Start** |
| `active` | **Active** | Funds are flowing. | **Pause** |
| `paused` | **Paused** | Streaming is suspended. | **Resume** (Start) |
| `ended` | **Ended** | Stream finished; funds awaiting claim. | **Withdraw** |
| `withdrawn` | **Withdrawn** | Funds have been claimed by recipient. | None |

## Technical Implementation

The state machine is implemented in [`app/lib/state-machine.ts`](../app/lib/state-machine.ts) and is consumed by:
- `StreamService`: Centralized service for applying user actions.
- `InMemoryStreamStore`: Event-driven store for background processing.

### Error Handling
Illegal transitions return a standardized error model:
```json
{
  "error": {
    "code": "ILLEGAL_TRANSITION",
    "message": "Action 'pause' is illegal for a stream in 'draft' state.",
    "request_id": "..."
  }
}
```
