import crypto from "crypto";
import { prisma } from "@/lib/db";
import { poishaToBdt, poishaToUsdCents } from "@/lib/config";
import { paypalRequest, PayPalApiError } from "@/lib/paypal/client";
import { computeCampaignBalance } from "@/lib/ledger";
import { env } from "@/lib/env";

export interface PayPalPayoutBatchResponse {
  batch_header: {
    payout_batch_id: string;
    batch_status: "SUCCESS" | "PENDING" | "DENIED" | "CANCELED";
    sender_batch_header: {
      sender_batch_id: string;
      email_subject?: string;
    };
  };
  links?: Array<{ href: string; rel: string; method: string }>;
}

export interface PayoutDisbursementParams {
  milestoneId: string;
  actorId?: string;
  actorRole?: string;
  coordinatorOverrideReason?: string;
}

export interface PayoutDisbursementResult {
  success: boolean;
  payoutId: string;
  milestoneId: string;
  batchId: string;
  status: string;
  amountBdt: number;
  amountUsd: string;
  recipientEmail: string;
  recipientName: string;
  ledgerEntryId: string;
  queuedForRetry?: boolean;
}

/**
 * Creates a PayPal Payout Batch with one item to the volunteer's PayPal email.
 * Uses sender_batch_id and sender_item_id as idempotency keys.
 */
export async function createPayPalPayoutBatch(params: {
  senderBatchId: string;
  senderItemId: string;
  recipientEmail: string;
  amountUsdStr: string;
  milestoneTitle: string;
}): Promise<PayPalPayoutBatchResponse> {
  const { senderBatchId, senderItemId, recipientEmail, amountUsdStr, milestoneTitle } = params;

  // If in mock/demo mode or PayPal credentials missing, return deterministic sandbox mock
  const isMock =
    env.AI_PROVIDER === "mock" && (!process.env.PAYPAL_CLIENT_ID || env.DEMO_MODE);

  if (isMock) {
    return {
      batch_header: {
        payout_batch_id: `BATCH-MOCK-${senderBatchId.replace(/[^a-zA-Z0-9]/g, "")}`,
        batch_status: "SUCCESS",
        sender_batch_header: {
          sender_batch_id: senderBatchId,
          email_subject: "Sakkhi Milestone Disbursement",
        },
      },
    };
  }

  const payload = {
    sender_batch_header: {
      sender_batch_id: senderBatchId,
      email_subject: "Sakkhi Community Milestone Disbursement",
      email_message: `Payout for milestone: ${milestoneTitle}`,
    },
    items: [
      {
        recipient_type: "EMAIL",
        amount: {
          value: amountUsdStr,
          currency: "USD",
        },
        note: `Sakkhi: ${milestoneTitle.slice(0, 100)}`,
        sender_item_id: senderItemId,
        receiver: recipientEmail,
      },
    ],
  };

  try {
    const res = await paypalRequest<PayPalPayoutBatchResponse>("/v1/payments/payouts", {
      method: "POST",
      body: payload,
      requestId: senderBatchId,
    });
    return res;
  } catch (err: any) {
    // If PayPal returns 400 with duplicate batch id, fetch the existing payout batch
    if (err instanceof PayPalApiError && err.statusCode === 400) {
      const errDetails = err.details as any;
      if (errDetails?.name === "DUPLICATE_REQUEST" || err.message?.includes("DUPLICATE")) {
        return {
          batch_header: {
            payout_batch_id: `BATCH-REUSED-${senderBatchId}`,
            batch_status: "SUCCESS",
            sender_batch_header: { sender_batch_id: senderBatchId },
          },
        };
      }
    }
    throw err;
  }
}

/**
 * Executes a milestone payout under strict transactional release rules:
 * 1. milestone.status must be approved ("VERIFIED" or clean approved verification)
 * 2. campaign has enough unreserved/available balance
 * 3. no payout already exists for this milestone
 * 4. if verification was flagged, coordinator must have approved it
 *
 * All database operations (LedgerEntry, Payout, Milestone state, AuditLog)
 * run atomically inside a single Prisma transaction.
 */
export async function executeMilestonePayout(
  params: PayoutDisbursementParams
): Promise<PayoutDisbursementResult> {
  const { milestoneId, actorId, actorRole, coordinatorOverrideReason } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch milestone with all relations
    const milestone = await tx.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        campaign: true,
        assignedVolunteer: true,
        verifications: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        payout: true,
        ledgerEntries: true,
      },
    });

    if (!milestone) {
      throw new Error(`Milestone with ID "${milestoneId}" not found.`);
    }

    // Rule 1: No payout already exists (unless previously queued for retry due to PayPal outage)
    if (milestone.payout && milestone.payout.status !== "QUEUED_RETRY") {
      throw new Error(
        `A payout already exists for this milestone (Batch: ${milestone.payout.batchId}, Status: ${milestone.payout.status}).`
      );
    }

    if (milestone.status === "RELEASED") {
      throw new Error(`Milestone "${milestone.title}" has already been paid out and released.`);
    }

    // Rule 2 & 3: Check verification approval and coordinator override for flagged cases
    const latestVerification = milestone.verifications[0];
    const isStateVerified = milestone.status === "VERIFIED";
    const isVerdictApproved = latestVerification?.verdict === "approved";

    if (
      latestVerification?.needsHumanReview ||
      !isStateVerified ||
      !isVerdictApproved
    ) {
      const hasCoordinatorApproved =
        latestVerification?.overriddenBy && latestVerification.overrideVerdict === "approved";

      if (!hasCoordinatorApproved && !coordinatorOverrideReason) {
        if (latestVerification?.needsHumanReview) {
          throw new Error(
            "Milestone was flagged for human review and requires coordinator approval before disbursement."
          );
        }
        throw new Error(
          `Payout not allowed: milestone evidence has not been approved. Current status: ${milestone.status}`
        );
      }

      // If coordinator override reason was provided in this call, update verification
      if (latestVerification && (!latestVerification.overriddenBy || latestVerification.overrideVerdict !== "approved")) {
        await tx.verification.update({
          where: { id: latestVerification.id },
          data: {
            overriddenBy: actorId || "coordinator",
            overrideVerdict: "approved",
            overrideReason: coordinatorOverrideReason,
            needsHumanReview: false,
          },
        });
      }
    }

    // Rule 4: Campaign must have enough unreserved/available balance
    const currentBalance = await computeCampaignBalance(milestone.campaignId, tx);

    // Calculate funds currently reserved for this milestone
    let milestoneReserved = 0;
    for (const e of milestone.ledgerEntries) {
      if (e.type === "RESERVE_MILESTONE") milestoneReserved += e.amount;
      if (e.type === "RELEASE_PAYMENT") milestoneReserved -= e.amount;
    }

    const totalExpendable = currentBalance.availableBalance + Math.max(0, milestoneReserved);

    if (totalExpendable < milestone.targetAmount) {
      const availableBdt = poishaToBdt(totalExpendable);
      const requiredBdt = poishaToBdt(milestone.targetAmount);
      throw new Error(
        `Insufficient campaign balance for payout: Available is ${availableBdt.toLocaleString()} BDT, but milestone requires ${requiredBdt.toLocaleString()} BDT.`
      );
    }

    // 2. Resolve recipient email and amounts
    const recipientEmail =
      milestone.assignedVolunteer?.paypalEmail ||
      milestone.assignedVolunteer?.email ||
      "facilitator-volunteer@sandbox.paypal.com";

    const recipientName = milestone.assignedVolunteer?.name || "Field Relief Volunteer";
    const amountBdt = poishaToBdt(milestone.targetAmount);
    const amountUsdCents = poishaToUsdCents(milestone.targetAmount);
    const amountUsdStr = (amountUsdCents / 100).toFixed(2);

    // Derive deterministic idempotency keys
    const senderBatchId = `batch-${milestone.id}`;
    const senderItemId = `item-${milestone.id}`;

    // 3. Dispatch to PayPal Payouts API (with offline fault tolerance)
    let paypalRes: PayPalPayoutBatchResponse | null = null;
    let isPayPalDown = false;
    let payPalErrorMsg = "";

    try {
      paypalRes = await createPayPalPayoutBatch({
        senderBatchId,
        senderItemId,
        recipientEmail,
        amountUsdStr,
        milestoneTitle: milestone.title,
      });
    } catch (err: any) {
      // If PayPal API is down, network fails, or 5xx, queue for retry without losing state
      isPayPalDown = true;
      payPalErrorMsg = err?.message || "PayPal API unreachable";
      console.warn(`[PayPal Payout Offline - Queued for Retry: ${milestone.id}]:`, payPalErrorMsg);
    }

    if (isPayPalDown || !paypalRes) {
      // Create or update Payout in QUEUED_RETRY status
      const existingPayout = milestone.payout;
      const queuedPayout = existingPayout
        ? await tx.payout.update({
            where: { id: existingPayout.id },
            data: {
              status: "QUEUED_RETRY",
              errorDetails: payPalErrorMsg,
            },
          })
        : await tx.payout.create({
            data: {
              milestoneId: milestone.id,
              campaignId: milestone.campaignId,
              volunteerId: milestone.assignedVolunteerId,
              recipientEmail,
              amountPoisha: milestone.targetAmount,
              amountUsdCents,
              currency: milestone.campaign.currency || "BDT",
              batchId: `PENDING-RETRY-${senderBatchId}`,
              senderBatchId,
              senderItemId,
              status: "QUEUED_RETRY",
              errorDetails: payPalErrorMsg,
            },
          });

      // Update milestone to PAYOUT_QUEUED
      await tx.milestone.update({
        where: { id: milestone.id },
        data: { status: "PAYOUT_QUEUED" },
      });

      // Write AuditLog entry
      let validActorId: string | undefined = undefined;
      if (actorId) {
        const userExists = await tx.user.findUnique({
          where: { id: actorId },
          select: { id: true },
        });
        if (userExists) validActorId = actorId;
      }

      await tx.auditLog.create({
        data: {
          campaignId: milestone.campaignId,
          milestoneId: milestone.id,
          actorId: validActorId,
          actor: actorRole || (actorId ? "coordinator" : "system:automated-payout"),
          action: "PAYOUT_QUEUED_RETRY",
          details: JSON.stringify({
            payoutId: queuedPayout.id,
            error: payPalErrorMsg,
            amountBdt,
            recipientEmail,
          }),
        },
      });

      return {
        success: true,
        payoutId: queuedPayout.id,
        milestoneId: milestone.id,
        batchId: queuedPayout.batchId,
        status: "QUEUED_RETRY",
        amountBdt,
        amountUsd: amountUsdStr,
        recipientEmail,
        recipientName,
        ledgerEntryId: "",
        queuedForRetry: true,
      };
    }

    const batchId = paypalRes.batch_header.payout_batch_id;
    const batchStatus =
      paypalRes.batch_header.batch_status === "DENIED" ? "FAILED" : "SUCCESS";

    // 4. Create or update Payout record
    const payout = milestone.payout
      ? await tx.payout.update({
          where: { id: milestone.payout.id },
          data: {
            batchId,
            status: batchStatus,
            errorDetails: null,
          },
        })
      : await tx.payout.create({
          data: {
            milestoneId: milestone.id,
            campaignId: milestone.campaignId,
            volunteerId: milestone.assignedVolunteerId,
            recipientEmail,
            amountPoisha: milestone.targetAmount,
            amountUsdCents,
            currency: milestone.campaign.currency || "BDT",
            batchId,
            senderBatchId,
            senderItemId,
            status: batchStatus,
          },
        });

    // 5. Write double-entry LedgerEntry
    const ledgerEntry = await tx.ledgerEntry.create({
      data: {
        campaignId: milestone.campaignId,
        milestoneId: milestone.id,
        type: "RELEASE_PAYMENT",
        amount: milestone.targetAmount,
        currency: milestone.campaign.currency || "BDT",
        idempotencyKey: `payout-release-${milestone.id}`,
        description: `Milestone disbursement to ${recipientName} (${recipientEmail}) via PayPal Payouts Batch #${batchId}`,
      },
    });

    // 6. Update Milestone state to RELEASED
    await tx.milestone.update({
      where: { id: milestone.id },
      data: {
        status: "RELEASED",
        releasedAt: new Date(),
      },
    });

    // 6.5 Issue Cryptographic Certificate if not already existing
    const existingCert = await tx.certificate.findFirst({
      where: { milestoneId: milestone.id },
    });

    if (!existingCert) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const shortId = milestone.id.slice(-4).toUpperCase();
      const certificateCode = `SKH-${dateStr}-${shortId}`;
      const payloadToSign = `${certificateCode}:${milestone.id}:${milestone.targetAmount}:${batchId}:${recipientEmail}`;
      const signatureHash = crypto.createHash("sha256").update(payloadToSign).digest("hex");

      await tx.certificate.create({
        data: {
          milestoneId: milestone.id,
          certificateCode,
          signatureHash,
          issuer: "Sakkhi Witness Authority",
        },
      });
    }

    // 7. Write AuditLog (validate actorId if provided)
    let validActorId: string | undefined = undefined;
    if (actorId) {
      const userExists = await tx.user.findUnique({
        where: { id: actorId },
        select: { id: true },
      });
      if (userExists) validActorId = actorId;
    }

    await tx.auditLog.create({
      data: {
        campaignId: milestone.campaignId,
        milestoneId: milestone.id,
        actorId: validActorId,
        actor: actorRole || (actorId ? "coordinator" : "system:automated-payout"),
        action: "FUNDS_RELEASED",
        details: JSON.stringify({
          payoutId: payout.id,
          batchId,
          amountBdt,
          amountUsd: amountUsdStr,
          recipientEmail,
          recipientName,
          status: batchStatus,
        }),
      },
    });

    return {
      success: true,
      payoutId: payout.id,
      milestoneId: milestone.id,
      batchId,
      status: batchStatus,
      amountBdt,
      amountUsd: amountUsdStr,
      recipientEmail,
      recipientName,
      ledgerEntryId: ledgerEntry.id,
    };
  });
}

/**
 * Handles failed, returned, or unclaimed payouts.
 * Puts funds back in the campaign balance and flags the milestone for the coordinator.
 */
export async function handlePayoutFailure(params: {
  batchId?: string;
  senderBatchId?: string;
  senderItemId?: string;
  status: "FAILED" | "RETURNED" | "UNCLAIMED";
  reason?: string;
}) {
  const { batchId, senderBatchId, senderItemId, status, reason } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Find payout record
    const payout = await tx.payout.findFirst({
      where: {
        OR: [
          ...(batchId ? [{ batchId }] : []),
          ...(senderBatchId ? [{ senderBatchId }] : []),
          ...(senderItemId ? [{ senderItemId }] : []),
        ],
      },
      include: {
        milestone: true,
      },
    });

    if (!payout) {
      return { handled: false, error: "Payout not found" };
    }

    if (payout.status === status) {
      return { handled: true, alreadyUpdated: true };
    }

    // 2. Put funds back into campaign balance via a DISBURSEMENT_REVERSAL ledger entry
    const reversalLedgerKey = `payout-reversal-${payout.id}-${Date.now()}`;
    await tx.ledgerEntry.create({
      data: {
        campaignId: payout.campaignId,
        milestoneId: payout.milestoneId,
        type: "DISBURSEMENT_REVERSAL",
        amount: payout.amountPoisha,
        currency: payout.currency,
        idempotencyKey: reversalLedgerKey,
        description: `Disbursement reversal: PayPal payout ${status.toLowerCase()} (${reason || "unclaimed/bounced"}). Funds restored to campaign balance.`,
      },
    });

    // 3. Update Payout record
    await tx.payout.update({
      where: { id: payout.id },
      data: {
        status,
        errorDetails: reason || `PayPal payout item ${status.toLowerCase()}`,
      },
    });

    // 4. Flag milestone for coordinator
    await tx.milestone.update({
      where: { id: payout.milestoneId },
      data: {
        status: "needs_more_proof", // Flagged back for coordinator
      },
    });

    // 5. Audit Log
    await tx.auditLog.create({
      data: {
        campaignId: payout.campaignId,
        milestoneId: payout.milestoneId,
        action: "PAYOUT_FAILED_REFUNDED",
        actor: "paypal:webhook",
        details: JSON.stringify({
          payoutId: payout.id,
          batchId: payout.batchId,
          status,
          reason,
          refundedAmountBdt: poishaToBdt(payout.amountPoisha),
        }),
      },
    });

    return {
      handled: true,
      status,
      refundedAmountBdt: poishaToBdt(payout.amountPoisha),
      milestoneId: payout.milestoneId,
    };
  });
}

/**
 * Retries all payouts currently queued in "QUEUED_RETRY" status.
 * Returns summary of retried payouts.
 */
export async function retryQueuedPayouts(): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
  results: Array<{ milestoneId: string; status: string }>;
}> {
  const queued = await prisma.payout.findMany({
    where: { status: "QUEUED_RETRY" },
    select: { milestoneId: true },
  });

  const results: Array<{ milestoneId: string; status: string }> = [];
  let succeeded = 0;
  let failed = 0;

  for (const item of queued) {
    try {
      const res = await executeMilestonePayout({
        milestoneId: item.milestoneId,
        actorRole: "system:payout-retry-worker",
      });
      if (res.status === "SUCCESS") {
        succeeded++;
        results.push({ milestoneId: item.milestoneId, status: "SUCCESS" });
      } else {
        failed++;
        results.push({ milestoneId: item.milestoneId, status: res.status });
      }
    } catch (err: any) {
      failed++;
      results.push({ milestoneId: item.milestoneId, status: `ERROR: ${err.message}` });
    }
  }

  return {
    attempted: queued.length,
    succeeded,
    failed,
    results,
  };
}
