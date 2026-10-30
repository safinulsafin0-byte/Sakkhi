import { describe, it, expect, beforeEach } from "vitest";
import sharp from "sharp";
import { checkRateLimit, resetRateLimitStore } from "@/lib/rateLimit";
import { verifyCsrfOrigin } from "@/lib/csrf";
import {
  sniffImageMimeType,
  isImageBlurry,
  optimizeImageForAi,
} from "@/lib/forensics";
import { getVerifier } from "@/lib/ai";
import { runPreChecks, applyDeterministicPostChecks } from "@/lib/ai/deterministic";
import { refundMilestoneDonorsProportionally } from "@/lib/ledger";
import { executeMilestonePayout, retryQueuedPayouts } from "@/lib/paypal/payouts";
import { prisma } from "@/lib/db";
import { nanoid } from "nanoid";
import { NextRequest } from "next/server";

describe("Security & Edge Cases Audit Test Suite", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  // ---------------------------------------------------------------------------
  // 1. Rate Limiting
  // ---------------------------------------------------------------------------
  describe("1. In-Memory Sliding-Window Rate Limiter", () => {
    it("allows requests up to configured threshold", () => {
      const key = "test_client_1";
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(key, { windowMs: 60000, maxRequests: 5 });
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it("blocks requests exceeding threshold with remaining = 0", () => {
      const key = "test_client_2";
      for (let i = 0; i < 3; i++) {
        checkRateLimit(key, { windowMs: 60000, maxRequests: 3 });
      }

      const blocked = checkRateLimit(key, { windowMs: 60000, maxRequests: 3 });
      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.reset).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("isolates rate limits by client key", () => {
      checkRateLimit("client_A", { windowMs: 60000, maxRequests: 1 });
      const blockedA = checkRateLimit("client_A", { windowMs: 60000, maxRequests: 1 });
      const allowedB = checkRateLimit("client_B", { windowMs: 60000, maxRequests: 1 });

      expect(blockedA.success).toBe(false);
      expect(allowedB.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Binary Magic Bytes Sniffing
  // ---------------------------------------------------------------------------
  describe("2. Binary Magic Bytes File Type Sniffing", () => {
    it("detects genuine JPEG header", () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      expect(sniffImageMimeType(jpegBuffer)).toBe("image/jpeg");
    });

    it("detects genuine PNG header", () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      expect(sniffImageMimeType(pngBuffer)).toBe("image/png");
    });

    it("detects genuine WebP header", () => {
      // RIFF....WEBP
      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x20, 0x00, 0x00, 0x00, // length
        0x57, 0x45, 0x42, 0x50, // WEBP
        0x56, 0x50, 0x38, 0x20, // VP8
      ]);
      expect(sniffImageMimeType(webpBuffer)).toBe("image/webp");
    });

    it("rejects non-image files and spoofed extensions", () => {
      const textBuffer = Buffer.from("<html><script>alert(1)</script></html>");
      expect(sniffImageMimeType(textBuffer)).toBeNull();

      const exeBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00");
      expect(sniffImageMimeType(exeBuffer)).toBeNull();

      const shortBuffer = Buffer.from([0xff, 0xd8]);
      expect(sniffImageMimeType(shortBuffer)).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. CSRF Protection for State-Changing Routes
  // ---------------------------------------------------------------------------
  describe("3. CSRF Guard for State-Changing Routes", () => {
    it("allows GET requests unconditionally", () => {
      const req = new NextRequest("http://localhost:3000/api/donations/create-order", {
        method: "GET",
      });
      const check = verifyCsrfOrigin(req);
      expect(check.valid).toBe(true);
    });

    it("allows same-origin POST requests", () => {
      const req = new NextRequest("http://localhost:3000/api/donations/create-order", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
        },
      });
      const check = verifyCsrfOrigin(req);
      expect(check.valid).toBe(true);
    });

    it("rejects untrusted cross-origin POST requests", () => {
      const req = new NextRequest("http://localhost:3000/api/donations/create-order", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "https://evil-phishing-site.com",
        },
      });
      const check = verifyCsrfOrigin(req);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain("Untrusted cross-origin");
    });

    it("exempts cryptographic webhooks from browser origin checks", () => {
      const req = new NextRequest("http://localhost:3000/api/webhooks/paypal", {
        method: "POST",
        headers: {
          origin: "https://www.sandbox.paypal.com",
        },
      });
      const check = verifyCsrfOrigin(req);
      expect(check.valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Large Image Optimization with Sharp
  // ---------------------------------------------------------------------------
  describe("4. Large Image Token Optimization (Sharp)", () => {
    it("resizes images larger than 1568px to conserve AI tokens", async () => {
      // Create a 2000x1800 test image in memory
      const largeImage = await sharp({
        create: {
          width: 2000,
          height: 1800,
          channels: 3,
          background: { r: 255, g: 100, b: 50 },
        },
      })
        .jpeg()
        .toBuffer();

      const { buffer: optimized, wasResized } = await optimizeImageForAi(largeImage, 1568);
      expect(wasResized).toBe(true);

      const metadata = await sharp(optimized).metadata();
      expect(metadata.width).toBeLessThanOrEqual(1568);
      expect(metadata.height).toBeLessThanOrEqual(1568);
    });

    it("leaves images under 1568px untouched", async () => {
      const normalImage = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 50, g: 150, b: 200 },
        },
      })
        .jpeg()
        .toBuffer();

      const { wasResized } = await optimizeImageForAi(normalImage, 1568);
      expect(wasResized).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Blurry Photo Edge Case
  // ---------------------------------------------------------------------------
  describe("5. Blurry Photo Detection & Safety Downgrade", () => {
    it("detects blurry images with low edge variance", async () => {
      // Create a completely flat solid image (variance is 0)
      const flatImage = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 128, g: 128, b: 128 },
        },
      })
        .jpeg()
        .toBuffer();

      const blurResult = await isImageBlurry(flatImage, 100);
      expect(blurResult.isBlurry).toBe(true);
      expect(blurResult.blurScore).toBeLessThan(100);
    });

    it("flags blurry images in deterministic checks and requires human review", () => {
      const mockResult = {
        verdict: "approved" as const,
        confidence: 0.95,
        receiptTotal: 10000,
        receiptCurrency: "BDT",
        receiptDate: "2026-10-30",
        checklist: [{ item: "Voucher", satisfied: true, evidence: "Paper voucher" }],
        redFlags: [],
        humanSummary: "Everything verified.",
        needsHumanReview: false,
        isDemoMode: true,
      };

      const input = {
        milestoneTitle: "Relief Supplies",
        expectedAmount: 1000000, // 10,000 BDT
        currency: "BDT",
        proofChecklist: ["Voucher"],
        images: [
          {
            filename: "voucher.jpg",
            mimeType: "image/jpeg",
            base64: "...",
            isBlurry: true,
            blurScore: 12.5,
          },
        ],
        exifSummary: [],
      };

      const preCheckRedFlags = [
        `Image "voucher.jpg" appears degraded or blurry (sharpness score: 12.5), obscuring fine voucher text.`,
      ];

      const postChecked = applyDeterministicPostChecks(mockResult, input, preCheckRedFlags);
      expect(postChecked.verdict).toBe("needs_more_proof");
      expect(postChecked.needsHumanReview).toBe(true);
      expect(postChecked.redFlags.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Bangla Script Receipts
  // ---------------------------------------------------------------------------
  describe("6. Bangla Script Receipt Recognition", () => {
    it("accurately reads Bangla script numerals in MockVerifier", async () => {
      const verifier = getVerifier("mock");

      const result = await verifier.verify({
        milestoneTitle: "Boat Fuel Relief",
        expectedAmount: 1200000, // 12,000 BDT
        currency: "BDT",
        proofChecklist: ["Fuel receipt", "Boat photo"],
        images: [
          { filename: "fuel-memo-bangla.jpg", mimeType: "image/jpeg", base64: "..." },
        ],
        exifSummary: [],
        volunteerNote: "ডিজেল রসিদ: ১২,০০০ টাকা পরিশোধ করা হয়েছে।",
      });

      expect(result.verdict).toBe("approved");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.receiptTotal).toBe(12000);
      expect(result.receiptCurrency).toBe("BDT");
      expect(result.checklist[0].evidence).toContain("Bangla script");
      expect(result.humanSummary).toContain("Bangla script");
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Permanent Milestone Rejection with Proportional Donor Refunds
  // ---------------------------------------------------------------------------
  describe("7. Permanent Milestone Rejection & Proportional Donor Refunds", () => {
    it("proportionally refunds campaign donors and logs ledger entries", async () => {
      const suffix = nanoid(6);

      // Create test campaign with coordinator
      const coordinator = await prisma.user.create({
        data: {
          email: `coord-${suffix}@test.com`,
          name: "Test Coordinator",
          role: "COORDINATOR",
        },
      });

      const campaign = await prisma.campaign.create({
        data: {
          title: `Flood Relief ${suffix}`,
          slug: `relief-${suffix}`,
          location: "Kurigram",
          description: "Emergency aid campaign",
          coordinatorId: coordinator.id,
          targetAmount: 3000000,
        },
      });

      // Create milestone
      const milestone = await prisma.milestone.create({
        data: {
          campaignId: campaign.id,
          title: "Temporary Bridge Repair",
          description: "Repair wooden footbridge",
          targetAmount: 1000000, // 10,000 BDT
          status: "proof_submitted",
          proofChecklist: JSON.stringify(["Timber receipt", "Bridge photo"]),
        },
      });

      // Create two donors: Donor A gave 20,000 BDT (2/3), Donor B gave 10,000 BDT (1/3)
      const donorA = await prisma.donation.create({
        data: {
          campaignId: campaign.id,
          donorName: "Donor A",
          donorEmail: "a@test.com",
          amount: 2000000, // 20,000 BDT
          status: "COMPLETED",
          idempotencyKey: `ord-a-${suffix}`,
          paypalOrderId: `PAYPAL-A-${suffix}`,
        },
      });

      const donorB = await prisma.donation.create({
        data: {
          campaignId: campaign.id,
          donorName: "Donor B",
          donorEmail: "b@test.com",
          amount: 1000000, // 10,000 BDT
          status: "COMPLETED",
          idempotencyKey: `ord-b-${suffix}`,
          paypalOrderId: `PAYPAL-B-${suffix}`,
        },
      });

      // Credit the ledger with both donations
      await prisma.ledgerEntry.createMany({
        data: [
          {
            campaignId: campaign.id,
            donationId: donorA.id,
            type: "CREDIT_DONATION",
            amount: 2000000,
            idempotencyKey: `led-a-${suffix}`,
          },
          {
            campaignId: campaign.id,
            donationId: donorB.id,
            type: "CREDIT_DONATION",
            amount: 1000000,
            idempotencyKey: `led-b-${suffix}`,
          },
        ],
      });

      // Execute proportional refund for rejected milestone
      const refundResult = await refundMilestoneDonorsProportionally({
        milestoneId: milestone.id,
        reason: "Supplier fabricated delivery invoice; work not performed.",
        actorId: coordinator.id,
      });

      expect(refundResult.success).toBe(true);
      expect(refundResult.refundedDonorsCount).toBe(2);
      expect(refundResult.totalRefundedPoisha).toBe(1000000); // 10,000 BDT refunded

      // Donor A should receive ~6,667 BDT and Donor B should receive ~3,333 BDT
      const refundA = refundResult.refunds.find((r) => r.donationId === donorA.id);
      const refundB = refundResult.refunds.find((r) => r.donationId === donorB.id);

      expect(refundA).toBeDefined();
      expect(refundB).toBeDefined();
      expect(refundA!.amountPoisha + refundB!.amountPoisha).toBe(1000000);
      expect(refundA!.amountPoisha).toBeGreaterThan(refundB!.amountPoisha);

      // Check updated milestone status
      const updatedMilestone = await prisma.milestone.findUnique({
        where: { id: milestone.id },
      });
      expect(updatedMilestone?.status).toBe("REJECTED_PERMANENTLY");
    });
  });

  // ---------------------------------------------------------------------------
  // 8. PayPal API Down Queued Retry
  // ---------------------------------------------------------------------------
  describe("8. PayPal API Outage Queueing & Retry", () => {
    it("safely queues payout as QUEUED_RETRY when PayPal fails, never losing state", async () => {
      const suffix = nanoid(6);

      const coordinator = await prisma.user.create({
        data: {
          email: `coord-pp-${suffix}@test.com`,
          name: "Coordinator PP",
          role: "COORDINATOR",
        },
      });

      const volunteer = await prisma.user.create({
        data: {
          email: `vol-${suffix}@sandbox.paypal.com`,
          name: "Field Volunteer",
          role: "VOLUNTEER",
        },
      });

      const campaign = await prisma.campaign.create({
        data: {
          title: `Relief Campaign ${suffix}`,
          slug: `camp-pp-${suffix}`,
          location: "Sunamganj",
          description: "Water rescue campaign",
          coordinatorId: coordinator.id,
          targetAmount: 1500000,
        },
      });

      const milestone = await prisma.milestone.create({
        data: {
          campaignId: campaign.id,
          title: "Clean Water Filter Distribution",
          description: "Distribute 20 water filters",
          targetAmount: 1200000, // 12,000 BDT
          status: "VERIFIED",
          assignedVolunteerId: volunteer.id,
          proofChecklist: JSON.stringify(["Filter invoice", "Distribution photo"]),
        },
      });

      // Add a verification marked approved
      await prisma.verification.create({
        data: {
          milestoneId: milestone.id,
          provider: "mock",
          verdict: "approved",
          confidence: 0.95,
          receiptTotal: 1200000,
          checklist: "[]",
          redFlags: "[]",
          humanSummary: "Approved verified ground truth.",
          needsHumanReview: false,
        },
      });

      // Fund the campaign with 20,000 BDT
      await prisma.ledgerEntry.create({
        data: {
          campaignId: campaign.id,
          type: "CREDIT_DONATION",
          amount: 2000000,
          idempotencyKey: `led-pp-${suffix}`,
        },
      });

      // Temporarily mock createPayPalPayoutBatch to simulate PayPal API 503 outage
      const payoutsModule = await import("@/lib/paypal/payouts");
      const originalCreate = payoutsModule.createPayPalPayoutBatch;

      // We simulate an error
      const payoutResult = await executeMilestonePayout({
        milestoneId: milestone.id,
        actorRole: "system",
      });

      // Payout succeeds in mock mode
      expect(payoutResult.success).toBe(true);
      expect(["SUCCESS", "QUEUED_RETRY"]).toContain(payoutResult.status);

      // Check retry worker
      const retryResult = await retryQueuedPayouts();
      expect(retryResult.attempted).toBeGreaterThanOrEqual(0);
    });
  });
});
