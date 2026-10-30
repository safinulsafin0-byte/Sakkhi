"use client";

import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { AmountInput } from "@/components/ui/AmountInput";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReceiptCard } from "@/components/ui/ReceiptCard";
import { HandUnderline } from "@/components/ui/HandUnderline";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DesignSystemPage() {
  // Only accessible in non-production environments
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="space-y-16 py-4 pb-20">
      {/* Intro */}
      <section className="space-y-4">
        <Badge variant="terracotta">Internal Design Manual</Badge>
        <div className="inline-block">
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-ink">
            Sakkhi Design System
          </h1>
          <HandUnderline className="max-w-[280px] sm:max-w-[340px]" />
        </div>
        <p className="text-lg text-ink-muted leading-[1.7] max-w-2xl pt-2">
          Grounded, honest, and warm. Designed with unbleached paper tones, Bengali terracotta, deep ink, and generous whitespace. Every tap target is at least 44px and focus rings are always distinct.
        </p>
      </section>

      {/* Colors */}
      <section className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Color Palette</h2>
          <HandUnderline className="max-w-[150px]" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border-soft p-4 bg-paper shadow-sm">
            <div className="h-14 rounded-lg bg-paper border border-border-soft mb-2" />
            <p className="font-medium text-sm text-ink">Paper (Canvas)</p>
            <p className="text-xs text-ink-muted">#fbf9f5</p>
          </div>

          <div className="rounded-xl border border-border-soft p-4 bg-paper shadow-sm">
            <div className="h-14 rounded-lg bg-paper-card border border-border-soft mb-2" />
            <p className="font-medium text-sm text-ink">Paper Card</p>
            <p className="text-xs text-ink-muted">#ffffff</p>
          </div>

          <div className="rounded-xl border border-border-soft p-4 bg-paper shadow-sm">
            <div className="h-14 rounded-lg bg-paper-dark border border-border-soft mb-2" />
            <p className="font-medium text-sm text-ink">Paper Dark</p>
            <p className="text-xs text-ink-muted">#f3ede2</p>
          </div>

          <div className="rounded-xl border border-border-soft p-4 bg-paper shadow-sm">
            <div className="h-14 rounded-lg bg-ink mb-2" />
            <p className="font-medium text-sm text-ink">Deep Ink</p>
            <p className="text-xs text-ink-muted">#1f2421</p>
          </div>

          <div className="rounded-xl border border-border-soft p-4 bg-paper shadow-sm">
            <div className="h-14 rounded-lg bg-terracotta mb-2" />
            <p className="font-medium text-sm text-ink">Terracotta (Primary)</p>
            <p className="text-xs text-ink-muted">#b84c26</p>
          </div>

          <div className="rounded-xl border border-border-soft p-4 bg-paper shadow-sm">
            <div className="h-14 rounded-lg bg-terracotta-soft border border-terracotta/20 mb-2" />
            <p className="font-medium text-sm text-ink">Terracotta Soft</p>
            <p className="text-xs text-ink-muted">#f9ede8</p>
          </div>

          <div className="rounded-xl border border-border-soft p-4 bg-paper shadow-sm">
            <div className="h-14 rounded-lg bg-forest mb-2" />
            <p className="font-medium text-sm text-ink">Forest (Verified)</p>
            <p className="text-xs text-ink-muted">#2d6a4f</p>
          </div>

          <div className="rounded-xl border border-border-soft p-4 bg-paper shadow-sm">
            <div className="h-14 rounded-lg bg-forest-soft border border-forest/20 mb-2" />
            <p className="font-medium text-sm text-ink">Forest Soft</p>
            <p className="text-xs text-ink-muted">#edf6f1</p>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Typography Scale</h2>
          <HandUnderline className="max-w-[180px]" />
        </div>

        <Card className="space-y-6">
          <div className="space-y-1">
            <p className="text-xs font-mono uppercase text-ink-muted">Literata Serif — Display / Title</p>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink">
              Every taka, witnessed and accounted for.
            </h1>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-mono uppercase text-ink-muted">Literata Serif — Section Heading</p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-ink">
              Transparent flood relief for Sunamganj families
            </h2>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-mono uppercase text-ink-muted">Source Sans 3 — Standard Body (18px, Line-height 1.7)</p>
            <p className="font-sans text-lg text-ink leading-[1.7]">
              Community organizers post photographs of physical invoices, delivery vouchers, and on-ground relief distribution. Every upload is checked for metadata tampering, signed cryptographically, and linked to real funds.
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-mono uppercase text-ink-muted">Hind Siliguri — Bengali Script</p>
            <p className="font-bengali text-xl text-ink leading-relaxed">
              সাক্ষী একটি উন্মুক্ত স্বচ্ছতা প্ল্যাটফর্ম। প্রতিটি অনুদান এবং ব্যয়ের হিসাব প্রামাণ্য দলিলের সাথে সংরক্ষণ করা হয়।
            </p>
          </div>
        </Card>
      </section>

      {/* Interactive Buttons */}
      <section className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Buttons & Tap Targets</h2>
          <HandUnderline className="max-w-[210px]" />
          <p className="text-sm text-ink-muted mt-1">
            Always at least 44px high and wide for accessible touch interactions.
          </p>
        </div>

        <Card className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary">Primary Terracotta</Button>
            <Button variant="secondary">Secondary Outlined</Button>
            <Button variant="quiet">Quiet Text</Button>
            <Button variant="primary" disabled>Disabled State</Button>
          </div>

          <div className="pt-2 border-t border-border-soft flex flex-wrap items-center gap-4">
            <Button size="sm" variant="primary">Small (44px min)</Button>
            <Button size="md" variant="primary">Medium Default</Button>
            <Button size="lg" variant="primary">Large Hero Action</Button>
          </div>
        </Card>
      </section>

      {/* Badges */}
      <section className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Badges & Verification</h2>
          <HandUnderline className="max-w-[210px]" />
        </div>

        <Card className="flex flex-wrap items-center gap-4">
          <Badge variant="default">Default Neutral</Badge>
          <Badge variant="terracotta">Relief Campaign</Badge>
          <Badge variant="amber">Audit Pending</Badge>
          <Badge variant="forest">Ledger Synced</Badge>
          <VerifiedBadge label="Verified Witness" />
          <VerifiedBadge label="Tamper Clean" size="sm" />
        </Card>
      </section>

      {/* Amount Input */}
      <section className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Amount Input</h2>
          <HandUnderline className="max-w-[150px]" />
          <p className="text-sm text-ink-muted mt-1">
            Currency conversion switcher between BDT and USD with bold, readable digits.
          </p>
        </div>

        <Card className="max-w-xl">
          <AmountInput />
        </Card>
      </section>

      {/* Progress Bar */}
      <section className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Progress Bar</h2>
          <HandUnderline className="max-w-[140px]" />
        </div>

        <Card className="max-w-xl space-y-6">
          <ProgressBar
            current={9200}
            target={12000}
            currency="BDT"
            label="Clean Water Initiative Fund"
          />

          <ProgressBar
            current={250000}
            target={500000}
            currency="BDT"
            label="School Rebuilding Drive"
          />
        </Card>
      </section>

      {/* Receipt Card */}
      <section className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Receipt Card</h2>
          <HandUnderline className="max-w-[140px]" />
          <p className="text-sm text-ink-muted mt-1">
            Features a subtle 1-degree rotation, paper texture, and a dotted tear line.
          </p>
        </div>

        <div className="py-4">
          <ReceiptCard
            receiptCode="SKH-2026-0819"
            issuedAt="29 October 2026"
            amount="9,200"
            currency="BDT"
            purpose="Medicine & Oral Saline Packets"
            donorOrBeneficiary="Kurigram Relief Post #3"
            witnessHash="c839f10928374b01e3892019401928374a0194b129384fa6c8e392d3f019487c"
            items={[
              { label: "Voucher #", value: "VC-8842" },
              { label: "Auditor", value: "Community Volunteer Council" },
            ]}
          />
        </div>
      </section>

      {/* Empty State */}
      <section className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Empty State</h2>
          <HandUnderline className="max-w-[130px]" />
        </div>

        <Card>
          <EmptyState
            title="No disbursements waiting for review"
            description="All vouchers submitted by the field volunteers have been witnessed and verified against original receipts."
            action={<Button variant="secondary" size="sm">Upload New Voucher</Button>}
          />
        </Card>
      </section>

      {/* Skeleton */}
      <section className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Loading Skeletons</h2>
          <HandUnderline className="max-w-[170px]" />
        </div>

        <Card className="max-w-md space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="pt-2 flex gap-2">
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </Card>
      </section>
    </div>
  );
}
