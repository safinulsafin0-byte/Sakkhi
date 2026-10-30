# Sakkhi (সাক্ষী) — Every Taka, Witnessed

> **One-Paragraph Pitch**: Sakkhi is an AI-witnessed milestone escrow and community accountability platform that guarantees grassroots relief and charity funds are never spent blindly. Donors contribute via PayPal into an immutable, double-entry escrow ledger; community milestones release funds directly to field volunteers through the PayPal Payouts API only after an AI auditor cross-checks physical receipts, EXIF capture dates, GPS coordinates, and perceptual image hashes against a predetermined proof checklist—with strict deterministic financial guardrails and human coordinator oversight protecting every single Taka.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests: Vitest 83/83](https://img.shields.io/badge/Tests-83%20Passed-brightgreen.svg)](tests/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7.svg)](render.yaml)

---

## ⚡ Judges Quick Start (Try in Under 2 Minutes)

Choose whichever path best fits your evaluation:

### Option A: Hosted Demo (Zero Setup, Instant Evaluation)
- **Live Demo Web Service**: `https://sakkhiai.onrender.com` *(or your team's Render web service URL)*
- **Demo Mode Active**: Zero external API keys required! Runs deterministic multimodal mock verification with full UI badging (`AI_PROVIDER=mock`).
- **Demo Donor Sandbox Buyer**: Use any personal PayPal sandbox account, or test locally with simulated captures.
- **Key Demo Pages to Open**:
  - 🌊 **Live Campaign Page**: [`/campaigns/flood-relief-kurigram`](http://localhost:3000/campaigns/flood-relief-kurigram)
  - 📖 **Live Double-Entry Ledger**: [`/campaigns/flood-relief-kurigram/ledger`](http://localhost:3000/campaigns/flood-relief-kurigram/ledger)
  - 🏛️ **Coordinator Admin Portal**: [`/admin`](http://localhost:3000/admin) *(Passcode: `sakkhi2026`)*
  - 📜 **Cryptographic Witness Certificate**: [`/certificates/SKH-20261028-0042`](http://localhost:3000/certificates/SKH-20261028-0042)
  - 💌 **Donor Thank You Letter & Receipt**: [`/receipts/SKH-20261028-0042`](http://localhost:3000/receipts/SKH-20261028-0042)

### Option B: Run Locally (< 2 Minutes)
```bash
# 1. Clone repository and install dependencies
git clone https://github.com/your-org/SakkhiAI.git
cd SakkhiAI
npm install

# 2. Setup environment variables (pre-configured for zero-key mock demo)
cp .env.example .env.local

# 3. Synchronize database schema and seed realistic demo data
npm run db:push
npm run db:seed

# 4. Start Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option C: Seeded Demo Accounts & Quick Access Links

| Role | Name | Email / Identifier | Credentials / Access Method | Purpose & Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Coordinator (Admin)** | Nusrat Jahan | `coordinator@sakkhi.org` | Passcode: **`sakkhi2026`** at [`/admin`](http://localhost:3000/admin) | Reviews flagged proofs, overrides edge cases, issues volunteer links, triggers manual milestone releases. |
| **Field Volunteer** | Rahim Uddin | `rahim@sakkhi.org` | Generate link in [`/admin`](http://localhost:3000/admin) | Assigned to Kurigram Flood Relief boat fuel & life jackets milestones. Submits photos & cash memos. |
| **Field Volunteer** | Salma Khatun | `salma@sakkhi.org` | Generate link in [`/admin`](http://localhost:3000/admin) | Assigned to Khulna School Kits campaign. |
| **PayPal Volunteer Payout** | Rahim Uddin | `rahim-volunteer@sandbox.paypal.com` | Configured in database | Recipient of automated sandbox PayPal disbursements. |
| **PayPal Sandbox Buyer (Donor)** | Test Donor | Any Sandbox Personal Account | Login via PayPal popup | Test live donor checkout flow into campaign milestone escrow. |
| **Verified Certificate** | Witness Archive | Code: `SKH-20261028-0042` | [`/certificates/SKH-20261028-0042`](http://localhost:3000/certificates/SKH-20261028-0042) | Real tamper-resistant SHA-256 certificate for Kurigram fuel milestone. |

### Demo Data Reset
To restore the database to its pristine demo state at any time:
```bash
npm run demo:reset
```

---

## 📽️ Demo Video
- **YouTube Link**: `https://youtu.be/PLACEHOLDER_VIDEO_LINK` *(Recording under 3 minutes, 1080p, public)*

---

## 📸 Screenshots
```
+---------------------------------------------------------------------------------+
|                                 [ SCREENSHOT 1 ]                                |
|        Public Campaign Hero, Milestone Escrow Progress & PayPal Button           |
+---------------------------------------------------------------------------------+
|                                 [ SCREENSHOT 2 ]                                |
|           Volunteer Mobile Workspace with Camera Upload & Proof Checklist        |
+---------------------------------------------------------------------------------+
|                                 [ SCREENSHOT 3 ]                                |
|        "Why was this verified?" AI Forensic Drawer & Tamper Evidence Report     |
+---------------------------------------------------------------------------------+
|                                 [ SCREENSHOT 4 ]                                |
|         Double-Entry Ledger Page with Running Balance & CSV Export              |
+---------------------------------------------------------------------------------+
```
*(Drop screenshots in `./docs/screenshots/` or view live at `http://localhost:3000`)*

---

## Project Status: What Works, What Doesn't, and Why

This project is a 14-day hackathon build created by a solo student developer in Bangladesh. This section exists so judges and reviewers know with complete honesty and transparency what is fully working, what is simulated in demo mode, and what was written against official documentation but could not be live-tested against production sandbox APIs. Every feature status below reflects reality, with zero inflation or marketing claims.

### Feature Status Audit Matrix

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Campaign Pages** | WORKING | Fully functional on Next.js server (`/campaigns/flood-relief-kurigram`). Displays campaign goals, milestone progress, and verified badges. |
| **Donation via PayPal Orders API (Create + Capture)** | IMPLEMENTED, NOT TESTED LIVE | Authored against PayPal v2 Checkout API (`/api/donations/create-order` and `capture-order`). Covered by unit tests with mocked responses. In demo mode without credentials, runs a simulated order-and-capture flow into the local ledger. |
| **PayPal Webhook Verification** | IMPLEMENTED, NOT TESTED LIVE | Cryptographic signature validation implemented against PayPal's verification endpoint. Reconciles captured payments and refunds in code, covered by mock test suites, but never received live webhooks from PayPal servers. |
| **Proof Upload with Duplicate Detection** | WORKING | Local upload route (`/api/proofs`) extracts EXIF metadata via Exifr, resizes images with Sharp, calculates SHA-256 and perceptual `dHash`, and rejects duplicate collisions across milestones (Hamming distance $\le 5$). 8 unit tests pass. |
| **AI Verification with Gemini** | IMPLEMENTED, NOT TESTED LIVE | Multimodal prompt and structured schema implemented in `lib/ai/gemini.ts` against `gemini-1.5-flash`. Unit-tested with mocked API responses; not tested against live Google Gemini endpoints with a paid key. |
| **AI Mock Mode** | MOCK / DEMO MODE ONLY | Deterministic offline provider in `lib/ai/mock.ts`. Evaluates submissions based on file names (`fuel_memo.jpg`, `blurry_water.jpg`, `unrelated.png`) so judges can test without API keys. Output is explicitly labeled as demo mode. |
| **Deterministic Rule Checks** | WORKING | Pure software rules in `lib/ai/deterministic.ts`: enforces $\pm 10\%$ budget tolerance boundary, checks that photo capture date does not precede campaign start, and flags confidence $< 75\%$ for human review. |
| **Human Override in Admin** | WORKING | Tested live in `/admin`. Coordinator logs in with passcode (`sakkhi2026`), reviews flagged AI audits, records a written rationale, and executes an override (`APPROVED` or `REJECTED`). |
| **PayPal Payouts Release** | IMPLEMENTED, NOT TESTED LIVE | Authored against PayPal Payouts API v1 with deterministic `sender_batch_id` idempotency. Enforces transactional release invariants. In demo mode without credentials, produces a deterministic simulated batch to complete the local ledger entry. |
| **Ledger and Idempotency** | WORKING | Implemented in `lib/ledger.ts`. Integer Poisha math ($1\text{ BDT} = 100\text{ poisha}$), zero floating-point math, non-negative balance enforcement in transactions, and immutable audit logging. 11/11 tests pass. |
| **Public Transparency Timeline** | WORKING | Tested live. Displays milestone status, release amounts, PayPal batch references, "Why was this verified?" forensic drawers, and the double-entry ledger table (`/campaigns/[id]/ledger`) with CSV export. |
| **Seed / Demo Data** | WORKING | Seed scripts (`prisma/seed.ts` and `scripts/boot.js`) generate realistic Kurigram flood relief and Khulna education campaigns, synthetic cash vouchers, and initial ledger transactions. |
| **Render Deployment** | IMPLEMENTED, NOT TESTED LIVE | Configured in `render.yaml` with build and start commands (`node scripts/boot.js && next start`), health check (`/api/health`), and secret declarations. Local production build verified with `npm run build`. |
| **Automated Test Suite** | WORKING | 83 of 83 unit and integration tests pass across 10 test suites (`npm test`). ESLint passes with 0 errors and 0 warnings. |

### Why Some Parts Are Not Live-Tested

PayPal does not currently support account registration in Bangladesh. Because of this geographic restriction, I could not obtain my own PayPal developer sandbox account credentials in time for this submission. 

The code for PayPal Orders, Webhook signature verification, and PayPal Payouts was written carefully against PayPal's official API documentation, validated with TypeScript schemas, and verified through unit test suites with mocked responses. To allow anyone to test the full escrow and disbursement flow, the app includes a fallback simulation layer that runs when credentials are omitted.

#### How a Judge with PayPal Sandbox Credentials Can Test Live:
If you have a PayPal Developer Sandbox account, you can test live network calls against PayPal servers:
1. Open or create `.env.local` and add:
   ```env
   PAYPAL_MODE=sandbox
   PAYPAL_CLIENT_ID=your_sandbox_client_id
   PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_sandbox_client_id
   DEMO_MODE=false
   ```
2. Restart the app (`npm run dev`).
3. **Flows expected to work with live credentials**:
   - The donation panel will load the real PayPal Smart Buttons SDK.
   - Pledging will create a real order on PayPal Sandbox (`POST /v2/checkout/orders`).
   - Approving the payment in the popup will capture real sandbox USD funds (`POST /v2/checkout/orders/{id}/capture`) and record the BDT equivalent in Sakkhi's escrow ledger.
   - Releasing an approved milestone will trigger `POST /v1/payments/payouts` to the volunteer's PayPal sandbox email.
4. **Flows not verified against live PayPal servers**:
   - Live incoming webhook delivery from PayPal's webhook servers to a public domain without ngrok/tunneling.
   - Edge-case PayPal API errors resulting from sandbox merchant account restrictions.

### What I Would Build Next

1. **Local Mobile Financial Services Integration**: Connect direct bKash and Nagad disbursement APIs so funds can disburse directly to field volunteers in rural Bangladesh without requiring PayPal.
2. **Offline-First Progressive Web App (PWA)**: Allow field volunteers in flooded char areas with zero cellular connectivity to capture photos with hardware keystore signatures that sync when connection returns.
3. **Bengali Receipt OCR**: Fine-tune an open-source OCR model specifically for handwritten Bengali cash memos and rural cooperative vouchers.
4. **Multi-Signature Coordinator Approval**: Require 2 of 3 community elders or coordinators to sign off on disbursements over 100,000 BDT.
5. **On-Chain Proof Anchoring**: Publish milestone SHA-256 root hashes to an EVM roll-up (e.g. Base or Arbitrum) for third-party censorship-resistant verification.
6. **SMS Evidence Ingestion**: Allow volunteers with basic feature phones to confirm deliveries via signed SMS gateways.

### How to Run the Demo Without Any Credentials

You can run the complete project with zero external API keys in three commands:
```bash
npm install
cp .env.example .env.local && npm run db:push && npm run db:seed
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to test the complete application.

---

## 🚩 The Problem

Every monsoon season, flood relief and humanitarian campaigns in South Asia raise millions of Taka from generous diaspora and local donors. Yet, public trust regularly collapses due to three systemic vulnerabilities:
1. **Blind Upfront Disbursements**: Organizers withdraw 100% of collected funds in advance with zero accountability on where the money actually goes.
2. **Fake or Reused Receipts**: Fraudulent actors submit photocopied cash memos from previous years, duplicate photos from other organizations, or fabricated handwritten receipts.
3. **The "Black Box" Ledger**: Donors receive only an informal social media post or low-resolution collage weeks later, with no way to trace their specific donation to verified purchases.

---

## 💡 The Solution: Sakkhi (সাক্ষী)

Sakkhi (Bengali for *"Witness"*) bridges grassroots field operations and modern cryptographic accountability:
- **Milestone-Gated Escrow**: Donations are locked in a double-entry campaign ledger. Money is **never disbursed all at once**. Instead, funding releases milestone by milestone (e.g., *Milestone 1: Rescue Boat Fuel — ৳92,000*).
- **AI-Witnessed Proof Pipeline**: Before any payout is triggered, the field volunteer uploads physical receipts, boat photos, and fuel station vouchers. The AI auditor extracts invoice line items, dates, and currency totals, checking them against the milestone checklist.
- **Strict Deterministic Financial Guardrails**: The AI is never trusted with the money alone. Code checks ensure invoice totals are within 10% of expected budgets, duplicate perceptual hashes (`dHash`) are caught and blocked, and EXIF timestamps cannot precede the campaign date.
- **Automated Payouts via PayPal**: Once clean proof is verified, funds are automatically transferred via the PayPal Payouts API directly to the volunteer's PayPal email with zero human delays.

---

## ✨ Features

- **Double-Entry Ledger with Poisha Precision**: All balances are tracked in integer poisha ($1\text{ BDT} = 100\text{ poisha}$) to eliminate IEEE-754 floating-point drift.
- **Live Public Ledger Table**: Every single donation in and payout out is displayed chronologically with running balances, filterable views, and one-click CSV export.
- **"Why was this verified?" Audit Drawer**: Transparent drawer showing the exact checklist, extracted receipt line items, and tamper scores with the clear reminder: *"AI helped check this. A person can always override it."*
- **Explainable Trust Score**: Every campaign features a transparent Trust Score calculated from percentage of funds verified against receipts, average time from proof submission to payout, and coordinator override count.
- **Personalized Donor Thank-You Letter & Receipt**: When milestones are paid, donors receive a personalized, printable thank-you certificate citing real verified accomplishments (e.g., *"Because of you, 450 liters of rescue boat fuel was delivered to Chilmari Ghat."*).
- **Social Share Cards (Open Graph)**: Dynamically generated social cards for milestones and verified certificates using `next/og`.
- **Bilingual Interface**: Quick toggle between English and Bengali (বাংলা) powered by high-contrast humanist typography (DM Serif Display, Plus Jakarta Sans, and Hind Siliguri).

---

## 💳 How PayPal is Used

PayPal is the foundational payment and disbursement engine of Sakkhi. It operates in sandbox mode using a documented fixed conversion rate ($1\text{ USD} = 120\text{ BDT}$):

### 1. PayPal Orders API (Escrow Inflow)
- **Initiate Order (`POST /api/donations/create-order`)**:
  - Converts BDT poisha to USD cents (`Math.round(poisha / 120)`).
  - Calls `v2/checkout/orders` with `intent: "CAPTURE"`, returning the PayPal order ID to the client SDK button.
- **Capture Order (`POST /api/donations/capture-order`)**:
  - Calls `v2/checkout/orders/{id}/capture` to finalize the charge.
  - Inside a strict Prisma database transaction, credits the campaign's `totalDonated` balance, creates a `Donation` record, creates an entry in the double-entry `LedgerEntry` table, and logs an `AuditLog` row.
  - Issues a unique tamper-resistant receipt code (e.g. `SKH-20261028-0042`).

### 2. PayPal Payouts API (Milestone Disbursement)
- **Disburse Payout (`POST /api/payouts/[milestoneId]`)**:
  - Implements the PayPal Payouts API (`v1/payments/payouts`).
  - **Idempotency Keys**: Generates deterministic keys `sender_batch_id = batch-<milestoneId>` and `sender_item_id = item-<milestoneId>` to guarantee zero double-disbursements even across server retries.
  - Releases funds directly to the field volunteer's PayPal email (`recipient_type: "EMAIL"`).
  - Automatically records the release in the double-entry ledger, updates `milestone.status = "PAID"`, and updates `milestone.paidAt`.

### 3. PayPal Webhooks (Asynchronous Reconciliation)
- **Webhook Endpoint (`POST /api/webhooks/paypal`)**:
  - Verifies PayPal cryptographic signature headers (`paypal-transmission-id`, `paypal-transmission-sig`, `paypal-auth-algo`, `paypal-cert-url`) against `PAYPAL_WEBHOOK_ID`.
  - Handles key lifecycle events:
    - `PAYMENT.CAPTURE.COMPLETED`: Ensures donations are captured idempotently.
    - `PAYMENT.CAPTURE.REFUNDED`: Reverses unspent escrow balances and updates donation status.
    - `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`: Marks payout as finalized.
    - `PAYMENT.PAYOUTS-ITEM.FAILED` / `RETURNED` / `UNCLAIMED`: Automatically puts funds back into the campaign balance and flags the milestone for the coordinator.

---

## 🤖 How AI is Used & Safety Architecture

Sakkhi treats generative AI as a forensic assistant, **never an autonomous financial authority**.

### 1. The Multimodal Verifier (`lib/ai/`)
- Supports **Google Gemini** (`gemini-1.5-flash`), **Anthropic Claude** (`claude-3-5-sonnet`), and **Deterministic Mock Provider**.
- Extracts receipt totals, dates, vendor names, and itemized descriptions from uploaded photos.
- Evaluates field photos against the campaign's structured proof checklist.
- Generates a warm, human-readable 2-4 sentence summary for donors.

### 2. Independent Deterministic Code Checks
Before or after the model executes, strict software rules run independently:
- **Duplicate Photo Prevention**: Hashes images with SHA-256 and computes perceptual hashes (`dHash`). If an identical image or near-duplicate (Hamming distance $\le 5$) was uploaded to any other milestone, it is immediately rejected.
- **Budget Tolerance Rule**: The extracted receipt total must be within 10% of the milestone budget. If not, the verdict can **never** be `"approved"`.
- **EXIF Timestamp Sanity**: The photo capture timestamp extracted from EXIF metadata must not precede the campaign creation date.
- **Image Quality Check**: Sharpness scoring detects heavily blurred or degraded photos, requiring higher scrutiny or re-upload.

### 3. Human-in-the-Loop Override
- If confidence is $< 75\%$, discrepancies exist, or red flags are raised, the milestone is marked `needsHumanReview = true`.
- Funds remain strictly locked in escrow.
- The coordinator inspects the AI's evidence drawer in the Admin Portal and must enter an audit rationale before triggering a manual release.

---

## 🏗️ Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Donors["Donors (Community & Diaspora)"]
        D[Donor] -->|Select BDT Amount| PB[PayPal Smart Buttons]
    end

    subgraph PayPal["PayPal Sandbox Engine"]
        PB -->|Create & Capture| PO["PayPal Orders API (v2)"]
        PY["PayPal Payouts API (v1)"] -->|Disburse USD| PV[Volunteer PayPal Account]
        WH["PayPal Webhooks"] -->|Signature Verify| WE["/api/webhooks/paypal"]
    end

    subgraph Core["Sakkhi Escrow & Ledger Core"]
        PO -->|Credit Donated| DEL["Double-Entry Ledger (Poisha Math)"]
        DEL -->|Reserve Funds| ME["Milestone Escrow Vault"]
        ME -->|Approved Release| PY
        WE -->|Reconciliation / Refund| DEL
    end

    subgraph Field["Field Evidence & Volunteer Workflow"]
        VOL[Field Volunteer] -->|Signed Token Link| VU["Volunteer Upload Portal"]
        VU -->|Field Photos & Vouchers| PRE["Forensics Pre-Checks (SHA-256, dHash, EXIF)"]
    end

    subgraph Auditor["AI Forensic Witness Pipeline"]
        PRE -->|Clean Images| AIV["Multimodal Auditor (Gemini / Claude / Mock)"]
        AIV -->|Extracted JSON| POST["Deterministic Post-Checks (10% Budget, Flags)"]
        POST -->|Clean Approval| ME
        POST -->|Discrepancy / Flags| REV["Coordinator Escalation Queue (/admin)"]
        REV -->|Human Override & Audit Reason| ME
    end

    subgraph Transparency["Public Witness Archive"]
        DEL --> LED["Public Ledger (/ledger)"]
        POST --> WHY["Why was this verified? Drawer"]
        ME --> CERT["Cryptographic Certificates (/certificates)"]
    end
```

---

## 💻 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Components, Route Handlers)
- **Language**: [TypeScript 5.7](https://www.typescriptlang.org/) (Strict typing, no implicit `any`)
- **Database & ORM**: SQLite with [Prisma ORM 5.22](https://www.prisma.io/)
- **Payments & Payouts**: [PayPal Sandbox](https://developer.paypal.com/) (Orders v2, Payouts v1, Webhooks)
- **Multimodal AI**: [Google Gemini API](https://ai.google.dev/) / [Anthropic Claude](https://www.anthropic.com/) / Custom Deterministic Mock
- **Image Processing & Forensics**: [Sharp](https://sharp.pixelplumbing.com/) (Resizing, hashing, ELA) and [Exifr](https://github.com/MikeKovarik/exifr) (Metadata extraction)
- **Validation**: [Zod](https://zod.dev/) for runtime environment and API payload validation
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom humanist color palette
- **Testing**: [Vitest 2.1](https://vitest.dev/) (83 unit & integration tests)
- **Deployment**: [Render](https://render.com/) Web Service (Node.js runtime with Blueprint support)

---

## 🚀 Setup & Installation (Windows Friendly)

### Prerequisites
- Node.js 18.17+ or 20+
- Git

### Step-by-Step Installation
```powershell
# 1. Clone repository
git clone https://github.com/your-org/SakkhiAI.git
cd SakkhiAI

# 2. Install dependencies
npm install

# 3. Create local environment configuration
Copy-Item .env.example .env.local

# 4. Push Prisma schema to SQLite and run seed
npm run db:push
npm run db:seed

# 5. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the app.

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | No | `development` | `development`, `test`, or `production` |
| `DEMO_MODE` | No | `true` | When `true`, automatically pushes schema & seeds on boot if DB is blank |
| `AI_PROVIDER` | No | `mock` | `mock` (zero API key needed), `gemini`, or `anthropic` |
| `DATABASE_URL` | Yes | `file:./dev.db` | SQLite database connection string |
| `UPLOAD_DIR` | No | `./public/uploads` | Path to store uploaded volunteer receipts and photos |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Canonical app URL (used for Open Graph cards & links) |
| `APP_URL` | No | *(same as above)* | Alias for `NEXT_PUBLIC_APP_URL` |
| `ADMIN_PASSCODE` | No | `sakkhi2026` | Passcode to access the Coordinator Admin Portal |
| `AUTH_SECRET` | No | *(default salt)* | Secret key for signing volunteer JWT invite tokens |
| `PAYPAL_MODE` | No | `sandbox` | `sandbox` or `live` |
| `PAYPAL_CLIENT_ID` | Optional in Demo | `""` | PayPal Developer Sandbox client ID |
| `PAYPAL_CLIENT_SECRET` | Optional in Demo | `""` | PayPal Developer Sandbox client secret |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Optional in Demo | `""` | Public client ID for PayPal button SDK |
| `PAYPAL_WEBHOOK_ID` | Optional in Demo | `""` | Webhook ID for verifying PayPal webhook signatures |
| `GEMINI_API_KEY` | Optional in Demo | `""` | Google Gemini API key (if `AI_PROVIDER=gemini`) |
| `ANTHROPIC_API_KEY` | Optional in Demo | `""` | Anthropic Claude API key (if `AI_PROVIDER=anthropic`) |

---

## 🧪 Running Tests

Sakkhi maintains a comprehensive automated test suite covering ledger invariants, double-spend prevention, AI verifier deterministic rules, PayPal payouts idempotency, and responsive layouts:

```bash
# Run all 83 unit and integration tests
npm test

# Run ESLint validation
npm run lint

# Run Next.js production build check
npm run build
```

---

## ☁️ Deployment on Render

Sakkhi is designed to run seamlessly on [Render](https://render.com) Web Services.

### 1. Ephemeral Storage vs. Persistent Disks (Honest Note)
- On Render's Free tier, the filesystem is ephemeral and resets on sleep/redeploy.
- Sakkhi handles this gracefully: `DEMO_MODE=true` runs [`scripts/boot.js`](./scripts/boot.js) on every container startup to auto-seed if the SQLite database is empty.
- For real production deployments, attach a **Render Persistent Disk** mounted at `/var/data`, setting `DATABASE_URL="file:/var/data/prod.db"` and `UPLOAD_DIR="/var/data/uploads"`.

### 2. Quick Deploy with `render.yaml`
1. Connect your repository to Render.
2. Select **New +** > **Blueprint**.
3. Select your repository—Render will automatically configure the build command, start command, health check (`/api/health`), and secrets.

---

## ⚠️ Limitations & Honest Notes

- **PayPal Sandbox Only**: This hackathon build uses PayPal Sandbox. Real currency is simulated using the fixed test exchange rate ($1\text{ USD} = 120\text{ BDT}$).
- **Not a Licensed Escrow Financial Institution**: Sakkhi is an open-source software accountability architecture, not a chartered bank or licensed escrow agent.
- **AI is Fallible**: AI models can misread handwritten numbers or miss subtle document alterations. That is why Sakkhi enforces deterministic software boundaries (10% budget checks, perceptual hash matching) and provides a permanent human coordinator override.

---

## 🗺️ Roadmap

- [ ] Mobile-native PWA offline photo capture with device-level attestation (Hardware Keystore signatures).
- [ ] Direct integration with local mobile financial services (bKash, Nagad) alongside PayPal.
- [ ] On-chain proof anchoring (recording milestone SHA-256 root hashes on an L2 roll-up).
- [ ] OCR specialized for handwritten Bengali cash vouchers and rural grocery slips.

---

## 📜 License
Released under the [MIT License](LICENSE).

---

## 🌟 Credits & Sponsor Acknowledgements

- **PayPal**: For the Developer Sandbox, Orders API, and Payouts API empowering grassroots disintermediation.
- **Render**: Sponsor deployment platform powering the hosted Sakkhi web service.
- **Table Note**: The public ledger table was custom-built using semantic, accessible HTML tables and humanist typography (rather than third-party grid bundles) to keep bundle sizes under 100kB.
