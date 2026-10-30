import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { computeCampaignBalance } from "@/lib/ledger";
import { poishaToBdt } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { HandUnderline } from "@/components/ui/HandUnderline";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sakkhi — See where every taka goes",
  description:
    "Community aid, grassroots accountability, and tamper-verified donation milestones. Every taka witnessed on a double-entry ledger.",
  openGraph: {
    title: "Sakkhi — See where every taka goes",
    description: "Every taka, witnessed. Transparent grassroots campaigns with cryptographic forensic verification.",
    type: "website",
  },
};

export default async function HomePage() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      coordinator: true,
      milestones: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const campaignsWithBalance = await Promise.all(
    campaigns.map(async (c) => {
      try {
        const balance = await computeCampaignBalance(c.id);
        return { ...c, balance };
      } catch {
        return {
          ...c,
          balance: {
            totalDonated: 0,
            totalRefunded: 0,
            totalReserved: 0,
            totalReleased: 0,
            netRaised: 0,
            availableBalance: 0,
            currency: "BDT",
          },
        };
      }
    })
  );

  const recentlyVerified = await prisma.milestone.findMany({
    where: { status: "RELEASED" },
    include: {
      campaign: true,
      assignedVolunteer: true,
      mediaFiles: true,
      certificates: true,
    },
    orderBy: { releasedAt: "desc" },
    take: 4,
  });

  return (
    <div className="space-y-16 sm:space-y-24 py-4 sm:py-8">
      {/* 1. Hero Section */}
      <section className="space-y-8 text-center max-w-3xl mx-auto pt-4 sm:pt-8">
        <div className="flex justify-center">
          <VerifiedBadge label="Grassroots Community Witness Platform" />
        </div>

        <div className="inline-block space-y-2">
          <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-ink leading-[1.15]">
            See where every taka goes.
          </h1>
          <HandUnderline className="max-w-[280px] sm:max-w-[420px] mx-auto text-terracotta" />
        </div>

        {/* Honest 3-step vertical card layout */}
        <div className="space-y-4 pt-1 max-w-xl mx-auto">
          <p className="text-base sm:text-lg text-ink-muted text-center">
            Sakkhi links community giving to witnessed ground truth in three transparent steps:
          </p>

          <div className="space-y-3 text-left">
            {/* Step 1: Give */}
            <div className="flex items-start gap-4 p-4 rounded-xl border border-border-soft bg-paper-card shadow-sm hover:border-terracotta/40 transition-colors">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-terracotta text-white font-serif font-bold text-sm mt-0.5 shadow-sm">
                1
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-ink text-base sm:text-lg">
                  Give
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  Funds sit safely in escrow.
                </p>
              </div>
            </div>

            {/* Step 2: Prove */}
            <div className="flex items-start gap-4 p-4 rounded-xl border border-border-soft bg-paper-card shadow-sm hover:border-forest/40 transition-colors">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-forest text-white font-serif font-bold text-sm mt-0.5 shadow-sm">
                2
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-ink text-base sm:text-lg">
                  Prove
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  Volunteers submit vendor receipts and GPS field photos.
                </p>
              </div>
            </div>

            {/* Step 3: Release */}
            <div className="flex items-start gap-4 p-4 rounded-xl border border-border-soft bg-paper-card shadow-sm hover:border-ink/30 transition-colors">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-ink text-white font-serif font-bold text-sm mt-0.5 shadow-sm">
                3
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-ink text-base sm:text-lg">
                  Release
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  Forensic tamper analysis verifies the evidence before any taka is disbursed.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link href="#campaigns">
            <Button size="lg" variant="primary">
              View Active Campaigns
            </Button>
          </Link>
          <Link href="/how-it-works">
            <Button size="lg" variant="secondary">
              How the Trust Model Works
            </Button>
          </Link>
        </div>
      </section>

      {/* 2. Recently Verified Strip */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-border-soft pb-3">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-forest font-bold">
              Public Ledger Feed
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
              Recently Verified Milestones
            </h2>
          </div>
          <span className="text-xs text-ink-muted">
            Cryptographically audited by Sakkhi Witness Authority
          </span>
        </div>

        {recentlyVerified.length === 0 ? (
          <EmptyState
            title="No verified milestones yet"
            description="As on-ground volunteers submit receipts and GPS photos for review, approved releases will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentlyVerified.map((milestone) => {
              const amountBdt = poishaToBdt(milestone.targetAmount);
              const receipt = milestone.mediaFiles.find((m) => m.isReceipt) || milestone.mediaFiles[0];
              const cert = milestone.certificates[0];

              return (
                <Card
                  key={milestone.id}
                  className="p-5 bg-paper-card border-border-soft hover:border-forest/50 transition-colors flex flex-col sm:flex-row gap-4 items-start"
                >
                  {receipt?.storagePath && (
                    <div className="relative w-full sm:w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden border border-border-soft bg-paper-dark">
                      <Image
                        src={receipt.storagePath}
                        alt="Receipt preview"
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <VerifiedBadge label="Verified & Paid" />
                      <span className="font-serif font-bold text-terracotta text-lg">
                        ৳{amountBdt.toLocaleString()}
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-ink leading-snug">
                      {milestone.title}
                    </h3>

                    <p className="text-xs text-ink-muted">
                      Campaign:{" "}
                      <Link
                        href={`/campaigns/${milestone.campaign.slug || milestone.campaign.id}`}
                        className="font-medium text-ink hover:text-terracotta underline underline-offset-2"
                      >
                        {milestone.campaign.title}
                      </Link>
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-ink-muted">
                      {cert && (
                        <Link
                          href={`/certificates/${cert.certificateCode}`}
                          className="text-forest hover:underline font-bold"
                        >
                          Cert #{cert.certificateCode} →
                        </Link>
                      )}
                      {milestone.assignedVolunteer && (
                        <span>• Volunteer: {milestone.assignedVolunteer.name}</span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Active Campaigns Section */}
      <section id="campaigns" className="space-y-6 pt-4">
        <div className="space-y-2 text-left">
          <span className="text-xs font-mono uppercase tracking-widest text-terracotta font-semibold">
            Community Initiatives
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
            Active Verified Campaigns
          </h2>
          <p className="text-base sm:text-lg text-ink-muted max-w-2xl">
            Choose a campaign to see its complete milestone timeline, verified supplier receipts, and volunteer delivery logs.
          </p>
        </div>

        {campaignsWithBalance.length === 0 ? (
          <EmptyState
            title="No campaigns active right now"
            description="Our organizers are preparing new community campaigns with full milestone proof checklists."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {campaignsWithBalance.map((campaign) => {
              const totalRaisedBdt = poishaToBdt(campaign.balance.netRaised);
              const targetBdt = poishaToBdt(campaign.targetAmount);
              const completedMilestones = campaign.milestones.filter(
                (m) => m.status === "RELEASED"
              ).length;
              const totalMilestones = campaign.milestones.length;

              return (
                <Card
                  key={campaign.id}
                  className="p-6 sm:p-8 space-y-6 bg-paper-card border-border-soft hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Location & Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink-muted flex items-center gap-1 font-mono">
                        <span aria-hidden="true">📍</span> {campaign.location}
                      </span>
                      <Badge variant="terracotta">Active Relief</Badge>
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-2xl font-bold text-ink hover:text-terracotta transition-colors">
                      <Link href={`/campaigns/${campaign.slug || campaign.id}`}>
                        {campaign.title}
                      </Link>
                    </h3>

                    {/* Description Excerpt */}
                    <p className="text-base text-ink-muted leading-relaxed line-clamp-3">
                      {campaign.description}
                    </p>

                    {/* Financial Progress Bar */}
                    <div className="pt-2">
                      <ProgressBar
                        current={totalRaisedBdt}
                        target={targetBdt}
                        currency="BDT"
                        label="Community Witnessed Progress"
                      />
                    </div>

                    {/* Milestones and Coordinator Info */}
                    <div className="flex items-center justify-between text-xs text-ink-muted pt-2 border-t border-border-soft/60">
                      <span>
                        Milestones: <strong className="text-ink">{completedMilestones} of {totalMilestones} verified &amp; paid</strong>
                      </span>
                      <span>
                        Coordinator: <strong className="text-ink">{campaign.coordinator.name}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="pt-2">
                    <Link
                      href={`/campaigns/${campaign.slug || campaign.id}`}
                      className="block"
                    >
                      <Button variant="secondary" size="md" className="w-full">
                        View Milestone Timeline &amp; Proofs →
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
