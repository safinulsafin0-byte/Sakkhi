import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { computeCampaignBalance } from "@/lib/ledger";
import { poishaToBdt, formatBdt } from "@/lib/config";
import { MilestoneTimeline } from "@/components/campaign/MilestoneTimeline";
import { DonationPanel } from "@/components/campaign/DonationPanel";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { HandUnderline } from "@/components/ui/HandUnderline";
import { TrustScoreCard } from "@/components/campaign/TrustScoreCard";
import { computeCampaignTrustScore } from "@/lib/trustScore";

export const dynamic = "force-dynamic";

interface CampaignPageProps {
  params: {
    id: string;
  };
}

// Generates dynamic SEO metadata for each campaign
export async function generateMetadata({ params }: CampaignPageProps): Promise<Metadata> {
  const { id } = params;
  const campaign = await prisma.campaign.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    select: { title: true, description: true, location: true },
  });

  if (!campaign) {
    return {
      title: "Campaign Not Found — Sakkhi",
      description: "The requested campaign could not be found.",
    };
  }

  return {
    title: `${campaign.title} — Sakkhi Verified Campaign`,
    description: campaign.description.slice(0, 160),
    openGraph: {
      title: `${campaign.title} — Witnessed Community Campaign`,
      description: `Transparency and milestone receipts for ${campaign.location}.`,
      type: "article",
    },
  };
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { id } = params;

  // Query campaign by either slug or cuid
  const campaign = await prisma.campaign.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: {
      coordinator: true,
      milestones: {
        orderBy: { order: "asc" },
        include: {
          assignedVolunteer: true,
          mediaFiles: true,
          certificates: true,
          verifications: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          payout: true,
        },
      },
      donations: {
        orderBy: { createdAt: "desc" },
        take: 6,
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  const balance = await computeCampaignBalance(campaign.id);
  const totalRaisedBdt = poishaToBdt(balance.netRaised);
  const targetBdt = poishaToBdt(campaign.targetAmount);
  const releasedBdt = poishaToBdt(balance.totalReleased);
  const reservedBdt = poishaToBdt(balance.totalReserved);
  const availableBdt = poishaToBdt(balance.availableBalance);

  const completedCount = campaign.milestones.filter((m) => m.status === "RELEASED").length;
  const totalCount = campaign.milestones.length;

  const trustData = computeCampaignTrustScore({
    targetAmount: campaign.targetAmount,
    milestones: campaign.milestones,
  });

  return (
    <div className="space-y-12 py-4 sm:py-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/" className="hover:text-terracotta underline-offset-4 hover:underline">
          Home
        </Link>
        <span>/</span>
        <Link href="/#campaigns" className="hover:text-terracotta underline-offset-4 hover:underline">
          Campaigns
        </Link>
        <span>/</span>
        <span className="text-ink font-medium truncate max-w-[200px] sm:max-w-md">
          {campaign.title}
        </span>
      </nav>

      {/* Campaign Header & Meta Strip */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="terracotta">Active Relief Effort</Badge>
          <span className="text-sm font-mono text-ink-muted flex items-center gap-1">
            <span aria-hidden="true">📍</span> {campaign.location}
          </span>
          <VerifiedBadge label="Double-Entry Witnessed" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-ink leading-[1.2]">
            {campaign.title}
          </h1>
          <HandUnderline className="max-w-[260px] sm:max-w-[380px] text-terracotta" />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted pt-1">
          <span>
            Led by Coordinator: <strong className="text-ink">{campaign.coordinator.name}</strong>
          </span>
          <span>•</span>
          <span>
            Progress: <strong className="text-forest">{completedCount} of {totalCount} Milestones Verified &amp; Paid</strong>
          </span>
        </div>
      </header>

      {/* Main Content Layout: Story + Timeline (Left) & Donation Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: 7 cols on desktop */}
        <div className="lg:col-span-7 space-y-12">
          {/* Financial Summary Card */}
          <Card className="p-6 sm:p-7 space-y-6 bg-paper-card border-border-soft">
            <div className="space-y-2">
              <ProgressBar
                current={totalRaisedBdt}
                target={targetBdt}
                currency="BDT"
                label="Community Funds Raised"
              />
            </div>

            {/* Micro Breakdown of Where Money Is */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border-soft/60 text-center">
              <div className="space-y-0.5">
                <span className="text-[11px] uppercase tracking-wider text-ink-muted font-mono block">
                  Disbursed / Paid
                </span>
                <span className="font-serif font-bold text-forest text-base sm:text-lg">
                  ৳{releasedBdt.toLocaleString()}
                </span>
                <span className="text-[10px] text-ink-faint block">100% receipt verified</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[11px] uppercase tracking-wider text-ink-muted font-mono block">
                  Earmarked in Escrow
                </span>
                <span className="font-serif font-bold text-amber text-base sm:text-lg">
                  ৳{reservedBdt.toLocaleString()}
                </span>
                <span className="text-[10px] text-ink-faint block">locked for active step</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[11px] uppercase tracking-wider text-ink-muted font-mono block">
                  Available in Pool
                </span>
                <span className="font-serif font-bold text-ink text-base sm:text-lg">
                  ৳{availableBdt.toLocaleString()}
                </span>
                <span className="text-[10px] text-ink-faint block">awaiting next milestone</span>
              </div>
            </div>
          </Card>

          {/* Story & Background Section */}
          <section className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-widest text-terracotta font-semibold">
                The Situation On The Ground
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                Campaign Story &amp; Context
              </h2>
            </div>
            <div className="prose prose-lg text-ink-muted leading-[1.8] space-y-4">
              <p>{campaign.description}</p>
              <p className="text-base">
                In this initiative, funds are never handed over in an untracked cash lump sum.
                The community relief team only unlocks funds when local vendors provide itemized
                vouchers, and field volunteers verify delivery with GPS-stamped photographs.
              </p>
            </div>
          </section>

          {/* Milestone Timeline Section */}
          <section className="space-y-6 pt-4">
            <div className="space-y-2 border-b border-border-soft pb-4">
              <span className="text-xs font-mono uppercase tracking-widest text-forest font-bold">
                Step-By-Step Proof Trail
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                Milestone Verification Timeline
              </h2>
              <p className="text-sm text-ink-muted">
                Each milestone requires specific verifiable proof items before funds are released.
                Click on any paid milestone below to inspect the real vendor receipt and AI forensic analysis.
              </p>
            </div>

            <MilestoneTimeline milestones={campaign.milestones} currency="BDT" />
          </section>

          {/* Recent Community Donors Feed */}
          {campaign.donations.length > 0 && (
            <section className="space-y-4 pt-4">
              <div className="space-y-1">
                <span className="text-xs font-mono uppercase tracking-widest text-ink-muted font-semibold">
                  Public Ledger
                </span>
                <h3 className="font-serif text-xl font-bold text-ink">
                  Recent Witnessed Contributions
                </h3>
              </div>

              <div className="divide-y divide-border-soft/60 rounded-xl border border-border-soft bg-paper-card overflow-hidden">
                {campaign.donations.map((donation) => (
                  <div
                    key={donation.id}
                    className="p-4 flex items-center justify-between gap-3 text-sm"
                  >
                    <div>
                      <strong className="text-ink font-semibold">
                        {donation.donorName || "Kind Neighbor"}
                      </strong>
                      <span className="text-xs text-ink-muted block">
                        {new Date(donation.createdAt).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-serif font-bold text-terracotta text-base">
                        ৳{poishaToBdt(donation.amount).toLocaleString()} BDT
                      </span>
                      {donation.amountUsdCents && (
                        <span className="text-[11px] text-ink-muted block font-mono">
                          (${ (donation.amountUsdCents / 100).toFixed(2) } USD)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: 5 cols on desktop (Sticky Donation Panel) */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <DonationPanel
            campaignId={campaign.id}
            campaignTitle={campaign.title}
            paypalClientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || ""}
            isLivePaypal={Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.PAYPAL_MODE === "sandbox")}
            isMockAi={(process.env.AI_PROVIDER || "mock").toLowerCase() === "mock"}
          />

          {/* Escrow & Integrity Assurance Card */}
          <Card className="p-5 bg-paper/70 border-border-soft space-y-3 text-xs text-ink-muted">
            <h4 className="font-serif font-semibold text-ink text-sm flex items-center gap-1.5">
              <span>🛡️</span> The Sakkhi Witness Guarantee
            </h4>
            <ul className="space-y-2 leading-relaxed">
              <li>
                <strong>No Unverified Cash-Outs:</strong> If a milestone fails photo or receipt verification, escrowed money is not released.
              </li>
              <li>
                <strong>Public Receipt Archive:</strong> Every receipt and voucher is timestamped and viewable by any donor worldwide.
              </li>
              <li>
                <strong>Zero Platform Fees:</strong> 100% of your contribution directly finances the documented milestone materials.
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
