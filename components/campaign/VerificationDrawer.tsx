"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { cn } from "@/lib/utils";

export interface DrawerVerificationData {
  milestoneTitle: string;
  milestoneOrder: number;
  verdict: string;
  confidence: number;
  provider: string;
  isDemoMode: boolean;
  humanSummary: string;
  checklist: Array<{ item: string; satisfied: boolean; evidence: string }>;
  redFlags: string[];
  overriddenBy?: string | null;
  overrideReason?: string | null;
  overrideVerdict?: string | null;
}

interface VerificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: DrawerVerificationData | null;
}

export const VerificationDrawer: React.FC<VerificationDrawerProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-paper h-full shadow-2xl flex flex-col justify-between border-l border-border-soft overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-border-soft pb-4">
            <div className="space-y-1">
              <span className="font-mono text-xs uppercase tracking-widest text-forest font-bold">
                Integrity &amp; Witness Audit
              </span>
              <h2 id="drawer-title" className="font-serif text-2xl font-bold text-ink">
                Why was this verified?
              </h2>
              <p className="text-xs text-ink-muted">
                Milestone #{data.milestoneOrder}: {data.milestoneTitle}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-paper-dark hover:bg-terracotta hover:text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
              aria-label="Close drawer"
            >
              ✕
            </button>
          </div>

          {/* Status & Confidence Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-paper-card border border-border-soft">
            <div className="flex items-center gap-2">
              {data.verdict === "approved" ? (
                <VerifiedBadge label="Forensically Verified" />
              ) : (
                <Badge variant="amber">{data.verdict.toUpperCase()}</Badge>
              )}
              {data.isDemoMode && (
                <span className="font-mono text-[10px] uppercase tracking-wider bg-paper-dark px-2 py-0.5 rounded text-ink-muted border border-border-soft">
                  Demo Mode (Mock)
                </span>
              )}
            </div>
            <div className="text-xs font-mono">
              Confidence: <strong className="text-forest">{(data.confidence * 100).toFixed(0)}%</strong>
            </div>
          </div>

          {/* Core Philosophy Banner */}
          <div className="p-4 rounded-xl border border-terracotta/30 bg-terracotta-soft/60 space-y-1 text-xs text-ink">
            <span className="font-serif font-bold text-terracotta block text-sm">
              🤝 Sakkhi Accountability Principle
            </span>
            <p className="leading-relaxed">
              &ldquo;AI helped check this. A person can always override it.&rdquo;
            </p>
          </div>

          {/* Auditor Finding Summary */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs uppercase tracking-wider font-semibold text-ink-muted">
              Auditor Witness Explanation
            </h3>
            <p className="text-sm text-ink leading-relaxed bg-paper-card p-4 rounded-xl border border-border-soft font-sans">
              &ldquo;{data.humanSummary}&rdquo;
            </p>
          </div>

          {/* Evidence Checklist Breakdown */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-wider font-semibold text-ink-muted">
              Checklist Items &amp; Evidence Observed
            </h3>
            <div className="space-y-2">
              {data.checklist.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-paper-card border border-border-soft space-y-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px]",
                        item.satisfied
                          ? "bg-forest/20 text-forest"
                          : "bg-terracotta/20 text-terracotta"
                      )}
                    >
                      {item.satisfied ? "✓" : "✗"}
                    </span>
                    <strong className="text-ink font-semibold">{item.item}</strong>
                  </div>
                  <p className="text-ink-muted pl-6 italic leading-relaxed">
                    Evidence: {item.evidence}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Red Flags Checked */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs uppercase tracking-wider font-semibold text-ink-muted">
              Forensic Red Flags &amp; Tamper Tests Checked
            </h3>
            <div className="p-3.5 rounded-xl bg-paper-card border border-border-soft text-xs space-y-2">
              {data.redFlags.length === 0 ? (
                <div className="flex items-center gap-2 text-forest font-medium">
                  <span>✓</span>
                  <span>Zero tampering detected: SHA-256 duplicate checks passed, EXIF sensor date verified, no quantization inpainting.</span>
                </div>
              ) : (
                <ul className="list-disc pl-4 space-y-1 text-terracotta">
                  {data.redFlags.map((flag, idx) => (
                    <li key={idx}>{flag}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Coordinator Override details if any */}
          {data.overriddenBy && (
            <div className="p-4 rounded-xl bg-paper-dark border border-border-soft space-y-1 text-xs">
              <span className="font-mono uppercase tracking-wider font-bold text-forest block">
                Human Review Override
              </span>
              <p className="text-ink">
                Coordinator reviewed and approved this evidence: &ldquo;{data.overrideReason}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-paper-dark border-t border-border-soft flex justify-end">
          <Button type="button" variant="secondary" size="md" onClick={onClose} className="w-full">
            Done Reading
          </Button>
        </div>
      </div>
    </div>
  );
};

