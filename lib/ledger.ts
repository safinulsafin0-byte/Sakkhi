import { Prisma, PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./db";
import { poishaToUsdCents, poishaToBdt } from "./config";
import { refundPayPalCapture } from "./paypal/client";

export interface CampaignBalance {
  campaignId: string;
  totalDonated: number; // in poisha
  totalRefunded: number; // in poisha
  totalReserved: number; // in poisha (currently earmarked for unreleased milestones)
  totalReleased: number; // in poisha (paid out for completed milestones)
  netRaised: number; // totalDonated - totalRefunded
  availableBalance: number; // totalDonated - totalRefunded - totalReserved - totalReleased
  currency: string;
}

export interface RecordDonationParams {
  campaignId: string;
  donorId?: string;
  donorName: string;
  donorEmail?: string;
  amount: number; // in poisha (smallest unit: 1 BDT = 100 poisha)
  currency?: string;
  idempotencyKey: string;
  paypalOrderId?: string;
  actorId?: string;
}

export interface ReserveFundsParams {
  campaignId: string;
  milestoneId: string;
  amount: number; // in poisha
  idempotencyKey: string;
  actorId?: string;
  description?: string;
}

export interface ReleaseFundsParams {
  campaignId: string;
  milestoneId: string;
  amount: number; // in poisha
  idempotencyKey: string;
  recipient: string;
  actorId?: string;
  proofHash?: string;
  description?: string;
}

export interface RefundParams {
  donationId: string;
  amount?: number; // in poisha; defaults to remaining full amount
  reason?: string;
  idempotencyKey: string;
  actorId?: string;
}

type TransactionClient = Prisma.TransactionClient | PrismaClient;

/**
 * Computes campaign financial balance from the double-entry ledger.
 * Guarantee: availableBalance can never go negative under valid transitions.
 */
export async function computeCampaignBalance(
  campaignId: string,
  tx: TransactionClient = defaultPrisma
): Promise<CampaignBalance> {
  const campaign = await tx.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, currency: true },
  });

  if (!campaign) {
    throw new Error(`Campaign with ID "${campaignId}" not found.`);
  }

  const entries = await tx.ledgerEntry.findMany({
    where: { campaignId },
  });

  let totalDonated = 0;
  let totalRefunded = 0;
  let totalReleased = 0;

  // Track milestone reserves individually to determine active (unreleased) reservations
  const milestoneReserves = new Map<string, number>();

  for (const entry of entries) {
    switch (entry.type) {
      case "CREDIT_DONATION":
        totalDonated += entry.amount;
        break;
      case "REFUND":
        totalRefunded += entry.amount;
        break;
      case "RELEASE_PAYMENT":
        totalReleased += entry.amount;
        if (entry.milestoneId) {
          const current = milestoneReserves.get(entry.milestoneId) || 0;
          milestoneReserves.set(entry.milestoneId, Math.max(0, current - entry.amount));
        }
        break;
      case "DISBURSEMENT_REVERSAL":
        totalReleased = Math.max(0, totalReleased - entry.amount);
        break;
      case "RESERVE_MILESTONE":
        if (entry.milestoneId) {
          const current = milestoneReserves.get(entry.milestoneId) || 0;
          milestoneReserves.set(entry.milestoneId, current + entry.amount);
        }
        break;
    }
  }

  // Active reserved is the sum of currently locked, unreleased funds
  let totalReserved = 0;
  milestoneReserves.forEach((amount) => {
    totalReserved += amount;
  });

  const netRaised = totalDonated - totalRefunded;
  const availableBalance = netRaised - totalReserved - totalReleased;

  return {
    campaignId,
    totalDonated,
    totalRefunded,
    totalReserved,
    totalReleased,
    netRaised,
    availableBalance,
    currency: campaign.currency,
  };
}

/**
 * Records an incoming donation into the campaign ledger.
 * Idempotent: Repeated calls with the same idempotencyKey return the existing donation.
 */
export async function recordDonation(
  params: RecordDonationParams,
  client: PrismaClient = defaultPrisma
) {
  const {
    campaignId,
    donorId,
    donorName,
    donorEmail,
    amount,
    currency = "BDT",
    idempotencyKey,
    paypalOrderId,
    actorId,
  } = params;

  if (amount <= 0 || !Number.isInteger(amount)) {
    throw new Error(`Donation amount must be a positive integer in smallest unit (poisha). Received: ${amount}`);
  }

  // Check existing by idempotency key
  const existing = await client.donation.findUnique({
    where: { idempotencyKey },
    include: { ledgerEntries: true },
  });

  if (existing) {
    const balance = await computeCampaignBalance(campaignId, client);
    return { donation: existing, balance, isDuplicate: true };
  }

  return await client.$transaction(async (tx) => {
    // Verify campaign exists
    const campaign = await tx.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      throw new Error(`Campaign "${campaignId}" not found.`);
    }

    const amountUsdCents = poishaToUsdCents(amount);

    // 1. Create Donation Record
    const donation = await tx.donation.create({
      data: {
        campaignId,
        donorId,
        donorName,
        donorEmail,
        amount,
        currency,
        amountUsdCents,
        status: "COMPLETED",
        idempotencyKey,
        paypalOrderId,
      },
    });

    // 2. Create Double-Entry Ledger Credit
    const ledgerEntry = await tx.ledgerEntry.create({
      data: {
        campaignId,
        donationId: donation.id,
        type: "CREDIT_DONATION",
        amount,
        currency,
        idempotencyKey,
        description: `Donation from ${donorName} (${amount} poisha / ${currency})`,
      },
    });

    // 3. Write Audit Log Entry
    await tx.auditLog.create({
      data: {
        campaignId,
        donationId: donation.id,
        actorId: actorId || donorId,
        actor: donorName,
        action: "DONATION_RECORDED",
        details: JSON.stringify({
          amount,
          currency,
          amountUsdCents,
          idempotencyKey,
          paypalOrderId,
        }),
      },
    });

    const balance = await computeCampaignBalance(campaignId, tx);

    return { donation, ledgerEntry, balance, isDuplicate: false };
  });
}

/**
 * Reserves available campaign funds for a specific milestone.
 * Guarantees: Double-spend prevention; fails if availableBalance < amount.
 */
export async function reserveFunds(
  params: ReserveFundsParams,
  client: PrismaClient = defaultPrisma
) {
  const { campaignId, milestoneId, amount, idempotencyKey, actorId, description } = params;

  if (amount <= 0 || !Number.isInteger(amount)) {
    throw new Error(`Reservation amount must be a positive integer. Received: ${amount}`);
  }

  // Check idempotency
  const existing = await client.ledgerEntry.findUnique({
    where: { idempotencyKey },
  });

  if (existing) {
    const balance = await computeCampaignBalance(campaignId, client);
    return { ledgerEntry: existing, balance, isDuplicate: true };
  }

  return await client.$transaction(async (tx) => {
    const milestone = await tx.milestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone || milestone.campaignId !== campaignId) {
      throw new Error(`Milestone "${milestoneId}" does not belong to campaign "${campaignId}".`);
    }

    const currentBalance = await computeCampaignBalance(campaignId, tx);

    if (currentBalance.availableBalance < amount) {
      throw new Error(
        `Insufficient available campaign funds. Requested reservation: ${amount} poisha, but available balance is ${currentBalance.availableBalance} poisha.`
      );
    }

    // 1. Create Ledger Entry for Reserve
    const ledgerEntry = await tx.ledgerEntry.create({
      data: {
        campaignId,
        milestoneId,
        type: "RESERVE_MILESTONE",
        amount,
        currency: currentBalance.currency,
        idempotencyKey,
        description: description || `Funds reserved for milestone: ${milestone.title}`,
      },
    });

    // 2. Update Milestone status
    await tx.milestone.update({
      where: { id: milestoneId },
      data: { status: "RESERVED" },
    });

    // 3. Write Audit Log
    await tx.auditLog.create({
      data: {
        campaignId,
        milestoneId,
        actorId,
        actor: actorId || "coordinator",
        action: "FUNDS_RESERVED",
        details: JSON.stringify({
          amount,
          milestoneTitle: milestone.title,
          idempotencyKey,
        }),
      },
    });

    const balance = await computeCampaignBalance(campaignId, tx);

    return { ledgerEntry, balance, isDuplicate: false };
  });
}

/**
 * Releases reserved/available funds for a verified milestone to vendors/beneficiaries.
 */
export async function releaseFunds(
  params: ReleaseFundsParams,
  client: PrismaClient = defaultPrisma
) {
  const {
    campaignId,
    milestoneId,
    amount,
    idempotencyKey,
    recipient,
    actorId,
    proofHash,
    description,
  } = params;

  if (amount <= 0 || !Number.isInteger(amount)) {
    throw new Error(`Release amount must be a positive integer. Received: ${amount}`);
  }

  // Check idempotency
  const existing = await client.ledgerEntry.findUnique({
    where: { idempotencyKey },
  });

  if (existing) {
    const balance = await computeCampaignBalance(campaignId, client);
    return { ledgerEntry: existing, balance, isDuplicate: true };
  }

  return await client.$transaction(async (tx) => {
    const milestone = await tx.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        ledgerEntries: true,
      },
    });

    if (!milestone || milestone.campaignId !== campaignId) {
      throw new Error(`Milestone "${milestoneId}" does not belong to campaign "${campaignId}".`);
    }

    // Calculate currently reserved funds for this milestone
    let milestoneReserved = 0;
    for (const e of milestone.ledgerEntries) {
      if (e.type === "RESERVE_MILESTONE") milestoneReserved += e.amount;
      if (e.type === "RELEASE_PAYMENT") milestoneReserved -= e.amount;
    }

    const currentBalance = await computeCampaignBalance(campaignId, tx);

    // Either the milestone already had enough reserved, or available balance covers it
    const totalExpendable = currentBalance.availableBalance + Math.max(0, milestoneReserved);

    if (totalExpendable < amount) {
      throw new Error(
        `Cannot release ${amount} poisha. Total available/reserved for milestone is only ${totalExpendable} poisha.`
      );
    }

    // 1. Create Ledger Entry for Release
    const ledgerEntry = await tx.ledgerEntry.create({
      data: {
        campaignId,
        milestoneId,
        type: "RELEASE_PAYMENT",
        amount,
        currency: currentBalance.currency,
        idempotencyKey,
        description: description || `Disbursement to ${recipient} for verified milestone: ${milestone.title}`,
      },
    });

    // 2. Mark milestone as RELEASED / completed
    await tx.milestone.update({
      where: { id: milestoneId },
      data: {
        status: "RELEASED",
        releasedAt: new Date(),
      },
    });

    // 3. Write Audit Log
    await tx.auditLog.create({
      data: {
        campaignId,
        milestoneId,
        actorId,
        actor: actorId || "coordinator",
        action: "FUNDS_RELEASED",
        details: JSON.stringify({
          amount,
          recipient,
          proofHash,
          idempotencyKey,
        }),
      },
    });

    const balance = await computeCampaignBalance(campaignId, tx);

    return { ledgerEntry, balance, isDuplicate: false };
  });
}

/**
 * Refunds a donation.
 * Guarantees:
 * - Cannot refund more than original net donation.
 * - Balance can NEVER go negative: cannot refund if campaign available funds are already spent/reserved.
 */
export async function refundDonation(
  params: RefundParams,
  client: PrismaClient = defaultPrisma
) {
  const { donationId, amount: requestedAmount, reason, idempotencyKey, actorId } = params;

  // Check idempotency
  const existing = await client.ledgerEntry.findUnique({
    where: { idempotencyKey },
  });

  if (existing) {
    const donation = await client.donation.findUnique({ where: { id: donationId } });
    const balance = donation ? await computeCampaignBalance(donation.campaignId, client) : null;
    return { ledgerEntry: existing, donation, balance, isDuplicate: true };
  }

  return await client.$transaction(async (tx) => {
    const donation = await tx.donation.findUnique({
      where: { id: donationId },
      include: {
        ledgerEntries: true,
      },
    });

    if (!donation) {
      throw new Error(`Donation "${donationId}" not found.`);
    }

    // Calculate already refunded amount
    let alreadyRefunded = 0;
    for (const e of donation.ledgerEntries) {
      if (e.type === "REFUND") {
        alreadyRefunded += e.amount;
      }
    }

    const maxRefundable = donation.amount - alreadyRefunded;

    if (maxRefundable <= 0) {
      throw new Error(`Donation "${donationId}" has already been completely refunded.`);
    }

    const refundAmount = requestedAmount !== undefined ? requestedAmount : maxRefundable;

    if (refundAmount <= 0 || !Number.isInteger(refundAmount)) {
      throw new Error(`Refund amount must be a positive integer. Received: ${refundAmount}`);
    }

    if (refundAmount > maxRefundable) {
      throw new Error(
        `Requested refund of ${refundAmount} poisha exceeds remaining refundable donation balance of ${maxRefundable} poisha.`
      );
    }

    // Check campaign available balance
    const currentBalance = await computeCampaignBalance(donation.campaignId, tx);

    if (currentBalance.availableBalance < refundAmount) {
      throw new Error(
        `Cannot issue refund of ${refundAmount} poisha: campaign available balance is ${currentBalance.availableBalance} poisha. Funds have already been reserved or disbursed for relief milestones.`
      );
    }

    // 1. Create Ledger Entry for Refund
    const ledgerEntry = await tx.ledgerEntry.create({
      data: {
        campaignId: donation.campaignId,
        donationId: donation.id,
        type: "REFUND",
        amount: refundAmount,
        currency: donation.currency,
        idempotencyKey,
        description: reason || `Refund of donation ${donation.id} to ${donation.donorName}`,
      },
    });

    // 2. Update Donation status
    const isFullRefund = alreadyRefunded + refundAmount >= donation.amount;
    const updatedDonation = await tx.donation.update({
      where: { id: donation.id },
      data: {
        status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
      },
    });

    // 3. Write Audit Log
    await tx.auditLog.create({
      data: {
        campaignId: donation.campaignId,
        donationId: donation.id,
        actorId,
        actor: actorId || "admin",
        action: "REFUND_ISSUED",
        details: JSON.stringify({
          refundAmount,
          reason,
          isFullRefund,
          idempotencyKey,
        }),
      },
    });

    const balance = await computeCampaignBalance(donation.campaignId, tx);

    return { ledgerEntry, donation: updatedDonation, balance, isDuplicate: false };
  });
}

export interface ProportionalRefundItem {
  donationId: string;
  donorName: string;
  amountPoisha: number;
  amountUsdCents: number;
  ledgerEntryId: string;
  paypalRefundId?: string;
  isFullRefund: boolean;
}

export interface MilestonePermanentRejectionResult {
  success: boolean;
  milestoneId: string;
  campaignId: string;
  totalRefundedPoisha: number;
  refundedDonorsCount: number;
  refunds: ProportionalRefundItem[];
}

/**
 * Permanently rejects a milestone and issues proportional refunds to campaign donors.
 * 1. Calculates each donor's proportional contribution towards the rejected milestone amount.
 * 2. Writes double-entry REFUND ledger entries.
 * 3. Dispatches partial/full PayPal capture refunds via PayPal API.
 * 4. Updates Milestone status to "REJECTED_PERMANENTLY" and logs AuditLog entries.
 */
export async function refundMilestoneDonorsProportionally(
  params: {
    milestoneId: string;
    reason: string;
    actorId?: string;
  },
  client: PrismaClient = defaultPrisma
): Promise<MilestonePermanentRejectionResult> {
  const { milestoneId, reason, actorId } = params;

  // 1. Fetch milestone
  const milestone = await client.milestone.findUnique({
    where: { id: milestoneId },
    include: { campaign: true },
  });

  if (!milestone) {
    throw new Error(`Milestone with ID "${milestoneId}" not found.`);
  }

  // 2. Fetch all completed/partially-refunded donations for this campaign
  const donations = await client.donation.findMany({
    where: {
      campaignId: milestone.campaignId,
      status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
    },
    include: { ledgerEntries: true },
  });

  if (donations.length === 0) {
    // If no donations, simply mark milestone as rejected
    await client.milestone.update({
      where: { id: milestone.id },
      data: { status: "REJECTED_PERMANENTLY" },
    });

    return {
      success: true,
      milestoneId: milestone.id,
      campaignId: milestone.campaignId,
      totalRefundedPoisha: 0,
      refundedDonorsCount: 0,
      refunds: [],
    };
  }

  // 3. Compute each donation's remaining refundable balance
  const donationStats = donations.map((d) => {
    let refunded = 0;
    for (const entry of d.ledgerEntries) {
      if (entry.type === "REFUND") {
        refunded += entry.amount;
      }
    }
    const remaining = Math.max(0, d.amount - refunded);
    return { donation: d, remaining, originalAmount: d.amount };
  });

  const totalEligiblePoisha = donationStats.reduce((sum, d) => sum + d.remaining, 0);
  const totalOriginalPoisha = donationStats.reduce((sum, d) => sum + d.originalAmount, 0);

  if (totalEligiblePoisha <= 0) {
    await client.milestone.update({
      where: { id: milestone.id },
      data: { status: "REJECTED_PERMANENTLY" },
    });

    return {
      success: true,
      milestoneId: milestone.id,
      campaignId: milestone.campaignId,
      totalRefundedPoisha: 0,
      refundedDonorsCount: 0,
      refunds: [],
    };
  }

  // Target amount to refund cannot exceed the milestone budget or remaining campaign funds
  const targetToRefund = Math.min(milestone.targetAmount, totalEligiblePoisha);
  const refunds: ProportionalRefundItem[] = [];
  let totalRefundedPoisha = 0;

  for (const { donation, remaining, originalAmount } of donationStats) {
    if (remaining <= 0) continue;

    // Proportional calculation based on donor's share of original campaign donations
    const rawShare = Math.round((originalAmount / totalOriginalPoisha) * targetToRefund);
    const donorShare = Math.min(remaining, Math.max(1, rawShare));

    if (donorShare <= 0) continue;

    const idempotencyKey = `m-ref-${milestone.id}-${donation.id}`;

    // Execute ledger refund
    const refundRes = await refundDonation(
      {
        donationId: donation.id,
        amount: donorShare,
        reason: `Proportional refund for rejected milestone "${milestone.title}": ${reason}`,
        idempotencyKey,
        actorId,
      },
      client
    );

    const amountUsdCents = poishaToUsdCents(donorShare);
    let paypalRefundId: string | undefined;

    // If donation was captured via PayPal, issue PayPal refund
    if (donation.paypalOrderId) {
      try {
        const ppRes = await refundPayPalCapture({
          captureId: donation.paypalOrderId,
          amountUsdCents,
          note: `Proportional refund for cancelled relief milestone: ${milestone.title}`,
          requestId: idempotencyKey,
        });
        paypalRefundId = ppRes.id;
      } catch (ppErr: any) {
        console.warn(`[PayPal refund notice for donation ${donation.id}]:`, ppErr.message);
      }
    }

    refunds.push({
      donationId: donation.id,
      donorName: donation.donorName,
      amountPoisha: donorShare,
      amountUsdCents,
      ledgerEntryId: refundRes.ledgerEntry.id,
      paypalRefundId,
      isFullRefund: refundRes.donation?.status === "REFUNDED",
    });

    totalRefundedPoisha += donorShare;
  }

  // 4. Update milestone status to REJECTED_PERMANENTLY
  await client.milestone.update({
    where: { id: milestone.id },
    data: { status: "REJECTED_PERMANENTLY" },
  });

  // 5. Log campaign audit log
  await client.auditLog.create({
    data: {
      campaignId: milestone.campaignId,
      milestoneId: milestone.id,
      actorId,
      actor: actorId || "admin:coordinator",
      action: "MILESTONE_PERMANENTLY_REJECTED_REFUNDED",
      details: JSON.stringify({
        milestoneTitle: milestone.title,
        reason,
        totalRefundedPoisha,
        refundedDonorsCount: refunds.length,
      }),
    },
  });

  return {
    success: true,
    milestoneId: milestone.id,
    campaignId: milestone.campaignId,
    totalRefundedPoisha,
    refundedDonorsCount: refunds.length,
    refunds,
  };
}

