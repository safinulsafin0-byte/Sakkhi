import type { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coordinator Admin Portal — Sakkhi",
  description: "Manage transparent campaigns, milestones, and volunteer invite links.",
};

export default async function AdminPage() {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  const isAuthenticated = token ? await verifyAdminSessionToken(token) : false;

  if (!isAuthenticated) {
    return <AdminLoginForm />;
  }

  // Fetch campaigns
  const campaigns = await prisma.campaign.findMany({
    include: {
      coordinator: { select: { name: true } },
      milestones: {
        orderBy: { order: "asc" },
        include: {
          assignedVolunteer: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch volunteers
  const rawVolunteers = await prisma.user.findMany({
    where: { role: "VOLUNTEER" },
    include: {
      assignedMilestones: { select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  const volunteers = rawVolunteers.map((v) => ({
    id: v.id,
    name: v.name,
    email: v.email,
    role: v.role,
    assignedCount: v.assignedMilestones.length,
  }));

  // Fetch verifications needing human review
  const pendingVerifications = await prisma.verification.findMany({
    include: {
      milestone: {
        include: {
          campaign: { select: { title: true } },
          assignedVolunteer: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminDashboard
      campaigns={campaigns}
      volunteers={volunteers}
      pendingVerifications={pendingVerifications}
    />
  );
}

