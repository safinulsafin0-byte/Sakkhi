import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  computeCampaignBalance,
  recordDonation,
  reserveFunds,
  releaseFunds,
  refundDonation,
} from "@/lib/ledger";
import { bdtToPoisha, poishaToBdt } from "@/lib/config";

describe("Sakkhi Double-Entry Ledger System", () => {
  let testUserId: string;
  let testCampaignId: string;
  let milestone1Id: string;
  let milestone2Id: string;

  beforeAll(async () => {
    // Create isolated test user and campaign
    const user = await prisma.user.create({
      data: {
        email: `test-coordinator-${Date.now()}@sakkhiai.org`,
        name: "Test Coordinator",
        role: "COORDINATOR",
      },
    });
    testUserId = user.id;

    const campaign = await prisma.campaign.create({
      data: {
        title: "Test Emergency Relief Campaign",
        slug: `test-relief-campaign-${Date.now()}`,
        location: "Test District",
        description: "Test campaign for ledger accounting invariants",
        targetAmount: bdtToPoisha(100000), // 100,000 BDT
        currency: "BDT",
        coordinatorId: testUserId,
      },
    });
    testCampaignId = campaign.id;

    const m1 = await prisma.milestone.create({
      data: {
        campaignId: testCampaignId,
        title: "Test Milestone 1 - Water Purification",
        description: "Procure water filters",
        order: 1,
        targetAmount: bdtToPoisha(40000), // 40,000 BDT
        proofChecklist: JSON.stringify(["Receipt", "GPS photo"]),
      },
    });
    milestone1Id = m1.id;

    const m2 = await prisma.milestone.create({
      data: {
        campaignId: testCampaignId,
        title: "Test Milestone 2 - Dry Rations",
        description: "Procure grain bundles",
        order: 2,
        targetAmount: bdtToPoisha(50000), // 50,000 BDT
        proofChecklist: JSON.stringify(["Wholesale bill", "Sign-off"]),
      },
    });
    milestone2Id = m2.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testCampaignId) {
      await prisma.auditLog.deleteMany({ where: { campaignId: testCampaignId } });
      await prisma.ledgerEntry.deleteMany({ where: { campaignId: testCampaignId } });
      await prisma.donation.deleteMany({ where: { campaignId: testCampaignId } });
      await prisma.milestone.deleteMany({ where: { campaignId: testCampaignId } });
      await prisma.campaign.deleteMany({ where: { id: testCampaignId } });
    }
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
  });

  describe("Initial State & Basic Donation Accounting", () => {
    it("starts with zero balance and zero entries", async () => {
      const balance = await computeCampaignBalance(testCampaignId);
      expect(balance.totalDonated).toBe(0);
      expect(balance.totalRefunded).toBe(0);
      expect(balance.totalReserved).toBe(0);
      expect(balance.totalReleased).toBe(0);
      expect(balance.netRaised).toBe(0);
      expect(balance.availableBalance).toBe(0);
    });

    it("records donations correctly in poisha and calculates available balance", async () => {
      const donationAmount = bdtToPoisha(30000); // 30,000 BDT = 3,000,000 poisha

      const res = await recordDonation({
        campaignId: testCampaignId,
        donorName: "Kazi Test Donor",
        donorEmail: "kazi.test@example.com",
        amount: donationAmount,
        idempotencyKey: "test-idem-don-001",
        paypalOrderId: "TEST-PAYID-001",
      });

      expect(res.isDuplicate).toBe(false);
      expect(res.donation.amount).toBe(donationAmount);
      expect(res.balance.totalDonated).toBe(donationAmount);
      expect(res.balance.availableBalance).toBe(donationAmount);
      expect(poishaToBdt(res.balance.availableBalance)).toBe(30000);
    });
  });

  describe("Idempotent Retries", () => {
    it("returns existing record without duplicating donation or modifying balance", async () => {
      const donationAmount = bdtToPoisha(30000);

      // Re-submit the exact same donation idempotency key
      const duplicateRes = await recordDonation({
        campaignId: testCampaignId,
        donorName: "Kazi Test Donor",
        amount: donationAmount,
        idempotencyKey: "test-idem-don-001",
      });

      expect(duplicateRes.isDuplicate).toBe(true);
      expect(duplicateRes.balance.totalDonated).toBe(donationAmount); // Still 30,000 BDT, NOT 60,000 BDT
      expect(duplicateRes.balance.availableBalance).toBe(donationAmount);
    });

    it("handles idempotent milestone reservations", async () => {
      const reserveAmount = bdtToPoisha(15000);

      const firstCall = await reserveFunds({
        campaignId: testCampaignId,
        milestoneId: milestone1Id,
        amount: reserveAmount,
        idempotencyKey: "test-idem-res-001",
      });

      expect(firstCall.isDuplicate).toBe(false);
      expect(firstCall.balance.totalReserved).toBe(reserveAmount);
      expect(firstCall.balance.availableBalance).toBe(bdtToPoisha(15000)); // 30,000 - 15,000

      // Re-submit identical reservation key
      const secondCall = await reserveFunds({
        campaignId: testCampaignId,
        milestoneId: milestone1Id,
        amount: reserveAmount,
        idempotencyKey: "test-idem-res-001",
      });

      expect(secondCall.isDuplicate).toBe(true);
      expect(secondCall.balance.totalReserved).toBe(reserveAmount);
      expect(secondCall.balance.availableBalance).toBe(bdtToPoisha(15000));
    });

    it("handles idempotent milestone fund releases", async () => {
      const releaseAmount = bdtToPoisha(15000);

      const firstRelease = await releaseFunds({
        campaignId: testCampaignId,
        milestoneId: milestone1Id,
        amount: releaseAmount,
        recipient: "Water Filter Supply Co.",
        idempotencyKey: "test-idem-rel-001",
      });

      expect(firstRelease.isDuplicate).toBe(false);
      expect(firstRelease.balance.totalReleased).toBe(releaseAmount);
      expect(firstRelease.balance.totalReserved).toBe(0); // released from reserve

      // Re-submit identical release key
      const secondRelease = await releaseFunds({
        campaignId: testCampaignId,
        milestoneId: milestone1Id,
        amount: releaseAmount,
        recipient: "Water Filter Supply Co.",
        idempotencyKey: "test-idem-rel-001",
      });

      expect(secondRelease.isDuplicate).toBe(true);
      expect(secondRelease.balance.totalReleased).toBe(releaseAmount);
    });
  });

  describe("Double-Spend Prevention", () => {
    it("fails to reserve funds when requested amount exceeds available campaign balance", async () => {
      const currentBalance = await computeCampaignBalance(testCampaignId);
      // Currently available is 15,000 BDT (30,000 donated - 15,000 released)
      expect(currentBalance.availableBalance).toBe(bdtToPoisha(15000));

      const excessiveAmount = bdtToPoisha(25000); // 25,000 > 15,000

      await expect(
        reserveFunds({
          campaignId: testCampaignId,
          milestoneId: milestone2Id,
          amount: excessiveAmount,
          idempotencyKey: "test-fail-excess-reserve",
        })
      ).rejects.toThrow(/Insufficient available campaign funds/);

      // Verify balance did not change
      const afterBalance = await computeCampaignBalance(testCampaignId);
      expect(afterBalance.availableBalance).toBe(bdtToPoisha(15000));
      expect(afterBalance.totalReserved).toBe(0);
    });

    it("locks reserved funds so subsequent operations cannot double-spend them", async () => {
      // Reserve 10,000 BDT out of remaining 15,000 BDT
      await reserveFunds({
        campaignId: testCampaignId,
        milestoneId: milestone2Id,
        amount: bdtToPoisha(10000),
        idempotencyKey: "test-res-lock-001",
      });

      const balance = await computeCampaignBalance(testCampaignId);
      expect(balance.availableBalance).toBe(bdtToPoisha(5000)); // Only 5,000 BDT remains unearmarked

      // Attempting to reserve 8,000 BDT must fail because only 5,000 BDT is unreserved
      await expect(
        reserveFunds({
          campaignId: testCampaignId,
          milestoneId: milestone2Id,
          amount: bdtToPoisha(8000),
          idempotencyKey: "test-fail-double-reserve",
        })
      ).rejects.toThrow(/Insufficient available campaign funds/);
    });
  });

  describe("Refund Math & Partial Refunds", () => {
    let secondDonationId: string;

    beforeAll(async () => {
      // Add a second donation of 50,000 BDT to test refund scenarios
      const res = await recordDonation({
        campaignId: testCampaignId,
        donorName: "Farhana Donor",
        donorEmail: "farhana@example.com",
        amount: bdtToPoisha(50000),
        idempotencyKey: "test-don-refund-target",
      });
      secondDonationId = res.donation.id;
    });

    it("allows valid partial refunds and updates campaign and donation totals", async () => {
      const initialBalance = await computeCampaignBalance(testCampaignId);
      const partialRefundAmount = bdtToPoisha(12000); // 12,000 BDT

      const refundRes = await refundDonation({
        donationId: secondDonationId,
        amount: partialRefundAmount,
        reason: "Donor requested partial return due to billing correction",
        idempotencyKey: "test-idem-ref-001",
      });

      expect(refundRes.isDuplicate).toBe(false);
      expect(refundRes.donation.status).toBe("PARTIALLY_REFUNDED");

      const newBalance = await computeCampaignBalance(testCampaignId);
      expect(newBalance.totalRefunded).toBe(partialRefundAmount);
      expect(newBalance.availableBalance).toBe(initialBalance.availableBalance - partialRefundAmount);

      // Re-trying with identical key is idempotent
      const duplicateRefund = await refundDonation({
        donationId: secondDonationId,
        amount: partialRefundAmount,
        idempotencyKey: "test-idem-ref-001",
      });
      expect(duplicateRefund.isDuplicate).toBe(true);
      expect(duplicateRefund.balance?.totalRefunded).toBe(partialRefundAmount);
    });

    it("rejects refund amounts exceeding the original remaining unrefunded donation", async () => {
      // Original was 50,000 BDT. 12,000 BDT was refunded. Max refundable is now 38,000 BDT.
      const excessiveRefund = bdtToPoisha(40000); // 40,000 > 38,000

      await expect(
        refundDonation({
          donationId: secondDonationId,
          amount: excessiveRefund,
          idempotencyKey: "test-fail-excess-refund",
        })
      ).rejects.toThrow(/exceeds remaining refundable/);
    });
  });

  describe("Non-Negative Balance Invariant", () => {
    it("guarantees campaign balance can NEVER go negative even if donation is valid", async () => {
      // Available balance is currently:
      // Donated: 30,000 + 50,000 = 80,000 BDT
      // Refunded: 12,000 BDT
      // Released: 15,000 BDT
      // Reserved: 10,000 BDT
      // Net raised: 68,000 BDT
      // Available: 68,000 - 15,000 - 10,000 = 43,000 BDT
      const balance = await computeCampaignBalance(testCampaignId);
      expect(balance.availableBalance).toBe(bdtToPoisha(43000));

      // Now earmark/reserve 40,000 BDT of it
      await reserveFunds({
        campaignId: testCampaignId,
        milestoneId: milestone2Id,
        amount: bdtToPoisha(40000),
        idempotencyKey: "test-reserve-drain",
      });

      const drainedBalance = await computeCampaignBalance(testCampaignId);
      expect(drainedBalance.availableBalance).toBe(bdtToPoisha(3000)); // Only 3,000 BDT available

      // The original donation from test-don-refund-target still has 38,000 BDT refundable on paper.
      // But refunding 20,000 BDT would drive availableBalance to negative (3,000 - 20,000 = -17,000).
      // The ledger MUST reject this to prevent unbacked disbursements!
      await expect(
        refundDonation({
          donationId: (await prisma.donation.findUniqueOrThrow({ where: { idempotencyKey: "test-don-refund-target" } })).id,
          amount: bdtToPoisha(20000),
          idempotencyKey: "test-fail-negative-balance",
        })
      ).rejects.toThrow(/Cannot issue refund.*campaign available balance/);

      // Verify balance did not go negative
      const verifiedBalance = await computeCampaignBalance(testCampaignId);
      expect(verifiedBalance.availableBalance).toBeGreaterThanOrEqual(0);
      expect(verifiedBalance.availableBalance).toBe(bdtToPoisha(3000));
    });

    it("verifies the seeded Kurigram campaign satisfies all invariants", async () => {
      const kurigram = await prisma.campaign.findUniqueOrThrow({
        where: { slug: "flood-relief-kurigram" },
      });

      const balance = await computeCampaignBalance(kurigram.id);

      // Total donated: 50,000 + 100,000 + 120,000 = 270,000 BDT (27,000,000 poisha)
      expect(balance.totalDonated).toBe(27000000);
      expect(balance.totalRefunded).toBe(0);
      // Milestone 1 released: 92,000 BDT (9,200,000 poisha)
      expect(balance.totalReleased).toBe(9200000);
      // Milestone 2 reserved: 150,000 BDT (15,000,000 poisha)
      expect(balance.totalReserved).toBe(15000000);
      // Available: 270,000 - 92,000 - 150,000 = 28,000 BDT (2,800,000 poisha)
      expect(balance.availableBalance).toBe(2800000);
      expect(balance.availableBalance).toBeGreaterThan(0);
      expect(balance.netRaised).toBe(balance.totalDonated - balance.totalRefunded);
    });
  });
});
