import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { capturePayPalOrder, PayPalApiError, PayPalAuthError } from "@/lib/paypal/client";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { verifyCsrfOrigin } from "@/lib/csrf";

const captureOrderSchema = z.object({
  orderId: z.string().min(1, "orderId is required"),
});

export async function POST(req: NextRequest) {
  try {
    // 1. CSRF Protection
    const csrfCheck = verifyCsrfOrigin(req);
    if (!csrfCheck.valid) {
      return NextResponse.json({ error: csrfCheck.reason || "CSRF check failed" }, { status: 403 });
    }

    // 2. Rate Limiting (30 captures per minute per IP)
    const clientIp = getClientIp(req.headers);
    const rateLimit = checkRateLimit(`donation_capture_${clientIp}`, {
      windowMs: 60 * 1000,
      maxRequests: 30,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many capture attempts. Please wait a moment before trying again.",
          retryAfterSeconds: rateLimit.reset - Math.ceil(Date.now() / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, rateLimit.reset - Math.ceil(Date.now() / 1000))),
          },
        }
      );
    }

    const json = await req.json();
    const parsed = captureOrderSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { orderId } = parsed.data;

    // 1. Locate existing donation record
    const donation = await prisma.donation.findFirst({
      where: { paypalOrderId: orderId },
      include: {
        campaign: { select: { id: true, title: true, currency: true } },
        ledgerEntries: true,
      },
    });

    if (!donation) {
      return NextResponse.json(
        { error: `No donation record found for PayPal order "${orderId}"` },
        { status: 404 }
      );
    }

    // Idempotent return if already completed
    if (donation.status === "COMPLETED") {
      return NextResponse.json({
        success: true,
        isDuplicate: true,
        donationId: donation.id,
        paypalOrderId: orderId,
        donorName: donation.donorName,
        amountBdt: donation.amount / 100,
        amountUsd: donation.amountUsdCents ? (donation.amountUsdCents / 100).toFixed(2) : "0.00",
        campaignTitle: donation.campaign.title,
        receiptCode: `SKH-${orderId.slice(-8).toUpperCase()}`,
        status: "COMPLETED",
      });
    }

    const requestId = `cap-req-${nanoid(16)}`;

    // 2. Execute server-side capture against PayPal Sandbox
    const captureResult = await capturePayPalOrder(orderId, requestId);

    if (captureResult.status !== "COMPLETED") {
      return NextResponse.json(
        {
          error: `PayPal order capture not completed. Order status: ${captureResult.status}`,
        },
        { status: 400 }
      );
    }

    // 3. Extract and verify captured payment details
    const purchaseUnit = captureResult.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];

    if (!capture || capture.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Payment capture record missing or not completed by PayPal" },
        { status: 400 }
      );
    }

    const capturedCurrency = capture.amount.currency_code;
    const capturedCents = Math.round(parseFloat(capture.amount.value) * 100);

    // Verify captured currency matches USD
    if (capturedCurrency !== "USD") {
      return NextResponse.json(
        {
          error: `Currency mismatch: Expected USD, received ${capturedCurrency}`,
        },
        { status: 400 }
      );
    }

    // Verify captured amount matches our stored expected amount
    if (donation.amountUsdCents !== null && capturedCents !== donation.amountUsdCents) {
      return NextResponse.json(
        {
          error: `Amount mismatch: Expected ${donation.amountUsdCents} USD cents, but captured ${capturedCents} USD cents`,
        },
        { status: 400 }
      );
    }

    const idempotencyKey = `cap-${capture.id}`;

    // 4. Update Donation & Double-Entry Ledger inside an atomic transaction
    const receiptSummary = await prisma.$transaction(async (tx) => {
      // Mark donation completed
      const updatedDonation = await tx.donation.update({
        where: { id: donation.id },
        data: {
          status: "COMPLETED",
        },
      });

      // Write Ledger Credit Entry
      await tx.ledgerEntry.create({
        data: {
          campaignId: donation.campaignId,
          donationId: donation.id,
          type: "CREDIT_DONATION",
          amount: donation.amount, // stored in poisha
          currency: "BDT",
          idempotencyKey,
          description: `Donation from ${donation.donorName} (৳${(
            donation.amount / 100
          ).toLocaleString()} BDT via PayPal Sandbox)`,
        },
      });

      // Record Audit Log Entry
      await tx.auditLog.create({
        data: {
          campaignId: donation.campaignId,
          donationId: donation.id,
          actor: donation.donorName,
          action: "DONATION_CAPTURED",
          details: JSON.stringify({
            paypalOrderId: orderId,
            captureId: capture.id,
            amountUsd: capture.amount.value,
            amountPoisha: donation.amount,
            payerEmail: captureResult.payer?.email_address,
            payerId: captureResult.payer?.payer_id,
          }),
        },
      });

      return {
        success: true,
        donationId: updatedDonation.id,
        paypalOrderId: orderId,
        captureId: capture.id,
        donorName: updatedDonation.donorName,
        amountBdt: updatedDonation.amount / 100,
        amountUsd: (capturedCents / 100).toFixed(2),
        campaignTitle: donation.campaign.title,
        receiptCode: `SKH-${orderId.slice(-8).toUpperCase()}`,
        status: "COMPLETED",
      };
    });

    return NextResponse.json(receiptSummary, { status: 200 });
  } catch (error: any) {
    if (error instanceof PayPalAuthError) {
      return NextResponse.json(
        { error: "PayPal authentication error. Check credentials in .env.local." },
        { status: 503 }
      );
    }

    if (error instanceof PayPalApiError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred while capturing PayPal order" },
      { status: 500 }
    );
  }
}

