import { VerificationInput, VerificationResult } from "./types";
import { poishaToBdt, bdtToPoisha } from "../config";
import { prisma } from "../db";
import { hammingDistance } from "../forensics";

export interface PreCheckResult {
  isRejected: boolean;
  rejectionResult?: VerificationResult;
  additionalRedFlags: string[];
}

/**
 * Runs deterministic pre-checks BEFORE calling the AI model.
 * 1. Checks for duplicate SHA-256 or perceptual dHash collisions in existing milestones.
 * 2. Validates image EXIF capture timestamp against campaign creation date.
 */
export async function runPreChecks(
  input: VerificationInput,
  currentMilestoneId?: string
): Promise<PreCheckResult> {
  const additionalRedFlags: string[] = [];

  // 1. Check duplicate hashes against existing media in database
  if (input.images.length > 0) {
    // Check image blurriness
    for (const img of input.images) {
      if (img.isBlurry) {
        additionalRedFlags.push(
          `Image "${img.filename}" appears degraded or blurry (sharpness score: ${img.blurScore ?? "low"}), obscuring fine voucher text.`
        );
      }
    }

    for (const img of input.images) {
      if (!img.sha256) continue;

      // Query database for matching SHA-256 from other milestones
      const exactMatch = await prisma.mediaFile.findFirst({
        where: {
          sha256Hash: img.sha256,
          ...(currentMilestoneId ? { milestoneId: { not: currentMilestoneId } } : {}),
        },
        include: { milestone: true },
      });

      if (exactMatch) {
        return {
          isRejected: true,
          rejectionResult: {
            verdict: "rejected",
            confidence: 1.0,
            receiptTotal: null,
            receiptCurrency: null,
            receiptDate: null,
            checklist: input.proofChecklist.map((item) => ({
              item,
              satisfied: false,
              evidence: `Rejected: duplicate of file in milestone "${exactMatch.milestone?.title || "existing record"}"`,
            })),
            redFlags: [
              `Duplicate file hash detected (SHA-256: ${img.sha256.slice(0, 12)}...) previously used in another milestone.`,
            ],
            humanSummary:
              "This milestone submission was rejected because one or more submitted images are identical to evidence uploaded for another relief milestone. Community aid milestones require unique, original field documentation.",
            needsHumanReview: false,
            isDemoMode: false,
          },
          additionalRedFlags,
        };
      }

      // Check perceptual hash Hamming distance
      if (img.perceptualHash) {
        const candidates = await prisma.mediaFile.findMany({
          where: {
            perceptualHash: { not: null },
            ...(currentMilestoneId ? { milestoneId: { not: currentMilestoneId } } : {}),
          },
          select: { id: true, perceptualHash: true, filename: true },
          take: 50,
        });

        for (const candidate of candidates) {
          if (candidate.perceptualHash) {
            const dist = hammingDistance(img.perceptualHash, candidate.perceptualHash);
            if (dist <= 5) {
              return {
                isRejected: true,
                rejectionResult: {
                  verdict: "rejected",
                  confidence: 1.0,
                  receiptTotal: null,
                  receiptCurrency: null,
                  receiptDate: null,
                  checklist: input.proofChecklist.map((item) => ({
                    item,
                    satisfied: false,
                    evidence: `Rejected: near-identical perceptual image hash matches existing evidence (${candidate.filename})`,
                  })),
                  redFlags: [
                    `Near-identical image detected (dHash distance: ${dist} bits) matching previously submitted evidence.`,
                  ],
                  humanSummary:
                    "This evidence submission was rejected because an image was found to be a re-compressed or visually identical duplicate of an image submitted for a previous milestone.",
                  needsHumanReview: false,
                  isDemoMode: false,
                },
                additionalRedFlags,
              };
            }
          }
        }
      }
    }
  }

  // 2. Validate EXIF capture time against campaign start date
  if (input.campaignStartDate) {
    const campaignStartTime = new Date(input.campaignStartDate).getTime();

    for (const exif of input.exifSummary) {
      if (exif.captureDate) {
        const captureTime = new Date(exif.captureDate).getTime();
        // Allow up to 12 hours buffer for clock timezone drift
        if (!isNaN(captureTime) && captureTime < campaignStartTime - 12 * 3600 * 1000) {
          additionalRedFlags.push(
            `EXIF capture timestamp (${exif.captureDate}) on "${exif.filename}" predates campaign creation date.`
          );
        }
      }
    }
  }

  return {
    isRejected: false,
    additionalRedFlags,
  };
}

/**
 * Runs deterministic post-checks AFTER the AI model returns its raw verdict.
 * Enforces:
 * 1. 10% amount variance rule: receipt total must be within 10% of expected amount or cannot be "approved".
 * 2. Confidence threshold: if confidence < 0.75, needsHumanReview = true and verdict becomes "needs_more_proof".
 * 3. Incorporates any pre-check red flags.
 * 4. Critical red flags block approval.
 */
export function applyDeterministicPostChecks(
  rawResult: VerificationResult,
  input: VerificationInput,
  preCheckRedFlags: string[] = []
): VerificationResult {
  const result: VerificationResult = {
    ...rawResult,
    redFlags: [...new Set([...rawResult.redFlags, ...preCheckRedFlags])],
  };

  const expectedBdt = poishaToBdt(input.expectedAmount);

  // Normalize receiptTotal to BDT for comparison
  let receiptBdt: number | null = null;
  if (typeof result.receiptTotal === "number" && !isNaN(result.receiptTotal)) {
    // If the model returned an integer that looks like poisha (e.g. >= 100x expected BDT)
    if (result.receiptTotal > expectedBdt * 50) {
      receiptBdt = poishaToBdt(result.receiptTotal);
    } else {
      receiptBdt = result.receiptTotal;
    }
  }

  // 1. Amount Mismatch Rule (Within 10%)
  if (receiptBdt !== null && expectedBdt > 0) {
    const variance = Math.abs(receiptBdt - expectedBdt) / expectedBdt;
    if (variance > 0.10) {
      const percentageDiff = (variance * 100).toFixed(1);
      result.redFlags.push(
        `Receipt total (${receiptBdt.toLocaleString()} BDT) deviates by ${percentageDiff}% from the milestone budget (${expectedBdt.toLocaleString()} BDT), exceeding the allowable 10% threshold.`
      );
      result.needsHumanReview = true;

      // Cannot be "approved" if amount deviates by > 10%
      if (result.verdict === "approved") {
        result.verdict = "needs_more_proof";
        result.humanSummary = `${result.humanSummary} Note: The receipt total of ${receiptBdt.toLocaleString()} BDT differs from the milestone target of ${expectedBdt.toLocaleString()} BDT by more than 10%, requiring coordinator review before disbursement.`;
      }
    }
  } else if (result.receiptTotal === null && result.verdict === "approved") {
    // Cannot approve if receipt total is missing
    result.verdict = "needs_more_proof";
    result.needsHumanReview = true;
    result.redFlags.push("Receipt total could not be determined from the submitted photos.");
  }

  // 2. Low Confidence Rule (< 0.75)
  if (result.confidence < 0.75) {
    result.needsHumanReview = true;
    if (result.verdict === "approved") {
      result.verdict = "needs_more_proof";
      result.humanSummary = `${result.humanSummary} The verification confidence (${(result.confidence * 100).toFixed(0)}%) is below the automated approval threshold of 75%, so this milestone has been flagged for human coordinator review.`;
    }
  }

  // 3. Critical Red Flags Guard
  if (result.redFlags.length > 0 && result.verdict === "approved") {
    result.verdict = "needs_more_proof";
    result.needsHumanReview = true;
  }

  return result;
}

