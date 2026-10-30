"use client";

import React, { useState } from "react";
import { TrustScoreBreakdown } from "@/lib/trustScore";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface TrustScoreCardProps {
  trustData: TrustScoreBreakdown;
  className?: string;
}

export const TrustScoreCard: React.FC<TrustScoreCardProps> = ({ trustData, className }) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);

  return (
    <div
      className={cn(
        "rounded-xl border border-forest/30 bg-forest-soft/70 p-4 sm:p-5 space-y-3 text-left transition-all",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-forest text-white font-serif font-bold text-xl shadow-sm flex-shrink-0">
            {trustData.score}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-forest font-bold">
                Witness Trust Score
              </span>
              <Badge variant="forest">{trustData.ratingLabel}</Badge>
            </div>
            <p className="text-xs text-ink-muted pt-0.5">
              Derived from {trustData.verifiedMilestonesCount} of {trustData.totalMilestonesCount} verified milestones with on-ground proof
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs font-semibold text-forest hover:text-forest/80 underline underline-offset-2 flex items-center gap-1 self-start sm:self-auto min-h-[44px] min-w-[44px] cursor-pointer"
        >
          {showDetails ? "Hide breakdown ↑" : "How is this calculated? ↓"}
        </button>
      </div>

      {/* Explanatory summary */}
      <p className="text-xs sm:text-sm text-ink leading-relaxed">
        {trustData.explanation}
      </p>

      {/* Expandable Breakdown of Explainable Metrics */}
      {showDetails && (
        <div className="pt-3 border-t border-forest/20 space-y-3 animate-in fade-in">
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted font-bold block">
            The Three Explainable Metrics Behind This Score:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-paper border border-border-soft space-y-0.5">
              <span className="text-ink-muted font-mono block">1. Proof Coverage</span>
              <strong className="text-forest text-base font-serif block">
                {trustData.percentReleasedWithProof}%
              </strong>
              <span className="text-[11px] text-ink-muted">
                of all disbursed money backed by itemized receipts
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-paper border border-border-soft space-y-0.5">
              <span className="text-ink-muted font-mono block">2. Turnaround Time</span>
              <strong className="text-ink text-base font-serif block">
                ~{trustData.avgHoursToDisbursement}h
              </strong>
              <span className="text-[11px] text-ink-muted">
                average time from field voucher upload to disbursement
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-paper border border-border-soft space-y-0.5">
              <span className="text-ink-muted font-mono block">3. Human Oversight</span>
              <strong className="text-terracotta text-base font-serif block">
                {trustData.humanOverridesCount} review{trustData.humanOverridesCount === 1 ? "" : "s"}
              </strong>
              <span className="text-[11px] text-ink-muted">
                audited and authorized by human campaign coordinator
              </span>
            </div>
          </div>

          <p className="text-[11px] text-ink-muted italic">
            *Unlike black-box AI scores, Sakkhi&apos;s Trust Score is calculated directly from open, verifiable ledger records.
          </p>
        </div>
      )}
    </div>
  );
};

