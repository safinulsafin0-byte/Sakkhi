import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPayPalWebhookSignature } from "@/lib/paypal/client";
import { handlePayoutFailure } from "@/lib/paypal/payouts";

const webhookEventSchema = z.object({
  id: z.string().optional(),
  event_type: z.string().min(1, "event_type is required"),
  resource: z.record(z.any()).optional().default({}),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let json: unknown;

    try {
      json = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsedEvent = webhookEventSchema.safeParse(json);
    if (!parsedEvent.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedEvent.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const event = parsedEvent.data;
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    // Verify webhook signature if PAYPAL_WEBHOOK_ID is configured or in production
    if (webhookId) {
      const authAlgo = req.headers.get("paypal-auth-algo") || "";
      const certUrl = req.headers.get("paypal-cert-url") || "";
      const transmissionId = req.headers.get("paypal-transmission-id") || "";
      const transmissionSig = req.headers.get("paypal-transmission-sig") || "";
      const transmissionTime = req.headers.get("paypal-transmission-time") || "";

      if (!authAlgo || !certUrl || !transmissionId || !transmissionSig) {
        return NextResponse.json(
          { error: "Missing required PayPal signature headers" },
          { status: 401 }
        );
      }

      const isValid = await verifyPayPalWebhookSignature({
        webhookId,
        webhookEvent: event,
        headers: {
          authAlgo,
          certUrl,
          transmissionId,
          transmissionSig,
          transmissionTime,
        },
      });

      if (!isValid) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Webhook verification failed: PAYPAL_WEBHOOK_ID not configured in production" },
        { status: 500 }
      );
    }

    const eventType = event.event_type;
    const resource = event.resource || {};

    // 1. PAYMENT.CAPTURE.COMPLETED
    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const captureId = resource.id;
      const orderId =
        resource.supplementary_data?.related_ids?.order_id || resource.custom_id;

      if (orderId) {
        const donation = await prisma.donation.findFirst({
          where: {
            OR: [{ paypalOrderId: orderId }, { idempotencyKey: `ord-${orderId}` }],
          },
        });

        if (donation && donation.status === "PENDING") {
          const idempotencyKey = `cap-${captureId || orderId}`;

          await prisma.$transaction(async (tx) => {
            await tx.donation.update({
              where: { id: donation.id },
              data: { status: "COMPLETED" },
            });

            const existingLedger = await tx.ledgerEntry.findUnique({
              where: { idempotencyKey },
            });

            if (!existingLedger) {
              await tx.ledgerEntry.create({
                data: {
                  campaignId: donation.campaignId,
                  donationId: donation.id,
                  type: "CREDIT_DONATION",
                  amount: donation.amount,
                  currency: "BDT",
                  idempotencyKey,
                  description: `Webhook: Donation confirmed from ${donation.donorName}`,
                },
              });
            }

            await tx.auditLog.create({
              data: {
                campaignId: donation.campaignId,
                donationId: donation.id,
                actor: "PayPal Webhook",
                action: "PAYMENT_CAPTURE_COMPLETED",
                details: JSON.stringify({
                  captureId,
                  orderId,
                  amountUsd: resource.amount?.value,
                }),
              },
            });
          });
        }
      }
    }

    // 2. PAYMENT.CAPTURE.REFUNDED
    if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
      const refundId = resource.id;
      const refundedAmountUsd = parseFloat(resource.amount?.value || "0");
      // Fixed rate conversion: 1 USD = 120 BDT = 12000 poisha
      const refundedPoisha = Math.round(refundedAmountUsd * 120 * 100);
      const idempotencyKey = `ref-${refundId}`;

      // Find donation from related captures
      const captureId =
        resource.links?.find((l: any) => l.rel === "up")?.href?.split("/").pop() ||
        resource.parent_payment;

      const existingLedger = await prisma.ledgerEntry.findFirst({
        where: {
          OR: [
            { idempotencyKey: `cap-${captureId}` },
            { description: { contains: captureId } },
          ],
        },
        include: { donation: true },
      });

      if (existingLedger?.donationId) {
        const donation = existingLedger.donation;

        await prisma.$transaction(async (tx) => {
          const alreadyProcessed = await tx.ledgerEntry.findUnique({
            where: { idempotencyKey },
          });

          if (!alreadyProcessed) {
            await tx.ledgerEntry.create({
              data: {
                campaignId: existingLedger.campaignId,
                donationId: existingLedger.donationId,
                type: "REFUND",
                amount: refundedPoisha || donation?.amount || 0,
                currency: "BDT",
                idempotencyKey,
                description: `Webhook: PayPal Refund #${refundId}`,
              },
            });

            if (donation) {
              await tx.donation.update({
                where: { id: donation.id },
                data: { status: "REFUNDED" },
              });
            }

            await tx.auditLog.create({
              data: {
                campaignId: existingLedger.campaignId,
                donationId: existingLedger.donationId,
                actor: "PayPal Webhook",
                action: "PAYMENT_CAPTURE_REFUNDED",
                details: JSON.stringify({
                  refundId,
                  captureId,
                  refundedAmountUsd,
                }),
              },
            });
          }
        });
      }
    }

    // 3. PAYMENT.PAYOUTS-ITEM.SUCCEEDED
    if (
      eventType === "PAYMENT.PAYOUTS-ITEM.SUCCEEDED" ||
      eventType === "PAYMENT.PAYOUTSBATCH.SUCCESS"
    ) {
      const payoutBatchId = resource.payout_batch_id || resource.batch_header?.payout_batch_id;
      const payoutItemId = resource.payout_item_id;
      const senderItemId = resource.payout_item?.sender_item_id;

      if (payoutBatchId || payoutItemId || senderItemId) {
        await prisma.payout.updateMany({
          where: {
            OR: [
              ...(payoutBatchId ? [{ batchId: payoutBatchId }] : []),
              ...(senderItemId ? [{ senderItemId }] : []),
            ],
          },
          data: {
            status: "SUCCESS",
            payoutItemId: payoutItemId || undefined,
          },
        });
      }
    }

    // 4. PAYMENT.PAYOUTS-ITEM.FAILED, RETURNED, or UNCLAIMED
    if (
      eventType === "PAYMENT.PAYOUTS-ITEM.FAILED" ||
      eventType === "PAYMENT.PAYOUTS-ITEM.RETURNED" ||
      eventType === "PAYMENT.PAYOUTS-ITEM.UNCLAIMED" ||
      eventType === "PAYMENT.PAYOUTSBATCH.DENIED"
    ) {
      const payoutBatchId = resource.payout_batch_id || resource.batch_header?.payout_batch_id;
      const payoutItemId = resource.payout_item_id;
      const senderItemId = resource.payout_item?.sender_item_id;
      const reason =
        resource.errors?.message ||
        resource.payout_item?.errors?.message ||
        `PayPal webhook reported event ${eventType}`;

      let failureStatus: "FAILED" | "RETURNED" | "UNCLAIMED" = "FAILED";
      if (eventType.includes("RETURNED")) failureStatus = "RETURNED";
      else if (eventType.includes("UNCLAIMED")) failureStatus = "UNCLAIMED";

      await handlePayoutFailure({
        batchId: payoutBatchId,
        senderItemId,
        status: failureStatus,
        reason,
      });
    }

    return NextResponse.json({ received: true, event: eventType }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Webhook processing error", message: error.message },
      { status: 500 }
    );
  }
}

