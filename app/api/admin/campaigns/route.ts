import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { bdtToPoisha } from "@/lib/config";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import { verifyCsrfOrigin } from "@/lib/csrf";

const milestoneSchema = z.object({
  title: z.string().min(2, "Milestone title is required"),
  description: z.string().min(5, "Milestone description is required"),
  targetAmountBdt: z.number().positive("Amount must be positive"),
  assignedVolunteerId: z.string().optional().or(z.literal("")),
  proofChecklist: z.array(z.string()).min(1, "At least one proof item is required"),
});

const createCampaignSchema = z.object({
  title: z.string().min(3, "Campaign title is required"),
  location: z.string().min(2, "Location is required"),
  description: z.string().min(10, "Description is required"),
  milestones: z.array(milestoneSchema).min(1, "At least one milestone is required"),
});

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = verifyCsrfOrigin(req);
    if (!csrfCheck.valid) {
      return NextResponse.json({ error: csrfCheck.reason || "CSRF check failed" }, { status: 403 });
    }

    const cookieStore = cookies();
    const adminToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

    if (!adminToken || !(await verifyAdminSessionToken(adminToken))) {
      return NextResponse.json({ error: "Unauthorized. Please log in as coordinator." }, { status: 401 });
    }

    const json = await req.json();
    const parsed = createCampaignSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, location, description, milestones } = parsed.data;

    // Get coordinator (e.g. first coordinator user)
    let coordinator = await prisma.user.findFirst({
      where: { role: "COORDINATOR" },
    });

    if (!coordinator) {
      coordinator = await prisma.user.create({
        data: {
          name: "Central Relief Coordinator",
          email: "coordinator@sakkhiai.org",
          role: "COORDINATOR",
        },
      });
    }

    // Slug generation
    const slugBase = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const slug = `${slugBase}-${nanoid(6)}`;

    // Total target amount is sum of milestones
    const totalTargetPoisha = milestones.reduce(
      (sum, m) => sum + bdtToPoisha(m.targetAmountBdt),
      0
    );

    const createdCampaign = await prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.create({
        data: {
          title,
          slug,
          location,
          description,
          targetAmount: totalTargetPoisha,
          currency: "BDT",
          status: "ACTIVE",
          coordinatorId: coordinator.id,
        },
      });

      for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        await tx.milestone.create({
          data: {
            campaignId: campaign.id,
            title: m.title,
            description: m.description,
            order: i + 1,
            targetAmount: bdtToPoisha(m.targetAmountBdt),
            status: "PENDING",
            assignedVolunteerId: m.assignedVolunteerId || null,
            proofChecklist: JSON.stringify(m.proofChecklist),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          campaignId: campaign.id,
          actor: coordinator.name,
          action: "CAMPAIGN_CREATED",
          details: JSON.stringify({
            title,
            milestoneCount: milestones.length,
            targetAmountPoisha: totalTargetPoisha,
          }),
        },
      });

      return campaign;
    });

    return NextResponse.json({ success: true, campaign: createdCampaign }, { status: 201 });
  } catch (error: any) {
    console.error("[Create campaign error]", error?.message || "Internal error");
    return NextResponse.json(
      { error: "Failed to create campaign. Please review input fields and try again." },
      { status: 500 }
    );
  }
}

