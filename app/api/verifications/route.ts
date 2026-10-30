import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyMilestoneProof, ProofImageInput, ExifSummaryItem } from "@/lib/ai";
import { executeMilestonePayout } from "@/lib/paypal/payouts";
import { optimizeImageForAi, isImageBlurry } from "@/lib/forensics";
import { verifyCsrfOrigin } from "@/lib/csrf";

const verificationRequestSchema = z.object({
  milestoneId: z.string().min(1, "milestoneId is required"),
  provider: z.enum(["mock", "gemini", "anthropic", "openai"]).optional(),
  volunteerNote: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. CSRF Protection
    const csrfCheck = verifyCsrfOrigin(req);
    if (!csrfCheck.valid) {
      return NextResponse.json({ error: csrfCheck.reason || "CSRF check failed" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = verificationRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { milestoneId, provider, volunteerNote } = parsed.data;

    // 1. Fetch milestone with campaign and media files
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        campaign: true,
        mediaFiles: true,
      },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    if (milestone.mediaFiles.length === 0) {
      return NextResponse.json(
        { error: "No proof images found for this milestone to verify" },
        { status: 400 }
      );
    }

    // 2. Load images from disk as base64 and build EXIF summary
    const images: ProofImageInput[] = [];
    const exifSummary: ExifSummaryItem[] = [];

    for (const media of milestone.mediaFiles) {
      let base64 = "";
      if (media.storagePath) {
        try {
          const cleanPath = media.storagePath.startsWith("/")
            ? media.storagePath.slice(1)
            : media.storagePath;
          const rawUploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
          const customUploadPath = path.resolve(rawUploadDir, path.basename(cleanPath));
          const defaultPublicPath = path.join(process.cwd(), "public", cleanPath);
          const fullPath = (await fs.stat(customUploadPath).catch(() => null)) ? customUploadPath : defaultPublicPath;
          const buffer = await fs.readFile(fullPath);
          const blurInfo = await isImageBlurry(buffer);
          // Optimize very large images with sharp before sending to AI verifier to conserve tokens
          const { buffer: optimizedBuffer } = await optimizeImageForAi(buffer, 1568);
          base64 = optimizedBuffer.toString("base64");

          images.push({
            filename: media.filename,
            mimeType: media.mimeType || "image/jpeg",
            base64,
            sha256: media.sha256Hash,
            perceptualHash: media.perceptualHash || undefined,
            isBlurry: blurInfo.isBlurry,
            blurScore: blurInfo.blurScore,
          });
          continue;
        } catch (err) {
          console.warn(`Could not read file at storage path: ${media.storagePath}`);
        }
      }

      images.push({
        filename: media.filename,
        mimeType: media.mimeType || "image/jpeg",
        base64,
        sha256: media.sha256Hash,
        perceptualHash: media.perceptualHash || undefined,
      });

      exifSummary.push({
        filename: media.filename,
        captureDate: media.captureDate ? media.captureDate.toISOString() : null,
        cameraModel: media.cameraModel || null,
        hasGps: media.hasGps,
        latitude: media.latitude || null,
        longitude: media.longitude || null,
        software: media.software || null,
      });
    }

    // Parse checklist items
    let checklistItems: string[] = [];
    try {
      checklistItems = JSON.parse(milestone.proofChecklist);
    } catch {
      checklistItems = [milestone.proofChecklist];
    }

    // 3. Execute verifier
    const verificationResult = await verifyMilestoneProof(
      {
        milestoneTitle: milestone.title,
        expectedAmount: milestone.targetAmount,
        currency: milestone.campaign.currency || "BDT",
        proofChecklist: checklistItems,
        images,
        exifSummary,
        volunteerNote: volunteerNote || milestone.mediaFiles[0]?.caption || null,
        campaignStartDate: milestone.campaign.createdAt,
      },
      {
        provider,
        currentMilestoneId: milestone.id,
      }
    );

    // Normalize receipt total to poisha
    const receiptTotalPoisha =
      verificationResult.receiptTotal !== null && !isNaN(verificationResult.receiptTotal)
        ? verificationResult.receiptTotal > 100000
          ? Math.round(verificationResult.receiptTotal)
          : Math.round(verificationResult.receiptTotal * 100)
        : null;

    // 4. Determine new milestone status
    let newStatus = milestone.status;
    if (verificationResult.verdict === "approved") {
      newStatus = "VERIFIED";
    } else if (verificationResult.verdict === "needs_more_proof") {
      newStatus = "needs_more_proof";
    } else if (verificationResult.verdict === "rejected") {
      newStatus = "rejected";
    }

    // 5. Save Verification row and update Milestone in transaction
    const { verification, updatedMilestone } = await prisma.$transaction(async (tx) => {
      const v = await tx.verification.create({
        data: {
          milestoneId: milestone.id,
          provider: verificationResult.provider || "mock",
          verdict: verificationResult.verdict,
          confidence: verificationResult.confidence,
          receiptTotal: receiptTotalPoisha,
          receiptCurrency: verificationResult.receiptCurrency,
          receiptDate: verificationResult.receiptDate,
          checklist: JSON.stringify(verificationResult.checklist),
          redFlags: JSON.stringify(verificationResult.redFlags),
          humanSummary: verificationResult.humanSummary,
          needsHumanReview: verificationResult.needsHumanReview,
          isDemoMode: verificationResult.isDemoMode,
          rawModelOutput: verificationResult.rawModelOutput || null,
        },
      });

      const m = await tx.milestone.update({
        where: { id: milestone.id },
        data: {
          status: newStatus,
          verifiedAt: verificationResult.verdict === "approved" ? new Date() : milestone.verifiedAt,
        },
      });

      await tx.auditLog.create({
        data: {
          campaignId: milestone.campaignId,
          milestoneId: milestone.id,
          action: "MILESTONE_VERIFIED",
          actor: `verifier:${verificationResult.provider || "mock"}`,
          details: JSON.stringify({
            verificationId: v.id,
            verdict: verificationResult.verdict,
            confidence: verificationResult.confidence,
            needsHumanReview: verificationResult.needsHumanReview,
            isDemoMode: verificationResult.isDemoMode,
          }),
        },
      });

      return { verification: v, updatedMilestone: m };
    });

    // 6. Automatic flow: when a verification becomes approved and needs no human review,
    // trigger the payout automatically if balance allows
    let payoutResult = null;
    let finalStatus = updatedMilestone.status;

    if (verificationResult.verdict === "approved" && !verificationResult.needsHumanReview) {
      try {
        payoutResult = await executeMilestonePayout({
          milestoneId: milestone.id,
          actorRole: "system:automated-verification-payout",
        });
        finalStatus = "RELEASED";
      } catch (payoutErr: any) {
        console.warn("Automatic payout deferred:", payoutErr.message);
      }
    }

    return NextResponse.json(
      {
        success: true,
        verification: {
          ...verification,
          checklist: verificationResult.checklist,
          redFlags: verificationResult.redFlags,
        },
        milestoneStatus: finalStatus,
        payout: payoutResult,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Verification endpoint error:", err?.message || err);
    return NextResponse.json(
      { error: "Verification process failed. Please try again later." },
      { status: 500 }
    );
  }
}

