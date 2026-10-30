# Sakkhi API Documentation

## Overview
All financial transactions and evidence verification interactions in Sakkhi are exposed via standard Next.js Route Handlers. All mutating operations enforce idempotency keys and strict input validation via Zod.

---

## 1. Donations & PayPal Integration

### 1.1 Create Order
Creates a PayPal Sandbox order (`intent: "CAPTURE"`) and reserves a pending donation record.

- **Endpoint**: `POST /api/donations/create-order`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "campaignId": "flood-relief-kurigram",
    "amount": 500,
    "currency": "BDT",
    "donorName": "Hasan Mahmud",
    "donorEmail": "hasan@example.com",
    "message": "For clean drinking water in Roumari",
    "giveAnonymously": false
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "orderId": "8AB1234567890",
    "donationId": "cm1...",
    "amountBdt": 500,
    "amountUsd": "4.17",
    "campaignTitle": "Flood relief, Kurigram"
  }
  ```

---

### 1.2 Capture Order
Captures an approved PayPal order server-side, validates the captured amount against the stored expectation, writes a double-entry ledger credit, and returns a verified receipt.

- **Endpoint**: `POST /api/donations/capture-order`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "orderId": "8AB1234567890"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "donationId": "cm1...",
    "paypalOrderId": "8AB1234567890",
    "captureId": "CAP-0012345",
    "donorName": "Hasan Mahmud",
    "amountBdt": 500,
    "amountUsd": "4.17",
    "campaignTitle": "Flood relief, Kurigram",
    "receiptCode": "SKH-7890",
    "status": "COMPLETED"
  }
  ```

---

### 1.3 PayPal Webhook Receiver
Asynchronously receives PayPal lifecycle notifications, verifies the cryptographic signature via PayPal, and idempotently confirms captures or processes refunds.

- **Endpoint**: `POST /api/webhooks/paypal`
- **Headers**:
  - `paypal-auth-algo`
  - `paypal-cert-url`
  - `paypal-transmission-id`
  - `paypal-transmission-sig`
  - `paypal-transmission-time`
- **Handled Events**:
  - `PAYMENT.CAPTURE.COMPLETED`: Marks donation `COMPLETED` and creates ledger credit if not already captured.
  - `PAYMENT.CAPTURE.REFUNDED`: Marks donation `REFUNDED` and writes a `REFUND` debit to the double-entry ledger.
- **Response `200 OK`**:
  ```json
  {
    "received": true,
    "event": "PAYMENT.CAPTURE.COMPLETED"
  }
  ```

---

## 2. Health & Diagnostic Check

### 2.1 System Health
Returns app runtime status, SQLite database connectivity, and active integration flags. Never exposes secret keys.

- **Endpoint**: `GET /api/health`
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-30T00:00:00.000Z",
    "uptimeSeconds": 1420,
    "environment": "development",
    "database": {
      "status": "connected",
      "connected": true
    },
    "integrations": {
      "ai": true,
      "paypal": true,
      "demoMode": true
    }
  }
  ```

