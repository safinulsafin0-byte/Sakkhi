# Sakkhi Security & Edge Cases Specification

## 1. Zero-Secret Logging
- **OAuth2 Token Isolation**: Basic authentication strings (`base64(client_id:client_secret)`) and Bearer access tokens are strictly isolated in memory and stripped before any logging output.
- **Error Obfuscation**: PayPal API errors return generic error descriptions to client consumers without leaking credentials or raw stack traces.
- **Health Endpoint**: The `/api/health` endpoint reports boolean configuration flags (`paypal: true | false`) and never outputs environment variables or keys.

---

## 2. Payment Integrity & Amount Tampering Protection
- **Server-Side Authorization**: The donation amount is recorded in the database when `/api/donations/create-order` executes.
- **Strict Capture Verification**: When `/api/donations/capture-order` runs, the server verifies:
  1. `capture.status === "COMPLETED"`
  2. `capture.amount.currency_code === "USD"`
  3. `capturedCents === donation.amountUsdCents`
  Any attempt by an attacker to approve an order for \$0.01 instead of \$10.00 is immediately rejected with an `Amount mismatch` error.

---

## 3. Idempotency & Double-Spending Prevention
- **`PayPal-Request-Id`**: Every mutation call to PayPal (`createOrder`, `captureOrder`) attaches a unique request ID to ensure retried network calls never duplicate orders or payments.
- **Database Unique Constraints**: `Donation.paypalOrderId`, `Donation.idempotencyKey`, and `LedgerEntry.idempotencyKey` are guarded by unique constraints.
- **Repeat Submissions**: Calling `/api/donations/capture-order` repeatedly with the same `orderId` returns the existing verified receipt idempotently without duplicating ledger credits.

---

## 4. Webhook Security
- **PayPal Signature Verification**: The `/api/webhooks/paypal` endpoint validates the cryptographic transmission signature via PayPal's `/v1/notifications/verify-webhook-signature` using the official certificate URL and transmission tokens.
- **Replay Protection**: Webhook events store `idempotencyKey` derived from the PayPal capture or refund ID (`cap-<id>`, `ref-<id>`). Duplicate webhook deliveries are safely ignored.

---

## 5. Integer Money Rules & Non-Negative Balance
- **Integer Storage**: BDT is stored as integer Poisha ($1\text{ BDT} = 100\text{ poisha}$) and USD is stored as integer Cents ($1\text{ USD} = 100\text{ cents}$) to eliminate floating-point rounding errors.
- **Non-Negative Invariant**: `availableBalance = netRaised - activeReserved - totalReleased >= 0`. Refunds or disbursements that would push available balance below zero throw explicit errors and roll back transactions.

