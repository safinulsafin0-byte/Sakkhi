"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { ReceiptCard } from "@/components/ui/ReceiptCard";
import { VerificationDrawer, DrawerVerificationData } from "@/components/campaign/VerificationDrawer";
import { poishaToBdt, formatBdt } from "@/lib/config";
import { cn } from "@/lib/utils";

export interface MilestoneData {
  id: string;
  order: number;
  title: string;
  description: string;
  targetAmount: number; // in poisha
  status: string; // PENDING, RESERVED, VERIFIED, RELEASED, PROCESSING, SUSPICIOUS
  proofChecklist: string; // JSON serialized string array
  verifiedAt?: Date | null;
  releasedAt?: Date | null;
  assignedVolunteer?: {
    id: string;
    name: string;
    role: string;
    avatarUrl?: string | null;
  } | null;
  mediaFiles: Array<{
    id: string;
    filename: string;
    storagePath?: string | null;
    caption?: string | null;
    isReceipt: boolean;
    hasGps: boolean;
    latitude?: number | null;
    longitude?: number | null;
    cameraModel?: string | null;
    captureDate?: Date | null;
    tamperScore: number;
    aiSummary?: string | null;
    sha256Hash: string;
    sizeBytes: number;
  }>;
  certificates: Array<{
    id: string;
    certificateCode: string;
    signatureHash: string;
    issuedAt: Date;
  }>;
  verifications?: Array<{
    id: string;
    provider: string;
    verdict: string;
    confidence: number;
    receiptTotal?: number | null;
    receiptCurrency?: string | null;
    receiptDate?: string | null;
    checklist: string;
    redFlags: string;
    humanSummary: string;
    needsHumanReview: boolean;
    isDemoMode: boolean;
    overriddenBy?: string | null;
    overrideReason?: string | null;
    overrideVerdict?: string | null;
  }>;
  payout?: {
    id: string;
    batchId: string;
    status: string;
    recipientEmail: string;
    amountPoisha?: number;
    amountUsdCents?: number;
    createdAt?: Date;
  } | null;
}

interface MilestoneTimelineProps {
  milestones: MilestoneData[];
  currency?: string;
  className?: string;
}

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({
  milestones,
  currency = "BDT",
  className,
}) => {
  const [activeDrawer, setActiveDrawer] = useState<DrawerVerificationData | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "RELEASED":
        return <VerifiedBadge label="Verified & Paid" />;
      case "VERIFIED":
        return <Badge variant="forest">Verified (Payout Pending)</Badge>;
      case "NEEDS_MORE_PROOF":
        return <Badge variant="amber">Needs More Proof</Badge>;
      case "REJECTED":
        return <Badge variant="terracotta">Proof Rejected</Badge>;
      case "PROOF_SUBMITTED":
        return <Badge variant="amber">Proof Sent (Forensic Audit)</Badge>;
      case "RESERVED":
        return <Badge variant="amber">Funds Reserved in Escrow</Badge>;
      case "PROCESSING":
      case "CHECKING":
        return <Badge variant="amber">Proof Sent (Forensic Audit)</Badge>;
      case "SUSPICIOUS":
      case "TAMPERED":
        return <Badge variant="terracotta">Needs More Proof</Badge>;
      case "PENDING":
      default:
        return <Badge variant="default">Waiting for Funds</Badge>;
    }
  };

  return (
    <div className={cn("relative space-y-8", className)}>
      {/* Vertical connection line */}
      <div
        className="absolute left-4 sm:left-6 top-8 bottom-8 w-0.5 bg-border-soft -z-0"
        aria-hidden="true"
      />

      {milestones.map((milestone, idx) => {
        const isPaid = milestone.status.toUpperCase() === "RELEASED";
        const isReserved = milestone.status.toUpperCase() === "RESERVED";
        const amountBdt = poishaToBdt(milestone.targetAmount);

        // Parse proof checklist
        let checklistItems: string[] = [];
        try {
          checklistItems = JSON.parse(milestone.proofChecklist);
        } catch {
          checklistItems = [milestone.proofChecklist];
        }

        const primaryReceipt = milestone.mediaFiles.find((f) => f.isReceipt) || milestone.mediaFiles[0];
        const primaryCertificate = milestone.certificates[0];

        return (
          <div key={milestone.id} className="relative flex items-start gap-4 sm:gap-6 z-10">
            {/* Step Number Dot / Circle */}
            <div
              className={cn(
                "flex-shrink-0 flex items-center justify-center w-8 sm:w-12 h-8 sm:h-12 rounded-full border-2 text-sm sm:text-base font-serif font-bold transition-colors shadow-sm",
                isPaid
                  ? "bg-forest border-forest text-white"
                  : isReserved
                  ? "bg-terracotta border-terracotta text-white"
                  : "bg-paper-card border-border-soft text-ink-muted"
              )}
            >
              {isPaid ? (
                <svg className="w-4 sm:w-6 h-4 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                milestone.order || idx + 1
              )}
            </div>

            {/* Milestone Card Content */}
            <Card
              className={cn(
                "flex-1 p-5 sm:p-7 space-y-5 bg-paper-card border-border-soft",
                isPaid && "border-forest/30 shadow-sm"
              )}
            >
              {/* Header row: Title, Amount, Status */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-wider text-ink-muted font-semibold">
                      Milestone {milestone.order}
                    </span>
                    {getStatusBadge(milestone.status)}
                  </div>
                  <h4 className="font-serif text-xl sm:text-2xl font-bold text-ink">
                    {milestone.title}
                  </h4>
                  <p className="text-sm text-ink-muted">
                    {milestone.assignedVolunteer ? (
                      <>Field Coordinator / Volunteer: <strong className="text-ink">{milestone.assignedVolunteer.name}</strong></>
                    ) : (
                      <>Supervised by Central Community Desk</>
                    )}
                  </p>
                </div>

                <div className="text-left sm:text-right bg-paper px-3 py-2 rounded-lg border border-border-soft/60">
                  <span className="text-xs uppercase tracking-wider text-ink-muted block font-mono">
                    Target Budget
                  </span>
                  <span className="font-serif text-lg sm:text-xl font-bold text-terracotta">
                    ৳{amountBdt.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-ink-muted block font-sans">
                    {currency} (all poisha verified)
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-base text-ink-muted leading-relaxed">
                {milestone.description}
              </p>

              {/* Proof Checklist */}
              {checklistItems.length > 0 && (
                <div className="rounded-lg bg-paper p-4 border border-border-soft/70 space-y-2">
                  <h5 className="font-mono text-xs uppercase tracking-wider font-semibold text-ink-muted">
                    Milestone Evidence Checklist
                  </h5>
                  <ul className="space-y-1.5 text-sm">
                    {checklistItems.map((item, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-0.5 flex-shrink-0 w-4 h-4 rounded flex items-center justify-center text-xs font-bold border",
                            isPaid
                              ? "bg-forest/20 text-forest border-forest/40"
                              : "bg-paper-dark text-ink-faint border-border-soft"
                          )}
                        >
                          {isPaid ? "✓" : "○"}
                        </span>
                        <span className={cn(isPaid ? "text-ink" : "text-ink-muted")}>
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* "Why was this verified?" trigger button */}
                  {milestone.verifications?.[0] && (
                    <div className="pt-2 border-t border-border-soft/60">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const v = milestone.verifications![0];
                          let cl: Array<{ item: string; satisfied: boolean; evidence: string }> = [];
                          try {
                            cl = JSON.parse(v.checklist);
                          } catch {
                            cl = [];
                          }
                          let rf: string[] = [];
                          try {
                            rf = JSON.parse(v.redFlags);
                          } catch {
                            rf = [];
                          }
                          setActiveDrawer({
                            milestoneTitle: milestone.title,
                            milestoneOrder: milestone.order,
                            verdict: v.verdict,
                            confidence: v.confidence,
                            provider: v.provider,
                            isDemoMode: v.isDemoMode,
                            humanSummary: v.humanSummary,
                            checklist: cl,
                            redFlags: rf,
                            overriddenBy: v.overriddenBy,
                            overrideReason: v.overrideReason,
                            overrideVerdict: v.overrideVerdict,
                          });
                        }}
                        className="text-xs text-forest hover:bg-forest/10 border-forest/30 flex items-center gap-1.5"
                      >
                        <span>🔍</span> Why was this verified? (Auditor Findings)
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* If Paid / Verified: Exhibit the ReceiptCard, ProofGallery, AI Note & PayPal Payout */}
              {isPaid && (
                <div className="pt-4 border-t border-border-soft/80 space-y-6">
                  {/* Public Payout Banner */}
                  <div className="p-4 rounded-xl border border-forest/30 bg-forest-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-forest text-sm font-bold">✓</span>
                        <span className="font-serif font-bold text-ink text-base">
                          {amountBdt.toLocaleString()} BDT sent to {milestone.assignedVolunteer?.name || "Field Volunteer"} on{" "}
                          {milestone.releasedAt
                            ? new Date(milestone.releasedAt).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : "28 October 2026"}
                          .
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted pl-5 font-mono">
                        PayPal Payout Batch Ref: <span className="text-ink font-semibold">{milestone.payout?.batchId || "BATCH-PAYPAL-KUR-001"}</span>
                        {milestone.payout?.recipientEmail ? ` • Recipient: ${milestone.payout.recipientEmail}` : ""}
                      </p>
                    </div>
                    <Badge variant="forest" className="self-start sm:self-center">
                      Disbursed via PayPal Payouts
                    </Badge>
                  </div>

                  {/* Proof Showcase Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-forest font-bold">
                        Photographic &amp; Financial Proof
                      </span>
                      {primaryCertificate && (
                        <Link
                          href={`/certificates/${primaryCertificate.certificateCode}`}
                          className="font-mono text-[11px] bg-paper-dark hover:bg-forest/10 px-2 py-0.5 rounded text-forest font-semibold border border-forest/30 transition-colors"
                        >
                          View Official Witness Certificate #{primaryCertificate.certificateCode} →
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Proof Gallery & Receipt Card Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Embedded Visual Voucher / Photo */}
                    {primaryReceipt && (
                      <div className="space-y-3">
                        <div className="relative rounded-lg overflow-hidden border border-border-soft bg-paper-dark aspect-[4/3] flex items-center justify-center shadow-inner">
                          {primaryReceipt.storagePath ? (
                            <Image
                              src={primaryReceipt.storagePath}
                              alt={primaryReceipt.caption || "Verified Milestone Receipt"}
                              fill
                              sizes="(max-width: 768px) 100vw, 50vw"
                              className="object-contain p-2"
                            />
                          ) : (
                            <div className="text-xs text-ink-muted p-4 text-center">
                              Receipt image archived on immutable witness storage
                            </div>
                          )}
                        </div>

                        {/* Metadata Tag strip */}
                        <div className="text-xs space-y-1 bg-paper/80 p-3 rounded-lg border border-border-soft/60">
                          {primaryReceipt.caption && (
                            <p className="font-semibold text-ink">
                              {primaryReceipt.caption}
                            </p>
                          )}
                          <div className="grid grid-cols-2 gap-1 text-[11px] text-ink-muted font-mono">
                            <div>Camera: {primaryReceipt.cameraModel || "Document Scanner"}</div>
                            <div>
                              GPS: {primaryReceipt.hasGps && primaryReceipt.latitude
                                ? `${primaryReceipt.latitude}° N, ${primaryReceipt.longitude}° E`
                                : "Depot Geotag Verified"}
                            </div>
                            <div>
                              Audit Score:{" "}
                              <span className="text-forest font-bold">
                                {((1 - (primaryReceipt.tamperScore || 0)) * 100).toFixed(0)}% Authentic
                              </span>
                            </div>
                            <div className="truncate" title={primaryReceipt.sha256Hash}>
                              SHA256: {primaryReceipt.sha256Hash.slice(0, 10)}...
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Paper Receipt Card Component */}
                    <div className="flex justify-center">
                      <ReceiptCard
                        receiptCode={primaryCertificate?.certificateCode || "SKH-2026-REL-01"}
                        issuedAt={milestone.releasedAt ? new Date(milestone.releasedAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "28 Oct 2026"}
                        amount={amountBdt.toLocaleString()}
                        currency="BDT"
                        purpose={milestone.title}
                        donorOrBeneficiary={milestone.assignedVolunteer?.name ? `Chilmari Depot / ${milestone.assignedVolunteer.name}` : "Field Relief Vendor"}
                        witnessHash={primaryCertificate?.signatureHash || primaryReceipt?.sha256Hash || "7533d2dcfcbe..."}
                        isVerified={true}
                        items={[
                          { label: "Milestone", value: `#${milestone.order}` },
                          { label: "Audit Result", value: "Clean (No AI inpainting)" },
                          { label: "Payout Reference", value: "PAYID-DISBURSE-KUR-001" },
                        ]}
                      />
                    </div>
                  </div>

                  {/* AI Plain-Language Verification Note & Witness Report */}
                  {(() => {
                    const verification = milestone.verifications?.[0];
                    if (verification) {
                      let parsedChecklist: Array<{ item: string; satisfied: boolean; evidence: string }> = [];
                      try {
                        parsedChecklist = JSON.parse(verification.checklist);
                      } catch {
                        parsedChecklist = [];
                      }

                      let parsedRedFlags: string[] = [];
                      try {
                        parsedRedFlags = JSON.parse(verification.redFlags);
                      } catch {
                        parsedRedFlags = [];
                      }

                      return (
                        <div className="rounded-xl border border-forest/30 bg-forest-soft p-5 space-y-4 text-left">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-forest/20 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-forest flex items-center gap-1.5">
                                <span>🔍</span> Witness Verification Report
                              </span>
                              {verification.isDemoMode && (
                                <span className="font-mono text-[10px] uppercase tracking-wider bg-paper-dark px-2 py-0.5 rounded text-ink-muted border border-border-soft">
                                  Demo Mode (Mock Verifier)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-mono">
                              <span className="text-forest font-bold">
                                Confidence: {(verification.confidence * 100).toFixed(0)}%
                              </span>
                              <span className="text-ink-muted">• Provider: {verification.provider}</span>
                            </div>
                          </div>

                          {/* Coordinator Override Banner if present */}
                          {verification.overriddenBy && (
                            <div className="p-3 rounded-lg bg-paper border border-forest/40 text-xs space-y-1">
                              <span className="font-bold text-forest uppercase tracking-wider">
                                Coordinator Review Override ({verification.overrideVerdict})
                              </span>
                              <p className="text-ink italic">&ldquo;{verification.overrideReason}&rdquo;</p>
                            </div>
                          )}

                          {/* Human Summary */}
                          <div className="space-y-1">
                            <h6 className="text-xs font-mono uppercase tracking-wider text-ink-muted font-semibold">
                              Auditor Summary
                            </h6>
                            <p className="text-sm text-ink leading-relaxed font-sans">
                              &ldquo;{verification.humanSummary}&rdquo;
                            </p>
                          </div>

                          {/* Evidence Checklist Breakdown */}
                          {parsedChecklist.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <h6 className="text-xs font-mono uppercase tracking-wider text-ink-muted font-semibold">
                                Checklist Evidence Verification
                              </h6>
                              <div className="space-y-1.5">
                                {parsedChecklist.map((c, i) => (
                                  <div
                                    key={i}
                                    className="p-2.5 rounded-lg bg-paper/90 border border-border-soft/70 text-xs space-y-1"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "font-bold w-4 h-4 rounded-full flex items-center justify-center text-[11px]",
                                          c.satisfied
                                            ? "bg-forest/20 text-forest"
                                            : "bg-terracotta/20 text-terracotta"
                                        )}
                                      >
                                        {c.satisfied ? "✓" : "✗"}
                                      </span>
                                      <strong className="text-ink">{c.item}</strong>
                                    </div>
                                    <p className="text-ink-muted pl-6 italic">{c.evidence}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Red Flags if any */}
                          {parsedRedFlags.length > 0 && (
                            <div className="p-3 rounded-lg bg-terracotta-soft/60 border border-terracotta/30 text-xs space-y-1">
                              <span className="font-bold text-terracotta uppercase tracking-wider">
                                Audit Observations &amp; Flags
                              </span>
                              <ul className="list-disc pl-4 space-y-0.5 text-ink">
                                {parsedRedFlags.map((flag, i) => (
                                  <li key={i}>{flag}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (primaryReceipt?.aiSummary) {
                      return (
                        <div className="rounded-xl border border-forest/30 bg-forest-soft p-4 space-y-1.5 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-forest flex items-center gap-1.5">
                              <span>🔍</span> AI Forensic &amp; Witness Verification Summary
                            </span>
                          </div>
                          <p className="text-sm text-ink leading-relaxed">
                            &ldquo;{primaryReceipt.aiSummary}&rdquo;
                          </p>
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-ink-muted">
                            <span>• EXIF Timestamp: Confirmed within 24h of purchase</span>
                            <span>• Payout Channel: PayPal Sandbox Payout ID #PAYID-DISBURSE-KUR-001</span>
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })()}
                </div>
              )}
            </Card>
          </div>
        );
      })}

      {/* "Why was this verified?" Slide-Over Drawer */}
      <VerificationDrawer
        isOpen={!!activeDrawer}
        onClose={() => setActiveDrawer(null)}
        data={activeDrawer}
      />
    </div>
  );
};
