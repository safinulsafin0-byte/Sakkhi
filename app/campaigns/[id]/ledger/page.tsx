import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { poishaToBdt } from "@/lib/config";
import { computeCampaignBalance } from "@/lib/ledger";
import { LiveLedgerTable, LedgerRowData } from "@/components/campaign/LiveLedgerTable";
import { HandUnderline } from "@/components/ui/HandUnderline";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

export const dynamic = "force-dynamic";

interface LedgerPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: LedgerPageProps): Promise<Metadata> {
  const { id } = params;
  const campaign = await prisma.campaign.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { title: true, location: true },
  });

  return {
    title: campaign ? `Live Financial Ledger — ${campaign.title}` : "Campaign Ledger — Sakkhi",
    description: "Every taka in and out witnessed in an immutable double-entry public ledger.",
  };
}

export default async function CampaignLedgerPage({ params }: LedgerPageProps) {
  const { id } = params;

  const campaign = await prisma.campaign.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      coordinator: true,
      milestones: true,
      ledgerEntries: {
        orderBy: { createdAt: "asc" },
        include: {
          donation: { select: { donorName: true } },
          milestone: { select: { title: true, id: true } },
        },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  // Calculate live balances
  const balance = await computeCampaignBalance(campaign.id);
  const totalRaisedBdt = poishaToBdt(balance.netRaised);
  const totalReleasedBdt = poishaToBdt(balance.totalReleased);
  const totalReservedBdt = poishaToBdt(balance.totalReserved);
  const availableBdt = poishaToBdt(balance.availableBalance);

  // Compute running balance chronologically
  let runningPoisha = 0;
  const rowData: LedgerRowData[] = campaign.ledgerEntries.map((entry) => {
    switch (entry.type) {
      case "CREDIT_DONATION":
        runningPoisha += entry.amount;
        break;
      case "RELEASE_PAYMENT":
        runningPoisha -= entry.amount;
        break;
      case "REFUND":
        runningPoisha -= entry.amount;
        break;
      case "DISBURSEMENT_REVERSAL":
        runningPoisha += entry.amount;
        break;
      case "RESERVE_MILESTONE":
      default:
        // Reserves earmark funds but do not alter raw cash-in-bank running balance
        break;
    }

    return {
      id: entry.id,
      createdAt: entry.createdAt.toISOString(),
      type: entry.type,
      amountPoisha: entry.amount,
      runningBalancePoisha: Math.max(0, runningPoisha),
      description: entry.description,
      idempotencyKey: entry.idempotencyKey,
      donationDonorName: entry.donation?.donorName || null,
      milestoneTitle: entry.milestone?.title || null,
      milestoneId: entry.milestone?.id || null,
    };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6 sm:py-10">
      {/* Top Breadcrumb & Title */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/campaigns/${campaign.slug || campaign.id}`}
            className="text-sm font-medium text-ink-muted hover:text-terracotta flex items-center gap-1 transition-colors"
          >
            <span>←</span> Back to Campaign Overview
          </Link>
          <VerifiedBadge label="Double-Entry Immutable Audit Log" />
        </div>

        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-terracotta font-semibold">
            Transparency Ledger
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-ink">
            Live Financial Ledger: {campaign.title}
          </h1>
          <p className="text-base sm:text-lg text-ink-muted max-w-2xl font-sans">
            Every taka given, reserved, and disbursed is recorded here in real-time. No hidden deductions,
            no delayed quarterly reports.
          </p>
          <HandUnderline className="max-w-[280px] sm:max-w-[360px] text-terracotta" />
        </div>
      </div>

      {/* Summary Financial Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-paper-card border border-border-soft space-y-1">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-muted block">
            Net Raised In
          </span>
          <span className="font-serif text-2xl font-bold text-forest">
            ৳{totalRaisedBdt.toLocaleString()}
          </span>
          <span className="text-xs text-ink-muted block">all verified donor taka</span>
        </div>

        <div className="p-4 rounded-xl bg-paper-card border border-border-soft space-y-1">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-muted block">
            Disbursed Out
          </span>
          <span className="font-serif text-2xl font-bold text-terracotta">
            ৳{totalReleasedBdt.toLocaleString()}
          </span>
          <span className="text-xs text-ink-muted block">paid against receipts</span>
        </div>

        <div className="p-4 rounded-xl bg-paper-card border border-border-soft space-y-1">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-muted block">
            Earmarked in Escrow
          </span>
          <span className="font-serif text-2xl font-bold text-amber-700">
            ৳{totalReservedBdt.toLocaleString()}
          </span>
          <span className="text-xs text-ink-muted block">locked for active work</span>
        </div>

        <div className="p-4 rounded-xl bg-paper-card border border-border-soft space-y-1">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-muted block">
            Unallocated Available
          </span>
          <span className="font-serif text-2xl font-bold text-ink">
            ৳{availableBdt.toLocaleString()}
          </span>
          <span className="text-xs text-ink-muted block">ready for next milestone</span>
        </div>
      </div>

      {/* Live Table Component */}
      <LiveLedgerTable
        campaignTitle={campaign.title}
        campaignSlug={campaign.slug || campaign.id}
        currency={campaign.currency}
        initialEntries={rowData}
      />

      {/* Table Note */}
      <div className="p-4 rounded-xl bg-paper border border-border-soft/80 text-xs text-ink-muted space-y-1 font-sans">
        <p>
          <strong className="text-ink">Mathematical Guarantee:</strong> In accordance with double-entry accounting principles,
          the campaign&apos;s available cash balance can never drop below zero under any valid transaction. All transactions
          are cryptographically signed and exportable as standard CSV for independent scrutiny.
        </p>
      </div>
    </div>
  );
}

