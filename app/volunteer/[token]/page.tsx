import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { verifyVolunteerToken } from "@/lib/auth";
import { poishaToBdt } from "@/lib/config";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { HandUnderline } from "@/components/ui/HandUnderline";
import { Button } from "@/components/ui/Button";
import { VolunteerProofUploader } from "@/components/volunteer/VolunteerProofUploader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Volunteer Field Workspace — Sakkhi",
  description: "Upload on-ground evidence, physical receipts, and GPS photos for assigned milestones.",
};

interface VolunteerPageProps {
  params: {
    token: string;
  };
}

export default async function VolunteerWorkspacePage({ params }: VolunteerPageProps) {
  const { token } = params;

  // 1. Verify signed volunteer JWT token
  const payload = await verifyVolunteerToken(token);

  if (!payload) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 text-center bg-paper-card border border-border-soft rounded-2xl space-y-4">
        <div className="w-12 h-12 rounded-full bg-terracotta-soft text-terracotta mx-auto flex items-center justify-center text-xl font-bold">
          ⚠️
        </div>
        <h2 className="font-serif text-2xl font-bold text-ink">
          Invite Link Expired or Invalid
        </h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          This volunteer access link is either invalid or has expired past its 7-day window.
          Please ask your campaign coordinator for a fresh volunteer link.
        </p>
        <div className="pt-2">
          <Link href="/">
            <Button variant="secondary" size="md">
              Return to Sakkhi Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 2. Fetch volunteer details and assigned milestones
  const volunteer = await prisma.user.findUnique({
    where: { id: payload.volunteerId },
  });

  const milestones = await prisma.milestone.findMany({
    where: { assignedVolunteerId: payload.volunteerId },
    include: {
      campaign: { select: { id: true, title: true, location: true, slug: true } },
      mediaFiles: true,
      certificates: true,
      verifications: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { order: "asc" },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-10 py-6 sm:py-10">
      {/* Header Banner */}
      <header className="space-y-3 border-b border-border-soft pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-terracotta font-semibold">
            Field Volunteer Workspace
          </span>
          <Badge variant="forest">Authenticated Access</Badge>
        </div>

        <div className="space-y-1">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
            Welcome, {volunteer?.name || payload.volunteerName}
          </h1>
          <HandUnderline className="max-w-[220px] text-terracotta" />
        </div>

        <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
          Here are your assigned community milestones. When you purchase relief supplies or distribute materials,
          take clear field photos and photos of your receipts to submit for verification.
        </p>
      </header>

      {/* Milestones List */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-ink">
            Your Assigned Milestones ({milestones.length})
          </h2>
        </div>

        {milestones.length === 0 ? (
          <Card className="p-8 text-center bg-paper-card border-border-soft space-y-2">
            <h3 className="font-serif text-lg font-bold text-ink">
              No milestones currently assigned
            </h3>
            <p className="text-sm text-ink-muted max-w-sm mx-auto">
              You are registered as a volunteer, but no active campaign milestones are assigned to your name yet.
            </p>
          </Card>
        ) : (
          milestones.map((milestone) => {
            const amountBdt = poishaToBdt(milestone.targetAmount);
            const isPaid = milestone.status === "RELEASED";
            const isSubmitted = milestone.status === "proof_submitted";

            let checklistItems: string[] = [];
            try {
              checklistItems = JSON.parse(milestone.proofChecklist);
            } catch {
              checklistItems = [milestone.proofChecklist];
            }

            return (
              <Card
                key={milestone.id}
                className="p-6 sm:p-8 space-y-6 bg-paper-card border-border-soft shadow-sm"
              >
                {/* Milestone Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-ink-muted font-semibold">
                        Campaign: {milestone.campaign.title}
                      </span>
                      {isPaid ? (
                        <VerifiedBadge label="Verified & Paid" />
                      ) : isSubmitted ? (
                        <Badge variant="amber">Proof Under Audit</Badge>
                      ) : (
                        <Badge variant="terracotta">Proof Required</Badge>
                      )}
                    </div>
                    <h3 className="font-serif text-2xl font-bold text-ink">
                      {milestone.title}
                    </h3>
                    <p className="text-xs text-ink-muted flex items-center gap-1">
                      <span>📍</span> {milestone.campaign.location}
                    </p>
                  </div>

                  <div className="text-left sm:text-right bg-paper px-3 py-2 rounded-lg border border-border-soft/60">
                    <span className="text-xs uppercase tracking-wider text-ink-muted block font-mono">
                      Milestone Budget
                    </span>
                    <span className="font-serif text-xl font-bold text-terracotta">
                      ৳{amountBdt.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-ink-muted block font-sans">
                      BDT
                    </span>
                  </div>
                </div>

                <p className="text-sm text-ink-muted leading-relaxed">
                  {milestone.description}
                </p>

                {/* Friendly Proof Checklist */}
                <div className="rounded-xl bg-paper p-4 border border-border-soft space-y-2">
                  <h4 className="font-mono text-xs uppercase tracking-wider font-semibold text-ink-muted">
                    Evidence Checklist — What to Upload
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {checklistItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="mt-0.5 text-forest font-bold">
                          {isPaid ? "✓" : "📷"}
                        </span>
                        <span className="text-ink">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Proof Uploader Component */}
                <VolunteerProofUploader
                  milestoneId={milestone.id}
                  milestoneTitle={milestone.title}
                  token={token}
                  initialStatus={milestone.status}
                  initialVerification={milestone.verifications[0] || null}
                />
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

