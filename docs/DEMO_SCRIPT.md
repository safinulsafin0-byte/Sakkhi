# Sakkhi (সাক্ষী) — 2:40 Video Demonstration Script

Target Duration: **2 minutes 40 seconds** (160 seconds)  
Format: 1080p 60fps screen recording with clear voiceover.

---

## 📋 Pre-Recording Checklist

Before hitting record, ensure the following setup:
- [ ] **Clean Browser Profile**: Chrome or Arc guest window with all extensions, bookmarks bars, and personal tabs hidden.
- [ ] **Display Zoom**: Set browser zoom level to **110%** for maximum legibility of typography and receipt numbers.
- [ ] **Reset Demo Database**: Run `npm run demo:reset` in terminal to ensure fresh demo data.
- [ ] **Dev Server Active**: Ensure `npm run dev` is running on `http://localhost:3000`.
- [ ] **PayPal Sandbox Prepared**:
  - Open a separate tab with PayPal Sandbox login already saved or pre-filled (`sb-m4393638407481@personal.example.com` or your personal sandbox buyer account).
- [ ] **Audio Setup**: Clear microphone, quiet room, zero background music or copyrighted tracks.
- [ ] **No Third-Party Logos**: Ensure no desktop notifications, personal icons, or external branding appear on screen.

---

## 🎬 Video Script & Action Flow

```
Total Time: 02:40 (160 seconds)
Section 1: The Problem & The Solution (0:00 - 0:30)
Section 2: Donor Experience & Escrow Inflow (0:30 - 0:55)
Section 3: Field Volunteer Evidence Upload (0:55 - 1:25)
Section 4: AI Forensic Audit & Deterministic Guardrails (1:25 - 1:55)
Section 5: Automated PayPal Disbursement & Ledger (1:55 - 2:20)
Section 6: The Trust Score & Closing (2:20 - 2:40)
```

---

### Part 1: The Problem & The Solution (0:00 - 0:30)
**On Screen:**
- Start on the homepage (`http://localhost:3000`).
- Scroll smoothly past the hero section: *"Every Taka, Witnessed."*
- Click through to the **Kurigram Flood Relief** campaign (`/campaigns/flood-relief-kurigram`).
- Highlight the milestone escrow progress bar: ৳92,000 released against proof; ৳208,000 still locked in escrow.

**Voiceover Narration:**
> *"Every monsoon, communities in Bangladesh raise millions for flood relief. But traditional charities suffer from a collapse of trust: money is withdrawn upfront in blind lump sums, and receipts are often missing or fake.*
>
> *This is Sakkhi—an AI-witnessed milestone escrow platform. On Sakkhi, donations are never handed over in advance. Funds are held in a double-entry escrow vault and released milestone-by-milestone only when on-ground work is forensically verified."*

---

### Part 2: Donor Experience & Escrow Inflow (0:30 - 0:55)
**On Screen:**
- On the campaign page, navigate to the **Witnessed Contribution** panel on the right.
- Note the status badges: *"Demo mode: PayPal calls are simulated"* and *"Demo mode: AI results are simulated"*.
- Click the **৳1,000 BDT** preset button (notice dynamic conversion `≈ $8.33 USD`).
- Type Donor Name: `Hasan Mahmud`.
- Click the yellow **PayPal** button (or click **Simulate Demo Contribution** in offline demo mode).
- The transaction completes. The confirmation screen appears with Receipt Code `SKH-...` and status *"LOCKED IN MILESTONE ESCROW"*.

**Voiceover Narration:**
> *"Let's contribute 1,000 Taka as a donor. In our zero-credential demo mode, PayPal calls are simulated, though judges can drop in their own sandbox keys. Sakkhi converts the amount to USD using a fixed rate and executes the order.*
>
> *When the payment completes, funds don't go to an individual's pocket. They are credited to the campaign's escrow balance in integer poisha inside our double-entry ledger. Our money is now waiting for proof."*

---

### Part 3: Field Volunteer Evidence Upload (0:55 - 1:25)
**On Screen:**
- Switch to the Coordinator Portal at `/admin` (enter passcode `sakkhi2026`).
- Show the **Create Volunteer Invite Link** card. Select **Rahim Uddin**, click **Generate Signed Link**, and copy it.
- Open an incognito tab and paste the link (`/volunteer/<jwt-token>`).
- Rahim's assigned milestones appear. Click **Rescue Boat Fuel & Maintenance**.
- Click **Take or Choose Field Photos & Receipts**.
- Select the demo cash voucher (`receipt-kurigram-fuel.jpg`) showing ৳92,000 for 450 liters of diesel.
- Type Volunteer Note: *"Purchased 450L diesel at Chilmari Ghat Depot for 3 rescue engine boats."*
- Click **Submit Evidence Photos**.

**Voiceover Narration:**
> *"In the field, volunteers don't need passwords. The coordinator generates a cryptographically signed 7-day link that opens directly on their mobile browser.*
>
> *Here, field volunteer Rahim Uddin submits the cash memo for 450 liters of high-speed diesel from the river depot, along with his field notes. When he clicks submit, our forensic pipeline immediately goes to work."*

---

### Part 4: AI Forensic Audit & Deterministic Guardrails (1:25 - 1:55)
**On Screen:**
- Return to the campaign page or admin review.
- Click the **Why was this verified?** drawer on the fuel milestone.
- Show the itemized checklist: High-speed diesel (450L) satisfied; Food-grade jerrycans (100 pcs) satisfied; Chilmari vendor stamp verified.
- Highlight the **Tamper Score** (0.01) and the notice: *"AI helped check this. A person can always override it."*
- Quickly explain the code boundaries.

**Voiceover Narration:**
> *"Sakkhi's multimodal auditor extracts invoice line items, dates, and vendor stamps, checking them against the milestone requirements. But we never trust the AI alone with the money.*
>
> *Before the AI even runs, deterministic code checks for duplicate image hashes across all campaigns and verifies EXIF capture timestamps. After the model runs, strict code ensures the receipt total matches the budget within 10%. If there is any discrepancy or low confidence, funds remain locked for human review."*

---

### Part 5: Automated PayPal Disbursement & Ledger (1:55 - 2:20)
**On Screen:**
- Show the milestone state change to **Verified & Paid**.
- Highlight the banner: *"92,000 BDT sent to Rahim Uddin on 28 October 2026 via PayPal Batch #..."*
- Click the **Live Ledger** link (`/campaigns/flood-relief-kurigram/ledger`).
- Scroll through the chronological table of every donation credit and payout debit.
- Click the **Export CSV** button.

**Voiceover Narration:**
> *"Because this proof was clean, Sakkhi immediately executed the PayPal Payouts API, transferring funds directly to Rahim's PayPal email using idempotent batch keys.*
>
> *The transaction is recorded in our public double-entry ledger. Donors can inspect every single Taka in and Taka out, verify running balances, or download the full audit trail as a CSV file."*

---

### Part 6: The Trust Score & Closing (2:20 - 2:40)
**On Screen:**
- Return to the main campaign header.
- Hover over the **Trust Score: 94/100** pill to reveal the transparent calculation breakdown (100% funds verified against receipts, rapid proof-to-payout turnaround, zero human escalations).
- Show the Bengali language toggle flipping the UI into fluent Bangla typography.
- End on the Sakkhi footer: *"Every Taka, Witnessed."*

**Voiceover Narration:**
> *"Every campaign earns an explainable Trust Score based on math, not marketing: percentage of funds backed by receipts, average release turnaround, and audit history.*
>
> *With Sakkhi, grassroots aid becomes transparent, verifiable, and humane. Thank you."*

---

## ⏱️ Timing Cues & Notes
- Ensure transitions between donor, volunteer, and admin take under 5 seconds each.
- Keep narration calm, steady, and neighborly.
- Total recorded runtime should fall between 2:30 and 2:40.

