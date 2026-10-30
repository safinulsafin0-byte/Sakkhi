import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import {
  computeSha256,
  computePerceptualHash,
  hammingDistance,
  inspectMedia,
  sniffImageMimeType,
} from "@/lib/forensics";
import { verifyVolunteerToken } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { verifyCsrfOrigin } from "@/lib/csrf";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_FILES = 6;

const proofFormSchema = z.object({
  milestoneId: z.string().min(1, "milestoneId is required"),
  notes: z.string().max(1000).optional().default(""),
  token: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. CSRF Protection
    const csrfCheck = verifyCsrfOrigin(req);
    if (!csrfCheck.valid) {
      return NextResponse.json({ error: csrfCheck.reason || "CSRF check failed" }, { status: 403 });
    }

    // 2. Rate Limiting (10 uploads per 10 minutes per IP)
    const clientIp = getClientIp(req.headers);
    const rateLimit = checkRateLimit(`proof_upload_${clientIp}`, {
      windowMs: 10 * 60 * 1000,
      maxRequests: 10,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before submitting more evidence.",
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

    // 3. Form Data Extraction & Zod Validation
    const formData = await req.formData();
    const rawMilestoneId = formData.get("milestoneId");
    const rawNotes = formData.get("notes");
    const rawToken = formData.get("token");
    const files = formData.getAll("files") as File[];

    const parsedForm = proofFormSchema.safeParse({
      milestoneId: typeof rawMilestoneId === "string" ? rawMilestoneId : undefined,
      notes: typeof rawNotes === "string" ? rawNotes : "",
      token: typeof rawToken === "string" ? rawToken : undefined,
    });

    if (!parsedForm.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedForm.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { milestoneId, notes, token } = parsedForm.data;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "At least one image file is required" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `You can upload at most ${MAX_FILES} photos per submission.` },
        { status: 400 }
      );
    }

    // 4. Verify Milestone Exists
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { campaign: true },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    // Verify volunteer token if provided
    let uploaderId = milestone.assignedVolunteerId;
    let actorName = "Volunteer";

    if (token) {
      const decoded = await verifyVolunteerToken(token);
      if (decoded) {
        uploaderId = decoded.volunteerId;
        actorName = decoded.volunteerName;
      }
    }

    // Read and buffer all files to check size and binary magic bytes
    const fileBuffers: Array<{ file: File; buffer: Buffer; mimeType: "image/jpeg" | "image/png" | "image/webp" }> = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `File "${file.name}" exceeds the maximum allowed size of 8 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
          },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Binary Magic Bytes Sniffing (Never trust client MIME or filename extension alone)
      const sniffedMime = sniffImageMimeType(buffer);
      if (!sniffedMime) {
        return NextResponse.json(
          {
            error: `File "${file.name}" does not have valid image magic bytes. Only genuine JPEG, PNG, and WebP images are permitted.`,
          },
          { status: 400 }
        );
      }

      fileBuffers.push({ file, buffer, mimeType: sniffedMime });
    }

    // Load existing hashes from database across all media files to detect duplicates
    const existingMedia = await prisma.mediaFile.findMany({
      select: {
        id: true,
        filename: true,
        milestoneId: true,
        sha256Hash: true,
        perceptualHash: true,
      },
    });

    // Destination directory on local disk with strict path containment (configurable via UPLOAD_DIR for persistent disks)
    const rawUploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
    const uploadsDir = path.resolve(rawUploadDir);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const processedFiles: Array<{
      filename: string;
      originalName: string;
      storagePath: string;
      mimeType: string;
      sizeBytes: number;
      sha256Hash: string;
      perceptualHash: string;
      hasGps: boolean;
      latitude?: number;
      longitude?: number;
      cameraModel?: string;
      software?: string;
      captureDate?: Date;
      exifData?: string;
      isBlurry?: boolean;
      blurScore?: number;
    }> = [];

    // Process and inspect each file (strip nothing before hashing)
    for (const { file, buffer, mimeType } of fileBuffers) {
      // 1. Compute raw sha256 hash
      const sha256Hash = await computeSha256(buffer);

      // 2. Compute 64-bit dHash perceptual hash
      const perceptualHash = await computePerceptualHash(buffer);

      // 3. Duplicate Detection Check
      for (const existing of existingMedia) {
        const isExactShaMatch = existing.sha256Hash === sha256Hash;
        const isNearPerceptualMatch =
          existing.perceptualHash &&
          hammingDistance(existing.perceptualHash, perceptualHash) <= 5;

        if (isExactShaMatch || isNearPerceptualMatch) {
          // Log AuditLog entry
          await prisma.auditLog.create({
            data: {
              campaignId: milestone.campaignId,
              milestoneId: milestone.id,
              actorId: uploaderId,
              actor: actorName,
              action: "DUPLICATE_PROOF_REJECTED",
              details: JSON.stringify({
                attemptedFilename: file.name,
                sha256Hash,
                perceptualHash,
                matchedMediaId: existing.id,
                matchedMilestoneId: existing.milestoneId,
                matchType: isExactShaMatch ? "EXACT_SHA256" : "NEAR_PERCEPTUAL_DHASH",
              }),
            },
          });

          return NextResponse.json(
            {
              error: `Duplicate photo detected: "${file.name}" has already been submitted as evidence for a relief milestone. Please provide original, unique photographs.`,
              isDuplicate: true,
            },
            { status: 400 }
          );
        }
      }

      // 4. Extract EXIF & metadata via forensics engine
      const forensic = await inspectMedia(buffer);

      // 5. Secure Filename & Strict Path Traversal Prevention
      const safeExt =
        mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg";
      const safeFilename = `proof-${milestoneId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}-${Date.now()}-${nanoid(8)}${safeExt}`;
      const diskPath = path.resolve(uploadsDir, safeFilename);

      // Ensure the target file path stays strictly within uploadsDir
      if (!diskPath.startsWith(uploadsDir)) {
        return NextResponse.json({ error: "Invalid upload path destination" }, { status: 400 });
      }

      fs.writeFileSync(diskPath, buffer);

      processedFiles.push({
        filename: safeFilename,
        originalName: path.basename(file.name),
        storagePath: `/uploads/${safeFilename}`,
        mimeType,
        sizeBytes: buffer.length,
        sha256Hash,
        perceptualHash,
        hasGps: forensic.hasGps,
        latitude: forensic.latitude,
        longitude: forensic.longitude,
        cameraModel: forensic.cameraModel,
        software: forensic.software,
        captureDate: forensic.captureDate,
        exifData: forensic.exif ? JSON.stringify(forensic.exif) : undefined,
        isBlurry: forensic.isBlurry,
        blurScore: forensic.blurScore,
      });
    }

    // Save all MediaFile records and update milestone status in an atomic transaction
    await prisma.$transaction(async (tx) => {
      for (const item of processedFiles) {
        await tx.mediaFile.create({
          data: {
            campaignId: milestone.campaignId,
            milestoneId: milestone.id,
            uploaderId,
            filename: item.filename,
            mimeType: item.mimeType,
            sizeBytes: item.sizeBytes,
            sha256Hash: item.sha256Hash,
            perceptualHash: item.perceptualHash,
            storagePath: item.storagePath,
            caption: notes ? `${item.originalName}: ${notes}` : item.originalName,
            isReceipt:
              item.originalName.toLowerCase().includes("receipt") ||
              item.originalName.toLowerCase().includes("memo") ||
              item.originalName.toLowerCase().includes("bill") ||
              item.originalName.toLowerCase().includes("voucher") ||
              item.originalName.toLowerCase().includes("chalan"),
            hasGps: item.hasGps,
            latitude: item.latitude,
            longitude: item.longitude,
            cameraModel: item.cameraModel,
            software: item.software,
            captureDate: item.captureDate,
            exifData: item.exifData,
          },
        });
      }

      // Update milestone status to proof_submitted
      await tx.milestone.update({
        where: { id: milestone.id },
        data: {
          status: "proof_submitted",
        },
      });

      // Write AuditLog entry
      await tx.auditLog.create({
        data: {
          campaignId: milestone.campaignId,
          milestoneId: milestone.id,
          actorId: uploaderId,
          actor: actorName,
          action: "PROOF_SUBMITTED",
          details: JSON.stringify({
            filesCount: processedFiles.length,
            files: processedFiles.map((f) => ({
              filename: f.filename,
              sizeBytes: f.sizeBytes,
              sha256: f.sha256Hash,
              isBlurry: f.isBlurry,
            })),
            notes,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Thank you. We are checking your proof now.",
      milestoneId: milestone.id,
      uploadedCount: processedFiles.length,
      files: processedFiles.map((f) => ({
        filename: f.filename,
        storagePath: f.storagePath,
        sha256: f.sha256Hash,
        hasGps: f.hasGps,
        isBlurry: f.isBlurry,
      })),
    });
  } catch (error: any) {
    // Safe generic error logging without credential leakage
    console.error("[POST /api/proofs error]", error?.message || "Internal error");
    return NextResponse.json(
      { error: "Failed to upload proof evidence. Please try again." },
      { status: 500 }
    );
  }
}
