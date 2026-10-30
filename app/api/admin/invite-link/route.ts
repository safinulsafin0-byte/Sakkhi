import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminSessionToken,
  createVolunteerToken,
} from "@/lib/auth";
import { verifyCsrfOrigin } from "@/lib/csrf";

const inviteSchema = z.object({
  volunteerId: z.string().min(1, "volunteerId is required"),
});

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = verifyCsrfOrigin(req);
    if (!csrfCheck.valid) {
      return NextResponse.json({ error: csrfCheck.reason || "CSRF check failed" }, { status: 403 });
    }

    // Verify admin cookie
    const cookieStore = cookies();
    const adminToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

    if (!adminToken || !(await verifyAdminSessionToken(adminToken))) {
      return NextResponse.json({ error: "Unauthorized. Please log in as coordinator." }, { status: 401 });
    }

    const json = await req.json();
    const parsed = inviteSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "volunteerId is required" }, { status: 400 });
    }

    const { volunteerId } = parsed.data;

    const volunteer = await prisma.user.findUnique({
      where: { id: volunteerId },
    });

    if (!volunteer) {
      return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });
    }

    const token = await createVolunteerToken({
      volunteerId: volunteer.id,
      volunteerEmail: volunteer.email,
      volunteerName: volunteer.name,
    });

    const origin = req.nextUrl.origin || "http://localhost:3000";
    const inviteUrl = `${origin}/volunteer/${token}`;

    return NextResponse.json({
      success: true,
      token,
      inviteUrl,
      volunteerName: volunteer.name,
      volunteerEmail: volunteer.email,
    });
  } catch (error: any) {
    console.error("[Invite link error]", error?.message || "Internal error");
    return NextResponse.json({ error: "Failed to generate volunteer invite link. Please try again." }, { status: 500 });
  }
}

