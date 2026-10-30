# Sakkhi Security & Edge Cases Audit Report

**Audit Date**: October 30, 2026  
**Auditor**: Sakkhi Core Engineering Team  
**Scope**: Full codebase audit against `docs/SECURITY_AND_EDGE_CASES.md`, API attack surfaces, financial integrity invariants, and AI verification edge cases.

---

## 1. Compliance Matrix: `docs/SECURITY_AND_EDGE_CASES.md`

| Specification Item | Status | Implementation Location | Verification & Defense Details |
| :--- | :---: | :--- | :--- |
| **OAuth2 Token Isolation** | ✅ Implemented | `lib/paypal/client.ts:40-100` | Basic auth strings and access tokens are held exclusively in memory; token fetch logs are sanitized to prevent credential leakage. |
| **Error Obfuscation** | ✅ Implemented | `app/api/donations/*`, `app/api/admin/*`, `app/api/proofs/*` | Errors return generic, user-friendly descriptions without exposing database internals, filesystem paths, or PayPal API secrets. |
| **Health Endpoint Isolation** | ✅ Implemented | `app/api/health/route.ts:1-40` | Reports boolean connectivity flags (`paypal: true/false`, `ai: true/false`, `database: true/false`); never returns keys or environment variables. |
| **Server-Side Order Authorization** | ✅ Implemented | `app/api/donations/create-order/route.ts:47-115` | Amount and currency are locked in `Donation` table at creation time; client cannot dictate final captured amount. |
| **Strict Capture Verification** | ✅ Implemented | `app/api/donations/capture-order/route.ts:60-120` | Server enforces `capture.status === "COMPLETED"`, `capture.amount.currency_code === "USD"`, and exact cent-level matching (`capturedCents === donation.amountUsdCents`). Mismatches reject immediately. |
| **PayPal-Request-Id Idempotency** | ✅ Implemented | `lib/paypal/client.ts:150-180`, `lib/paypal/payouts.ts:230-245` | Unique request IDs are passed on every mutation (`createOrder`, `captureOrder`, `payoutBatch`, `refund`). Network retries never duplicate transactions. |
| **Database Unique Constraints** | ✅ Implemented | `prisma/schema.prisma:121-156` | `Donation.paypalOrderId`, `Donation.idempotencyKey`, `LedgerEntry.idempotencyKey`, `Payout.senderBatchId`, and `Payout.senderItemId` are all `@unique`. |
| **Repeat Submission Handling** | ✅ Implemented | `app/api/donations/capture-order/route.ts:42-55` | Repeated calls with the same `orderId` return the existing receipt idempotently without duplicate ledger credits. |
| **PayPal Webhook Signature Verification** | ✅ Implemented | `lib/paypal/client.ts:355-385`, `app/api/webhooks/paypal/route.ts:20-65` | Incoming webhooks are cryptographically verified using PayPal's `/v1/notifications/verify-webhook-signature` with transmission headers. |
| **Webhook Replay Protection** | ✅ Implemented | `app/api/webhooks/paypal/route.ts:61-110` | Webhook entries derive deterministic keys (`cap-<id>`, `payout-<id>`); duplicate deliveries are safely ignored. |
| **Integer Money Rules** | ✅ Implemented | `lib/config.ts`, `lib/ledger.ts:1-135` | All BDT is stored as integer Poisha ($1\text{ BDT} = 100\text{ poisha}$) and USD as integer Cents ($1\text{ USD} = 100\text{ cents}$) to eliminate floating-point rounding errors. |
| **Non-Negative Balance Invariant** | ✅ Implemented | `lib/ledger.ts:59-132`, `lib/ledger.ts:484-489` | Enforces `availableBalance = netRaised - activeReserved - totalReleased >= 0`. Any disbursement or refund that would result in a negative balance throws an explicit error and aborts transaction. |

---

## 2. Gaps Fixed & Security Hardening

### A. Input Validation with Zod on Every Route
Every single API endpoint now enforces strict runtime schema validation using Zod:
- `/api/donations/create-order`: Validates `campaignId`, positive `amount`, `currency` (`"BDT" | "USD"`), optional trimmed `donorName`, email, and note.
- `/api/donations/capture-order`: Validates required `orderId`.
- `/api/proofs`: Validates `milestoneId`, file size ($\le 8$ MB), file count ($\le 6$), notes, and optional signed volunteer token.
- `/api/verifications`: Validates `milestoneId`, optional `provider` enum, and `volunteerNote`.
- `/api/payouts/[milestoneId]`: Validates path parameter `milestoneId` and optional `coordinatorOverrideReason`.
- `/api/admin/login`: Validates non-empty `passcode`.
- `/api/admin/campaigns`: Validates campaign title, location, description, and milestone list.
- `/api/admin/invite-link`: Validates required `volunteerId`.
- `/api/admin/verifications/override`: Validates `verificationId`, `action` (`"approve" | "reject"`), and minimum 5-character audit reason.
- `/api/webhooks/paypal`: Validates JSON structure, required `event_type`, and `resource` dictionary.

### B. In-Memory Sliding-Window Rate Limiting
- **Module**: `lib/rateLimit.ts`
- **Protection**:
  - Upload route (`/api/proofs`): Max 10 uploads per 10 minutes per IP.
  - Donation creation (`/api/donations/create-order`): Max 20 orders per minute per IP.
  - Donation capture (`/api/donations/capture-order`): Max 30 captures per minute per IP.
- **Behavior**: Exceeding requests receive `HTTP 429 Too Many Requests` with a standard `Retry-After` header. Stale records automatically purge every 5 minutes.

### C. Binary Magic Bytes Sniffing (File Type Spoofing Defense)
- **Module**: `lib/forensics.ts:sniffImageMimeType`
- **Mechanism**: Reads exact binary headers rather than trusting client HTTP `content-type` headers or filename extensions:
  - **JPEG**: `0xFF 0xD8 0xFF`
  - **PNG**: `0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`
  - **WebP**: `0x52 0x49 0x46 0x46` (RIFF) + `0x57 0x45 0x42 0x50` (WEBP)
- **Rejection**: Executables, scripts, HTML payloads, or corrupted files disguised with `.jpg`/`.png` extensions are rejected with `HTTP 400`.

### D. Upload Path Traversal Prevention
- **Module**: `app/api/proofs/route.ts`
- **Defense**:
  1. Filenames are generated on the server using random IDs: `proof-${milestonePrefix}-${timestamp}-${nanoid(8)}${safeExt}`.
  2. The file extension is assigned exclusively based on the detected magic bytes (`.jpg`, `.png`, `.webp`), stripping any user-submitted extension.
  3. `path.resolve(diskPath).startsWith(path.resolve(uploadsDir))` is asserted prior to writing bytes to disk.

### E. Secrets Isolation from Client Bundles
- Server secrets (`PAYPAL_CLIENT_SECRET`, `AUTH_SECRET`, `ADMIN_PASSCODE`) are loaded in `lib/env.ts` and `lib/auth.ts`, which are never imported by client (`"use client"`) components.
- The client-side PayPal SDK uses only `NEXT_PUBLIC_PAYPAL_CLIENT_ID` or server-provided client ID strings.

### F. CSRF Guard for State-Changing Routes
- **Module**: `lib/csrf.ts`
- **Mechanism**: Inspects `Origin` and `Referer` headers on `POST`, `PUT`, and `DELETE` requests. Requests from foreign domains are rejected with `HTTP 403 Forbidden`. Safe methods (`GET`, `HEAD`) and cryptographic PayPal webhooks are safely allowed.

### G. Admin Cookie Flags
- **Cookie Name**: `sakkhi_admin_session`
- **Attributes**: `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `maxAge: 86400`, `secure: process.env.NODE_ENV === "production"`.
- Prevents XSS token exfiltration and cross-site request forgery.

---

## 3. Missing Edge Cases Implemented

### 1. Cross-Milestone Duplicate Photo Reuse
- **Detection**: Checked both at upload time (`/api/proofs`) and pre-verification (`runPreChecks` in `lib/ai/deterministic.ts`).
- **Mechanism**: Compares raw SHA-256 hashes and 64-bit dHash perceptual hashes across all existing database media. Any collision or near-identical image ($\text{Hamming distance} \le 5$ bits) is rejected immediately, recorded in `AuditLog` as `DUPLICATE_PROOF_REJECTED`, and blocked from payout.

### 2. Receipts in Bangla Script & Numerals
- **Engine**: `lib/ai/prompts.ts` (Rule 6) & `lib/ai/mock.ts` (Rule 2b).
- **Capability**: Grassroots relief cash memos in Bangladesh commonly feature Bengali numerals (`০, ১, ২, ৩, ৪, ৫, ৬, ৭, ৮, ৯`) and currency denominations (`টাকা` / `৳`). The system prompts instruct the AI to parse Bengali numbers into standard integer BDT. `MockVerifier` handles Bengali memos cleanly (e.g. `১২,০০০ টাকা` parsed as `12,000 BDT`).

### 3. Blurry & Out-of-Focus Photos
- **Engine**: `lib/forensics.ts:isImageBlurry` & `lib/ai/deterministic.ts`.
- **Metric**: Evaluates edge sharpness using Laplacian convolution variance on downscaled images. Low edge variance ($< 100$) indicates an out-of-focus or motion-blurred photo.
- **Action**: Blurry photos are flagged in `redFlags`, automatically downgrade the verdict to `needs_more_proof`, and set `needsHumanReview: true`.

### 4. Very Large Images (Token Conservation)
- **Engine**: `lib/forensics.ts:optimizeImageForAi`.
- **Optimization**: Images exceeding 1568px in width or height are proportionally resized with `sharp` before base64 encoding for multimodal AI models (Gemini / Anthropic). This saves tokens, avoids payload size limits, and prevents network timeouts while preserving legible text.

### 5. Permanently Rejected Milestone & Proportional Donor Refunds
- **Engine**: `lib/ledger.ts:refundMilestoneDonorsProportionally`.
- **Workflow**:
  1. Identifies all contributing donations to the campaign.
  2. Computes each donor's proportional share based on their relative contribution ($D_i / \sum D$).
  3. Writes double-entry `REFUND` ledger entries.
  4. Updates donation statuses (`PARTIALLY_REFUNDED` or `REFUNDED`).
  5. Dispatches partial/full capture refund calls via PayPal Sandbox (`refundPayPalCapture`).
  6. Updates milestone status to `REJECTED_PERMANENTLY` and logs an immutable `AuditLog` entry.

### 6. PayPal API Down / Outage Fault Tolerance
- **Engine**: `lib/paypal/payouts.ts:executeMilestonePayout` & `retryQueuedPayouts`.
- **Fault Tolerance**:
  - If PayPal Payouts returns 5xx, times out, or the network is unreachable, the system catches the failure instead of aborting state.
  - A `Payout` record is created in `status: "QUEUED_RETRY"` with the error description.
  - Milestone status is updated to `PAYOUT_QUEUED`.
  - Double-entry ledger funds remain safely earmarked.
  - `retryQueuedPayouts()` can be invoked by background workers or administrators to safely retry queued payouts using the exact same deterministic idempotency keys (`senderBatchId`, `senderItemId`).

---

## 4. Test Verification Results

Full automated test suite executed with Vitest:
- **Total Test Files**: 10 passed (10)
- **Total Tests**: 78 passed (78)
- **Lint**: Next.js ESLint passed with 0 warnings and 0 errors.

```
 ✓ tests/paypal.test.ts (8 tests)
 ✓ tests/env.test.ts (2 tests)
 ✓ tests/forensics.test.ts (1 test)
 ✓ tests/upload.test.ts (8 tests)
 ✓ tests/responsive.test.tsx (6 tests)
 ✓ tests/components.test.tsx (9 tests)
 ✓ tests/payouts.test.ts (5 tests)
 ✓ tests/ledger.test.ts (11 tests)
 ✓ tests/security_edge_cases.test.ts (18 tests)
 ✓ tests/verifier.test.ts (10 tests)

 Test Files  10 passed (10)
      Tests  78 passed (78)
   Duration  4.50s
```

---

## 5. Residual Risk & Production Recommendations

1. **Persistent Local Disk on Render**:
   - In production on Render or containerized PaaS, uploaded proof files stored under `public/uploads` require an attached persistent disk mount or Cloud Storage bucket (e.g. S3 / GCS) so container redeploys preserve uploaded photos.
2. **Production PayPal Webhook ID**:
   - In live deployment, ensure `PAYPAL_WEBHOOK_ID` is set to the PayPal Developer Portal webhook listener ID so all live webhook signatures are strictly verified.

