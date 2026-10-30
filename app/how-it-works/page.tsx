import type { Metadata } from "next";
import Link from "next/link";
import { HandUnderline } from "@/components/ui/HandUnderline";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "How It Works & Trust Model — Sakkhi",
  description:
    "An honest explanation of Sakkhi's milestone escrow, photo and receipt verification, and an open breakdown of what AI can and cannot verify.",
  openGraph: {
    title: "How Sakkhi Works — The Trust Model",
    description: "Milestone escrow, forensic receipt audits, and the honest limits of AI verification in community aid.",
    type: "article",
  },
};

export default function HowItWorksPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-16 py-6 sm:py-12">
      {/* Title & Introduction */}
      <section className="space-y-4 text-center sm:text-left">
        <div className="flex justify-center sm:justify-start">
          <VerifiedBadge label="Transparency & Accountability Manifesto" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-ink leading-[1.2]">
            How Sakkhi Works — And What It Actually Guarantees
          </h1>
          <HandUnderline className="max-w-[260px] sm:max-w-[360px] text-terracotta" />
        </div>

        <p className="text-lg sm:text-xl text-ink-muted leading-[1.8] pt-2">
          Whenever a monsoon flood strikes Kurigram or a community school in Khulna needs books,
          thousands of generous people want to help. But too often, donations vanish into private personal
          mobile wallets, leaving donors wondering whether their taka ever reached a family in need.
        </p>

        <p className="text-base sm:text-lg text-ink-muted leading-[1.8]">
          <strong className="text-ink">Sakkhi (সাক্ষী) means &ldquo;The Witness.&rdquo;</strong> We built this
          platform on a simple belief: trust isn&apos;t built on emotional marketing stories, but on verifiable,
          grounded evidence that any community member can inspect.
        </p>
      </section>

      {/* The 3 Pillars of Sakkhi */}
      <section className="space-y-8">
        <div className="space-y-1">
          <span className="text-xs font-mono uppercase tracking-widest text-terracotta font-semibold">
            System Architecture
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
            The Three Pillars of Sakkhi
          </h2>
        </div>

        <div className="space-y-6">
          {/* Pillar 1 */}
          <Card className="p-6 sm:p-7 space-y-3 bg-paper-card border-border-soft">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-terracotta text-white font-serif font-bold text-sm">
                1
              </span>
              <h3 className="font-serif text-xl font-bold text-ink">
                Milestone Escrow (No Blind Lump Sums)
              </h3>
            </div>
            <p className="text-base text-ink-muted leading-[1.7]">
              In conventional fundraising, organizers collect 500,000 BDT in a lump sum and promise to
              report back months later. With Sakkhi, campaigns are divided into concrete, itemized
              milestones (e.g. &ldquo;Emergency Boat Fuel&rdquo;, &ldquo;Dry Rations&rdquo;).
              Money donated is locked in an immutable escrow pool. It is only released when that specific
              milestone is ready to be paid.
            </p>
          </Card>

          {/* Pillar 2 */}
          <Card className="p-6 sm:p-7 space-y-3 bg-paper-card border-border-soft">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-forest text-white font-serif font-bold text-sm">
                2
              </span>
              <h3 className="font-serif text-xl font-bold text-ink">
                Field Evidence: Receipts, Photos &amp; Geotags
              </h3>
            </div>
            <p className="text-base text-ink-muted leading-[1.7]">
              When on-ground volunteers like Rahim or Salma purchase diesel at Chilmari Ghat, they
              photograph the paper cash memo, the loaded jerrycans, and the river boats.
              The camera&apos;s raw EXIF metadata captures the exact capture timestamp, device model,
              and GPS coordinates directly at the riverbank.
            </p>
          </Card>

          {/* Pillar 3 */}
          <Card className="p-6 sm:p-7 space-y-3 bg-paper-card border-border-soft">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-ink text-white font-serif font-bold text-sm">
                3
              </span>
              <h3 className="font-serif text-xl font-bold text-ink">
                Double-Entry Accounting &amp; Cryptographic Signatures
              </h3>
            </div>
            <p className="text-base text-ink-muted leading-[1.7]">
              Every contribution, reservation, and disbursement is entered into a double-entry ledger.
              The ledger mathematically guarantees that the campaign balance can never drop below zero.
              Once a milestone is verified, a unique cryptographic certificate code (e.g.
              <code className="text-xs font-mono bg-paper-dark px-1.5 py-0.5 rounded mx-1 text-ink">
                SKH-20261028-0042
              </code>
              ) is issued and permanently archived.
            </p>
          </Card>
        </div>
      </section>

      {/* Honest Section: What AI Can and Cannot Verify */}
      <section className="space-y-6 pt-4 border-t border-border-soft">
        <div className="space-y-2">
          <Badge variant="amber">Honest Reality Check</Badge>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
            What AI Can and Cannot Verify
          </h2>
          <p className="text-base text-ink-muted leading-relaxed">
            Many tech products claim AI will magically eliminate all fraud. We prefer total honesty:
            software can do several things exceptionally well, but human integrity remains indispensable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* What AI CAN Verify */}
          <div className="rounded-xl border border-forest/40 bg-forest-soft/60 p-6 space-y-4">
            <div className="flex items-center gap-2 text-forest">
              <span className="text-xl">✅</span>
              <h3 className="font-serif text-lg font-bold">
                What Our Pipeline CAN Verify
              </h3>
            </div>
            <ul className="space-y-2.5 text-sm text-ink leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-forest font-bold">•</span>
                <span>
                  <strong>Pixel &amp; Inpainting Tampering:</strong> Error Level Analysis (ELA) detects Photoshop edits, digitally modified price figures, or synthetic receipt text.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-forest font-bold">•</span>
                <span>
                  <strong>Duplicate Receipt Fraud:</strong> Perceptual hashing and SHA-256 fingerprinting ensure the same cash memo cannot be recycled across multiple campaigns.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-forest font-bold">•</span>
                <span>
                  <strong>EXIF &amp; GPS Coherence:</strong> Validates that the photo was genuinely taken at the designated relief site during the relevant dates.
                </span>
              </li>
            </ul>
          </div>

          {/* What AI CANNOT Verify */}
          <div className="rounded-xl border border-terracotta/30 bg-terracotta-soft/50 p-6 space-y-4">
            <div className="flex items-center gap-2 text-terracotta">
              <span className="text-xl">⚠️</span>
              <h3 className="font-serif text-lg font-bold">
                What AI CANNOT Verify
              </h3>
            </div>
            <ul className="space-y-2.5 text-sm text-ink leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-terracotta font-bold">•</span>
                <span>
                  <strong>Under-The-Table Kickbacks:</strong> AI cannot detect if a vendor agreed to write a receipt for 92,000 BDT but secretly refunded 15,000 BDT in cash behind the shed.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-terracotta font-bold">•</span>
                <span>
                  <strong>Hidden Material Defects:</strong> An image can show 100 jerrycans, but cannot verify whether the plastic meets true food-grade non-toxic standards.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-terracotta font-bold">•</span>
                <span>
                  <strong>Local Social Dynamics:</strong> True accountability requires community elders and affected families confirming that relief items actually reached them.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <Card className="p-5 bg-paper-dark/70 border-border-soft space-y-2 text-sm text-ink-muted">
          <p className="leading-relaxed">
            <strong className="text-ink">Our philosophy:</strong> We use AI and digital forensics to
            eliminate low-effort counterfeits, altered PDFs, and recycled images, allowing community organizers
            and local witnesses to focus on what matters: the human relationships and real people on the ground.
          </p>
        </Card>
      </section>

      {/* Call to Action */}
      <section className="text-center pt-8 space-y-4">
        <h3 className="font-serif text-2xl font-bold text-ink">
          Inspect Active Proof Trails
        </h3>
        <p className="text-base text-ink-muted max-w-md mx-auto">
          See the system in action on our live demo campaigns running on PayPal Sandbox.
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <Link href="/#campaigns">
            <Button size="lg" variant="primary">
              Explore Active Campaigns
            </Button>
          </Link>
          <Link href="/design">
            <Button size="lg" variant="secondary">
              Review Design System
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

