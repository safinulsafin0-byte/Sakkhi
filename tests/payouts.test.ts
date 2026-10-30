import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../lib/db";
import { executeMilestonePayout, handlePayoutFailure } from "../lib/paypal/payouts";
import { recordDonation, computeCampaignBalance } from "../lib/ledger";
import { bdtToPoisha } from "../lib/config";

describe("Milestone PayPal Payouts & Transactional Release Rules", () => {
  let campaignId: string;
  let coordinatorId: string;
  let volunteerId: string;
  let verifiedMilestoneId: string;
  let flaggedMilestoneId: string;

  beforeEach(async () => {
    const timestamp = Date.now() + Math.random().toString(36).substring(7);

    // 1. Setup Coordinator and Volunteer with unique emails
    const coordinator = await prisma.user.create({
      data: {
        email: `coordinator-${timestamp}@sakkhi.org`,
        name: "Nusrat Jahan",
        role: "COORDINATOR",
      },
    });
    coordinatorId = coordinator.id;

    const volunteer = await prisma.user.create({
      data: {
        email: `rahim-${timestamp}@sakkhi.org`,
        name: "Rahim Uddin",
        role: "VOLUNTEER",
        paypalEmail: "rahim-volunteer@sandbox.paypal.com",
      },
    });
    volunteerId = volunteer.id;

    // 2. Setup isolated Campaign with 50,000 BDT target
    const campaign = await prisma.campaign.create({
      data: {
        slug: `test-relief-${timestamp}`,
        title: "Test Flood Emergency Response",
        description: "Emergency provisions for flood affected families.",
        location: "Kurigram",
        status: "ACTIVE",
        targetAmount: bdtToPoisha(50000), // 5,000,000 poisha
        currency: "BDT",
        coordinatorId,
      },
    });
    campaignId = campaign.id;

    // 4. Setup clean verified milestone (12,000 BDT)
    const verifiedMilestone = await prisma.milestone.create({
      data: {
        campaignId,
        title: "Rescue Boat Fuel",
        description: "Fuel drums for motorized river transport.",
        order: 1,
        targetAmount: bdtToPoisha(12000), // 1,200,000 poisha
        status: "VERIFIED",
        proofChecklist: JSON.stringify(["Fuel memo", "Loaded boat photo"]),
        assignedVolunteerId: volunteerId,
      },
    });
    verifiedMilestoneId = verifiedMilestone.id;

    // Setup an approved verification record without flags
    await prisma.verification.create({
      data: {
        milestoneId: verifiedMilestoneId,
        provider: "mock",
        verdict: "approved",
        confidence: 0.95,
        receiptTotal: 12000,
        receiptCurrency: "BDT",
        checklist: JSON.stringify([{ item: "Fuel memo", satisfied: true, evidence: "Clear receipt" }]),
        redFlags: JSON.stringify([]),
        humanSummary: "Clear fuel memo verified.",
        needsHumanReview: false,
        isDemoMode: true,
      },
    });

    // 5. Setup flagged milestone (15,000 BDT)
    const flaggedMilestone = await prisma.milestone.create({
      data: {
        campaignId,
        title: "Emergency Medical Kits",
        description: "Saline and water purification packs.",
        order: 2,
        targetAmount: bdtToPoisha(15000), // 1,500,000 poisha
        status: "needs_more_proof",
        proofChecklist: JSON.stringify(["Pharmacy receipt"]),
        assignedVolunteerId: volunteerId,
      },
    });
    flaggedMilestoneId = flaggedMilestone.id;

    await prisma.verification.create({
      data: {
        milestoneId: flaggedMilestoneId,
        provider: "mock",
        verdict: "needs_more_proof",
        confidence: 0.60,
        receiptTotal: null,
        checklist: JSON.stringify([{ item: "Pharmacy receipt", satisfied: false, evidence: "Folded line" }]),
        redFlags: JSON.stringify(["Folded line on receipt"]),
        humanSummary: "Receipt details folded.",
        needsHumanReview: true,
        isDemoMode: true,
      },
    });
  });

  it("1. Successful Payout: dispatches payout, creates Payout row, writes LedgerEntry, and sets milestone to RELEASED", async () => {
    // Donate 30,000 BDT so campaign has sufficient unreserved balance
    await recordDonation({
      campaignId,
      donorName: "Anisur Rahman",
      donorEmail: "anis@example.com",
      amount: bdtToPoisha(30000),
      currency: "BDT",
      idempotencyKey: `don-success-${Date.now()}`,
    });

    const result = await executeMilestonePayout({
      milestoneId: verifiedMilestoneId,
      actorId: "coordinator-1",
      actorRole: "coordinator",
    });

    expect(result.success).toBe(true);
    expect(result.batchId).toBeDefined();
    expect(result.amountBdt).toBe(12000);
    expect(result.amountUsd).toBe("100.00"); // 12,000 BDT / 120 = 100 USD
    expect(result.recipientEmail).toBe("rahim-volunteer@sandbox.paypal.com");

    // Verify Milestone state
    const updatedMilestone = await prisma.milestone.findUnique({
      where: { id: verifiedMilestoneId },
      include: { payout: true },
    });
    expect(updatedMilestone?.status).toBe("RELEASED");
    expect(updatedMilestone?.releasedAt).not.toBeNull();
    expect(updatedMilestone?.payout).not.toBeNull();
    expect(updatedMilestone?.payout?.status).toBe("SUCCESS");

    // Verify double-entry ledger entry
    const ledger = await prisma.ledgerEntry.findFirst({
      where: {
        milestoneId: verifiedMilestoneId,
        type: "RELEASE_PAYMENT",
      },
    });
    expect(ledger).not.toBeNull();
    expect(ledger?.amount).toBe(bdtToPoisha(12000));

    // Verify AuditLog
    const audit = await prisma.auditLog.findFirst({
      where: {
        milestoneId: verifiedMilestoneId,
        action: "FUNDS_RELEASED",
      },
    });
    expect(audit).not.toBeNull();
  });

  it("2. Insufficient Balance Rule: blocks payout if campaign balance is insufficient", async () => {
    // Campaign has 0 donations
    const initialBalance = await computeCampaignBalance(campaignId);
    expect(initialBalance.availableBalance).toBe(0);

    await expect(
      executeMilestonePayout({
        milestoneId: verifiedMilestoneId,
      })
    ).rejects.toThrow(/Insufficient campaign balance for payout/);

    // Verify milestone was not changed
    const milestone = await prisma.milestone.findUnique({
      where: { id: verifiedMilestoneId },
    });
    expect(milestone?.status).toBe("VERIFIED");

    // Verify no payout was created
    const payout = await prisma.payout.findFirst({
      where: { milestoneId: verifiedMilestoneId },
    });
    expect(payout).toBeNull();
  });

  it("3. Double Release Attempt: blocks duplicate payouts on an already paid milestone", async () => {
    // Donate 30,000 BDT
    await recordDonation({
      campaignId,
      donorName: "Anisur Rahman",
      amount: bdtToPoisha(30000),
      idempotencyKey: `don-double-${Date.now()}`,
    });

    // First payout succeeds
    await executeMilestonePayout({
      milestoneId: verifiedMilestoneId,
    });

    // Attempt second payout
    await expect(
      executeMilestonePayout({
        milestoneId: verifiedMilestoneId,
      })
    ).rejects.toThrow(/A payout already exists for this milestone/);
  });

  it("4. Flagged Case Rule: prohibits payout unless coordinator explicitly approves", async () => {
    // Donate 30,000 BDT
    await recordDonation({
      campaignId,
      donorName: "Anisur Rahman",
      amount: bdtToPoisha(30000),
      idempotencyKey: `don-flagged-${Date.now()}`,
    });

    // Attempt payout on flagged milestone without override -> should throw
    await expect(
      executeMilestonePayout({
        milestoneId: flaggedMilestoneId,
      })
    ).rejects.toThrow(/Milestone was flagged for human review and requires coordinator approval/);

    // With explicit coordinator override reason -> should succeed
    const overrideResult = await executeMilestonePayout({
      milestoneId: flaggedMilestoneId,
      actorId: coordinatorId,
      actorRole: "coordinator",
      coordinatorOverrideReason: "Confirmed physical cash memo on video call with supplier.",
    });

    expect(overrideResult.success).toBe(true);
    expect(overrideResult.amountBdt).toBe(15000);

    const updated = await prisma.milestone.findUnique({
      where: { id: flaggedMilestoneId },
    });
    expect(updated?.status).toBe("RELEASED");
  });

  it("5. Failed Payout Refund-to-Balance: re-credits campaign available balance on FAILED or RETURNED webhook", async () => {
    // Donate 20,000 BDT
    await recordDonation({
      campaignId,
      donorName: "Farhana Ahmed",
      amount: bdtToPoisha(20000),
      idempotencyKey: `don-reversal-${Date.now()}`,
    });

    // Disburse 12,000 BDT payout
    const payoutResult = await executeMilestonePayout({
      milestoneId: verifiedMilestoneId,
    });

    // Available balance after 12,000 BDT release: 20,000 - 12,000 = 8,000 BDT
    const balanceAfterPayout = await computeCampaignBalance(campaignId);
    expect(balanceAfterPayout.availableBalance).toBe(bdtToPoisha(8000));

    // Simulate PayPal webhook delivering PAYMENT.PAYOUTS-ITEM.FAILED
    const failureResult = await handlePayoutFailure({
      batchId: payoutResult.batchId,
      status: "FAILED",
      reason: "Recipient account closed or restricted in sandbox.",
    });

    expect(failureResult.handled).toBe(true);
    expect(failureResult.status).toBe("FAILED");
    expect(failureResult.refundedAmountBdt).toBe(12000);

    // Available balance must now be restored to full 20,000 BDT
    const balanceAfterReversal = await computeCampaignBalance(campaignId);
    expect(balanceAfterReversal.availableBalance).toBe(bdtToPoisha(20000));

    // Payout record status is FAILED
    const payout = await prisma.payout.findFirst({
      where: { milestoneId: verifiedMilestoneId },
    });
    expect(payout?.status).toBe("FAILED");
    expect(payout?.errorDetails).toContain("Recipient account closed");

    // Milestone is flagged back for coordinator
    const milestone = await prisma.milestone.findUnique({
      where: { id: verifiedMilestoneId },
    });
    expect(milestone?.status).toBe("needs_more_proof");

    // AuditLog entry created
    const audit = await prisma.auditLog.findFirst({
      where: {
        milestoneId: verifiedMilestoneId,
        action: "PAYOUT_FAILED_REFUNDED",
      },
    });
    expect(audit).not.toBeNull();
  });
});
