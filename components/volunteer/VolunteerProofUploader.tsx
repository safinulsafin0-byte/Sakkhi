"use client";

import React, { useState, useRef, type ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { cn } from "@/lib/utils";

interface VerificationData {
  id: string;
  verdict: string;
  confidence: number;
  humanSummary: string;
  checklist: string | Array<{ item: string; satisfied: boolean; evidence: string }>;
  redFlags: string | string[];
  isDemoMode: boolean;
  provider: string;
  needsHumanReview: boolean;
}

interface VolunteerProofUploaderProps {
  milestoneId: string;
  milestoneTitle: string;
  token: string;
  initialStatus: string;
  initialVerification?: VerificationData | null;
}

export const VolunteerProofUploader: React.FC<VolunteerProofUploaderProps> = ({
  milestoneId,
  milestoneTitle,
  token,
  initialStatus,
  initialVerification,
}) => {
  const [status, setStatus] = useState<string>(initialStatus);
  const [verification, setVerification] = useState<VerificationData | null>(
    initialVerification || null
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [auditStep, setAuditStep] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState<boolean>(
    initialStatus === "PENDING" || initialStatus === "needs_more_proof" || !initialVerification
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setErrorMessage(null);

    // Max 6 files check
    if (selectedFiles.length + newFiles.length > 6) {
      setErrorMessage("You can upload a maximum of 6 photos per milestone.");
      return;
    }

    // Size & format checks
    for (const file of newFiles) {
      if (file.size > 8 * 1024 * 1024) {
        setErrorMessage(`"${file.name}" exceeds the 8 MB size limit.`);
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setErrorMessage(`"${file.name}" is not a supported format. Please use JPEG, PNG, or WebP.`);
        return;
      }
    }

    const updatedFiles = [...selectedFiles, ...newFiles];
    setSelectedFiles(updatedFiles);

    // Generate previews
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews([...previews, ...newPreviews]);
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    setPreviews(updatedPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setErrorMessage("Please select at least one photo or receipt.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setAuditStep("Uploading photos to secure storage...");

    const formData = new FormData();
    formData.append("milestoneId", milestoneId);
    formData.append("token", token);
    formData.append("notes", notes);
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      // Step 1: Upload files
      const uploadRes = await fetch("/api/proofs", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "Failed to submit evidence proof");
      }

      setAuditStep("Running forensic integrity audit & AI verification...");

      // Step 2: Trigger automated verification
      const verifyRes = await fetch("/api/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneId,
          volunteerNote: notes,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Verification pipeline failed");
      }

      setVerification(verifyData.verification);
      setStatus(verifyData.milestoneStatus || "proof_submitted");
      setSelectedFiles([]);
      setPreviews([]);
      setShowUploadForm(false);
      setIsSubmitting(false);
      setAuditStep(null);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during submission. Please try again.");
      setIsSubmitting(false);
      setAuditStep(null);
    }
  };

  // Helper to parse checklist
  const parsedChecklist = React.useMemo(() => {
    if (!verification?.checklist) return [];
    if (Array.isArray(verification.checklist)) return verification.checklist;
    try {
      return JSON.parse(verification.checklist as string);
    } catch {
      return [];
    }
  }, [verification]);

  // Helper to parse red flags
  const parsedRedFlags = React.useMemo(() => {
    if (!verification?.redFlags) return [];
    if (Array.isArray(verification.redFlags)) return verification.redFlags;
    try {
      return JSON.parse(verification.redFlags as string);
    } catch {
      return [];
    }
  }, [verification]);

  return (
    <div className="space-y-4 pt-2">
      {/* Verification Result Showcase if available */}
      {verification && (
        <div
          className={cn(
            "rounded-xl p-5 border space-y-4 text-left animate-in fade-in",
            verification.verdict === "approved"
              ? "bg-forest-soft border-forest/30"
              : verification.verdict === "rejected"
              ? "bg-terracotta-soft/60 border-terracotta/30"
              : "bg-paper-card border-amber-300"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft/60 pb-3">
            <div className="flex items-center gap-2">
              {verification.verdict === "approved" ? (
                <VerifiedBadge label="Proof Verified & Approved" />
              ) : verification.verdict === "rejected" ? (
                <Badge variant="terracotta">Proof Rejected</Badge>
              ) : (
                <Badge variant="amber">Needs More Proof</Badge>
              )}

              {verification.isDemoMode && (
                <span className="font-mono text-[10px] uppercase tracking-wider bg-paper-dark px-2 py-0.5 rounded text-ink-muted border border-border-soft">
                  Demo Mode (Mock Verifier)
                </span>
              )}
            </div>

            <span className="text-xs font-mono text-ink-muted">
              Audit Confidence: {(verification.confidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Human Summary */}
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-muted font-semibold block">
              Auditor Witness Finding
            </span>
            <p className="text-sm text-ink leading-relaxed">
              &ldquo;{verification.humanSummary}&rdquo;
            </p>
          </div>

          {/* Checklist Evidence Breakdown */}
          {parsedChecklist.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-ink-muted font-semibold block">
                Checklist Evidence Verification
              </span>
              <div className="space-y-1.5">
                {parsedChecklist.map((c: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-paper border border-border-soft/80 text-xs space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold",
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

          {/* Red flags if present */}
          {parsedRedFlags.length > 0 && (
            <div className="p-3 rounded-lg bg-terracotta-soft/70 border border-terracotta/30 text-xs space-y-1">
              <span className="font-bold text-terracotta uppercase tracking-wider block">
                Auditor Observations &amp; Missing Items:
              </span>
              <ul className="list-disc pl-4 space-y-0.5 text-ink">
                {parsedRedFlags.map((flag: string, idx: number) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Toggle form button if needs more proof or rejected */}
          {(verification.verdict === "needs_more_proof" || verification.verdict === "rejected") && (
            <div className="pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowUploadForm(!showUploadForm)}
              >
                {showUploadForm ? "Hide Upload Form" : "Upload Additional / Clearer Proof →"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Large Camera-Friendly Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-full min-h-[64px] p-5 rounded-xl border-2 border-dashed border-border-soft hover:border-terracotta bg-paper hover:bg-paper-dark/70 text-ink transition-colors flex flex-col sm:flex-row items-center justify-center gap-3 text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
            )}
          >
            <div className="w-12 h-12 rounded-full bg-terracotta-soft text-terracotta flex items-center justify-center text-2xl flex-shrink-0">
              📷
            </div>
            <div className="text-left space-y-0.5">
              <p className="font-serif font-semibold text-base text-ink">
                Take or Choose Field Photos &amp; Receipts
              </p>
              <p className="text-xs text-ink-muted">
                Tap here to open phone camera or gallery (JPEG, PNG, WebP • Max 8 MB each • Up to 6 photos)
              </p>
            </div>
          </button>

          {/* Selected Image Previews */}
          {previews.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-muted block uppercase tracking-wider">
                Ready to Upload ({selectedFiles.length} / 6)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {previews.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-lg overflow-hidden border border-border-soft aspect-[4/3] bg-paper-dark group"
                  >
                    <Image
                      src={src}
                      alt={`Preview ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 bg-ink/80 hover:bg-terracotta text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors shadow-sm min-h-[28px] min-w-[28px]"
                      title="Remove this photo"
                      aria-label={`Remove photo ${selectedFiles[idx]?.name || idx + 1}`}
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-ink/75 px-2 py-1 text-[10px] text-white truncate font-mono">
                      {selectedFiles[idx]?.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note Field */}
          <div>
            <label
              htmlFor={`notes-${milestoneId}`}
              className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1"
            >
              Field Notes / Vendor Contact (Optional)
            </label>
            <textarea
              id={`notes-${milestoneId}`}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bought from Chilmari Depot. Received 100L diesel and signed handover memo."
              className="w-full px-3 py-2 rounded-lg border border-border-soft bg-paper text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-terracotta"
            />
          </div>

          {/* Status / Step Banner during audit */}
          {auditStep && (
            <div className="p-3 bg-paper-dark rounded-lg border border-border-soft text-xs text-ink flex items-center gap-2">
              <span className="animate-spin text-terracotta">⏳</span>
              <span>{auditStep}</span>
            </div>
          )}

          {/* Friendly Error Alert */}
          {errorMessage && (
            <div className="rounded-xl border border-terracotta/30 bg-terracotta-soft/60 p-4 space-y-1 text-left animate-in fade-in">
              <p className="text-xs font-semibold text-terracotta uppercase tracking-wider">
                Upload Notice
              </p>
              <p className="text-xs text-ink leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || selectedFiles.length === 0}
            variant="primary"
            size="lg"
            className="w-full text-base font-semibold"
          >
            {isSubmitting
              ? "Submitting & Auditing Evidence..."
              : `Submit ${selectedFiles.length} Evidence Photo${selectedFiles.length === 1 ? "" : "s"}`}
          </Button>
        </form>
      )}
    </div>
  );
};
