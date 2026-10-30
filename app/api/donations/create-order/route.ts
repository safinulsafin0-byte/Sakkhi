import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { bdtToPoisha, usdCentsToPoisha, poishaToUsdCents } from "@/lib/config";
import { createPayPalOrder, PayPalApiError, PayPalAuthError } from "@/lib/paypal/client";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { verifyCsrfOrigin } from "@/lib/csrf";

const createOrderSchema = z.object({
  campaignId: z.string().min(1, "campaignId is required"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.enum(["BDT", "USD"]).default("BDT"),
  donorName: z.string().trim().max(100).optional(),
  donorEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  message: z.string().max(500).optional(),
  giveAnonymously: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    // 1. CSRF Protection
    const csrfCheck = verifyCsrfOrigin(req);
    if (!csrfCheck.valid) {
      return NextResponse.json({ error: csrfCheck.reason || "CSRF check failed" }, { status: 403 });
    }

    // 2. Rate Limiting (20 donation order attempts per minute per IP)
    const clientIp = getClientIp(req.headers);
    const rateLimit = checkRateLimit(`donation_create_${clientIp}`, {
      windowMs: 60 * 1000,
      maxRequests: 20,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many donation requests. Please wait a moment before trying again.",
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
    const parsed = createOrderSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { campaignId, amount, currency, donorName, donorEmail, message, giveAnonymously } =
      parsed.data;

    // Verify campaign exists and is active
    const campaign = await prisma.campaign.findFirst({
      where: {
        OR: [{ id: campaignId }, { slug: campaignId }],
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Convert to poisha (BDT integer) and USD cents
    let amountPoisha: number;
    let amountUsdCents: number;

    if (currency === "BDT") {
      amountPoisha = bdtToPoisha(amount);
      amountUsdCents = poishaToUsdCents(amountPoisha);
    } else {
      amountUsdCents = Math.round(amount * 100);
      amountPoisha = usdCentsToPoisha(amountUsdCents);
    }

    if (amountUsdCents < 1) {
      return NextResponse.json(
        { error: "Contribution amount must convert to at least $0.01 USD" },
        { status: 400 }
      );
    }

    const effectiveDonorName = giveAnonymously
      ? "Anonymous Neighbor"
      : donorName && donorName.trim().length > 0
      ? donorName.trim()
      : "Kind Neighbor";

    const requestId = `req-${nanoid(16)}`;

    // Create order with PayPal Sandbox REST API
    const paypalOrder = await createPayPalOrder({
      amountUsdCents,
      currency: "USD",
      description: `Sakkhi Contribution: ${campaign.title}`.slice(0, 127),
      customId: campaign.id,
      requestId,
    });

    // Store pending Donation record in SQLite database
    const donation = await prisma.donation.create({
      data: {
        campaignId: campaign.id,
        donorName: effectiveDonorName,
        donorEmail: donorEmail || null,
        amount: amountPoisha,
        currency: "BDT",
        amountUsdCents,
        status: "PENDING",
        idempotencyKey: `ord-${paypalOrder.id}`,
        paypalOrderId: paypalOrder.id,
      },
    });

    // Log pending audit trail
    await prisma.auditLog.create({
      data: {
        campaignId: campaign.id,
        donationId: donation.id,
        actor: effectiveDonorName,
        action: "DONATION_ORDER_CREATED",
        details: JSON.stringify({
          paypalOrderId: paypalOrder.id,
          amountPoisha,
          amountUsdCents,
          message: message || undefined,
          giveAnonymously,
        }),
      },
    });

    return NextResponse.json(
      {
        orderId: paypalOrder.id,
        donationId: donation.id,
        amountBdt: amountPoisha / 100,
        amountUsd: (amountUsdCents / 100).toFixed(2),
        campaignTitle: campaign.title,
      },
      { status: 201 }
    );
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
      { error: "An unexpected error occurred while creating PayPal order" },
      { status: 500 }
    );
  }
}

