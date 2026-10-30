import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import { executeMilestonePayout } from "@/lib/paypal/payouts";
import { verifyCsrfOrigin } from "@/lib/csrf";

const overrideSchema = z.object({
  verificationId: z.string().min(1, "verificationId is required"),
  action: z.enum(["approve", "reject"]),
  reason: z.string().min(5, "A reason of at least 5 characters is required for coordinator override"),
});

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = verifyCsrfOrigin(req);
    if (!csrfCheck.valid) {
      return NextResponse.json({ error: csrfCheck.reason || "CSRF check failed" }, { status: 403 });
    }

    // 1. Verify admin session cookie
    const cookieStore = cookies();
    const adminToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

    if (!adminToken || !(await verifyAdminSessionToken(adminToken))) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in as coordinator." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = overrideSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", issues: parsed.error.format() },
        { status: 400 }
      );
    }

    const { verificationId, action, reason } = parsed.data;

    // 2. Fetch verification record with milestone
    const verification = await prisma.verification.findUnique({
      where: { id: verificationId },
      include: {
        milestone: {
          include: { campaign: true },
        },
      },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Verification record not found" },
        { status: 404 }
      );
    }

    const newMilestoneStatus = action === "approve" ? "VERIFIED" : "rejected";

    // 3. Update Verification, Milestone, and write AuditLog in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedVerification = await tx.verification.update({
        where: { id: verificationId },
        data: {
          overriddenBy: "coordinator",
          overrideReason: reason,
          overrideVerdict: action === "approve" ? "approved" : "rejected",
          needsHumanReview: false, // review completed
        },
      });

      const updatedMilestone = await tx.milestone.update({
        where: { id: verification.milestoneId },
        data: {
          status: newMilestoneStatus,
          verifiedAt: action === "approve" ? new Date() : verification.milestone.verifiedAt,
        },
      });

      await tx.auditLog.create({
        data: {
          campaignId: verification.milestone.campaignId,
          milestoneId: verification.milestoneId,
          action: "COORDINATOR_VERIFICATION_OVERRIDE",
          actor: "coordinator",
          details: JSON.stringify({
            verificationId,
            action,
            reason,
            previousVerdict: verification.verdict,
            newStatus: newMilestoneStatus,
          }),
        },
      });

      return { updatedVerification, updatedMilestone };
    });

    let payoutResult = null;
    let finalStatus = result.updatedMilestone.status;

    if (action === "approve") {
      try {
        payoutResult = await executeMilestonePayout({
          milestoneId: verification.milestoneId,
          actorId: "coordinator",
          actorRole: "coordinator",
          coordinatorOverrideReason: reason,
        });
        finalStatus = "RELEASED";
      } catch (payoutErr: any) {
        console.warn("Override payout notice:", payoutErr.message);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Milestone proof ${action}d by coordinator`,
        verification: result.updatedVerification,
        milestone: {
          ...result.updatedMilestone,
          status: finalStatus,
        },
        payout: payoutResult,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Coordinator override error:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to override verification. Please try again." },
      { status: 500 }
    );
  }
}

