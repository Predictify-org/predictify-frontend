# Multi-Recipient Stream Creation API

This document details the expected payload for the POST request to create a multi-recipient (fan-out) stream.

## Endpoint
`POST /api/v1/streams/multi`

## Request Payload

```json
{
  "name": "GrantFox Q3 Distribution",
  "token": "XLM",
  "totalAmount": "10000.00",
  "recipients": [
    {
      "address": "GABC...123",
      "percentage": 50.00,
      "amount": "5000.00"
    },
    {
      "address": "GDEF...456",
      "percentage": 50.00,
      "amount": "5000.00"
    }
  ]
}
```

### Field Descriptions

- `name` (string, required): The human-readable name of the stream.
- `token` (string, required): The asset symbol (e.g., `XLM`, `USDC`).
- `totalAmount` (string, required): The total amount to be streamed across all recipients. Represented as a string to avoid precision loss.
- `recipients` (array, required): Array of recipient objects.
  - `address` (string, required): Stellar public key or registered email address of the recipient.
  - `percentage` (number, required): The share of the total amount allocated to this recipient (0-100).
  - `amount` (string, required): The exact amount allocated to this recipient.

## Response

### Success (201 Created)

```json
{
  "id": "stream-multi-789",
  "status": "draft",
  "message": "Multi-recipient stream created successfully."
}
```

### Error (400 Bad Request)

Returned if the total percentage allocated to recipients does not equal 100%.

```json
{
  "error": "InvalidAllocation",
  "message": "Total allocated percentage must equal 100%."
}
```
