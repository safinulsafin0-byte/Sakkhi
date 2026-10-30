# Changelog

All notable changes to the Sakkhi (সাক্ষী) platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-10-30

### Initial Hackathon Release

#### Added
- **Core Escrow & Double-Entry Ledger**:
  - Smallest-unit integer math in Poisha ($1\text{ BDT} = 100\text{ poisha}$) to prevent currency drift.
  - Double-entry `LedgerEntry` recording with running balances and non-negative balance invariants.
  - Complete `AuditLog` trails for all balance mutations and administrative actions.
- **PayPal Sandbox Integration**:
  - Orders v2 integration (`/api/donations/create-order` & `/api/donations/capture-order`) with fixed documented conversion rate ($1\text{ USD} = 120\text{ BDT}$).
  - Payouts v1 integration (`/api/payouts/[milestoneId]`) with deterministic idempotency keys (`sender_batch_id = batch-<milestoneId>`).
  - Webhook listener (`/api/webhooks/paypal`) with cryptographic signature verification for capture and payout reconciliation.
- **Multimodal AI Verifier Pipeline**:
  - Provider factory supporting Google Gemini (`gemini-1.5-flash`), Anthropic Claude (`claude-3-5-sonnet`), and deterministic zero-dependency `mock` mode.
  - Prompt engineering for auditor personas with strict prompt-injection defenses.
  - Deterministic pre-checks: image deduplication via SHA-256 and perceptual `dHash` (Hamming distance $\le 5$), blurriness detection, and EXIF timestamp validation.
  - Deterministic post-checks: $\pm 10\%$ budget tolerance rule and confidence thresholding.
- **Coordinator Portal & Volunteer Workspace**:
  - Secure 7-day signed JWT volunteer invite links (`/volunteer/[token]`).
  - Mobile-first volunteer upload flow with camera support and checklist progress.
  - Coordinator review queue at `/admin` for flagged proofs with audit rationale recording.
- **Transparency Features**:
  - Public double-entry ledger table (`/campaigns/[id]/ledger`) with CSV export.
  - "Why was this verified?" forensic proof drawer with AI evidence and tamper scores.
  - Transparent campaign Trust Score with mathematical formula breakdown.
  - Personalized donor thank-you certificate and receipt (`/receipts/[code]`).
  - Dynamic Open Graph share cards via `next/og`.
  - Bilingual UI toggle (English & Bengali / বাংলা).
- **Security & Deployment**:
  - Magic-byte image validation and Sharp metadata sanitization.
  - In-memory rate limiting and CSRF origin verification on state-changing routes.
  - Deployment configuration for Render (`render.yaml`) with ephemeral-safe `scripts/boot.js` (`DEMO_MODE=true`).
  - Vitest test suite with 83 passing unit and integration tests.

