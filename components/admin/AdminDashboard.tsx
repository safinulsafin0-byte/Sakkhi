"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { poishaToBdt } from "@/lib/config";
import { cn } from "@/lib/utils";

interface Volunteer {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedCount: number;
}

interface Campaign {
  id: string;
  slug: string;
  title: string;
  location: string;
  description: string;
  targetAmount: number;
  status: string;
  coordinator: { name: string };
  milestones: Array<{
    id: string;
    title: string;
    order: number;
    targetAmount: number;
    status: string;
    assignedVolunteer?: { name: string } | null;
  }>;
}

interface PendingVerification {
  id: string;
  milestoneId: string;
  verdict: string;
  confidence: number;
  humanSummary: string;
  checklist: string;
  redFlags: string;
  needsHumanReview: boolean;
  isDemoMode: boolean;
  provider: string;
  overriddenBy?: string | null;
  overrideReason?: string | null;
  overrideVerdict?: string | null;
  createdAt: Date;
  milestone: {
    title: string;
    targetAmount: number;
    campaign: { title: string };
    assignedVolunteer?: { name: string } | null;
  };
}

interface AdminDashboardProps {
  campaigns: Campaign[];
  volunteers: Volunteer[];
  pendingVerifications?: PendingVerification[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  campaigns,
  volunteers,
  pendingVerifications = [],
}) => {
  const router = useRouter();

  // Override State
  const [activeOverrideId, setActiveOverrideId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [isOverriding, setIsOverriding] = useState<boolean>(false);
  const [overrideMessage, setOverrideMessage] = useState<string | null>(null);

  // Invite Link State
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>(
    volunteers[0]?.id || ""
  );
  const [generatedInvite, setGeneratedInvite] = useState<{
    url: string;
    volunteerName: string;
  } | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  // Create Campaign State
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignLocation, setCampaignLocation] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [milestones, setMilestones] = useState([
    {
      title: "Initial Relief Supplies & Fuel",
      description: "Emergency provisions and transport fuel for the first wave of response.",
      targetAmountBdt: 50000,
      assignedVolunteerId: volunteers[0]?.id || "",
      checklistText: "Cash memo receipt from vendor\nGPS photos of loaded supplies",
    },
  ]);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);

  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.refresh();
  };

  const handleGenerateInvite = async () => {
    if (!selectedVolunteerId) return;
    setIsGeneratingInvite(true);
    setCopied(false);

    try {
      const res = await fetch("/api/admin/invite-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerId: selectedVolunteerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate link");

      setGeneratedInvite({
        url: data.inviteUrl,
        volunteerName: data.volunteerName,
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddMilestone = () => {
    setMilestones([
      ...milestones,
      {
        title: "",
        description: "",
        targetAmountBdt: 30000,
        assignedVolunteerId: volunteers[0]?.id || "",
        checklistText: "Vendor invoice with totals\nDistribution day photo with geotag",
      },
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleCreateCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingCampaign(true);
    setCampaignError(null);

    try {
      const payload = {
        title: campaignTitle.trim(),
        location: campaignLocation.trim(),
        description: campaignDescription.trim(),
        milestones: milestones.map((m) => ({
          title: m.title.trim(),
          description: m.description.trim(),
          targetAmountBdt: Number(m.targetAmountBdt),
          assignedVolunteerId: m.assignedVolunteerId || undefined,
          proofChecklist: m.checklistText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        })),
      };

      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create campaign");

      setShowCreateCampaign(false);
      setCampaignTitle("");
      setCampaignLocation("");
      setCampaignDescription("");
      router.refresh();
    } catch (err: any) {
      setCampaignError(err.message || "An error occurred");
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const handleOverride = async (verificationId: string, action: "approve" | "reject") => {
    if (!overrideReason || overrideReason.trim().length < 5) {
      alert("Please provide an explanatory reason of at least 5 characters for this override.");
      return;
    }

    setIsOverriding(true);
    setOverrideMessage(null);

    try {
      const res = await fetch("/api/admin/verifications/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationId,
          action,
          reason: overrideReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Override request failed");
      }

      setOverrideMessage(`Milestone verification successfully ${action}d by coordinator.`);
      setActiveOverrideId(null);
      setOverrideReason("");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to submit override");
    } finally {
      setIsOverriding(false);
    }
  };

  const handleDirectPayout = async (milestoneId: string) => {
    if (
      !confirm(
        "Are you sure you want to release these verified milestone funds to the volunteer via PayPal Payouts?"
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/payouts/${milestoneId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coordinatorOverrideReason: "Authorized direct coordinator release",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Disbursement failed");
      }

      alert(
        `✓ Payout batch #${data.batchId} successfully initiated for ${data.amountBdt} BDT (${data.amountUsd} USD) to ${data.recipientEmail}!`
      );
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to disburse payout");
    }
  };

  return (
    <div className="space-y-12 py-4">
      {/* Top Bar: Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-soft pb-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-terracotta font-semibold">
            Coordinator Portal
          </span>
          <h1 className="font-serif text-3xl font-bold text-ink">
            Admin &amp; Milestone Management
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setShowCreateCampaign(!showCreateCampaign)}
            variant="primary"
            size="md"
          >
            {showCreateCampaign ? "Close Form" : "+ Create New Campaign"}
          </Button>
          <Button
            type="button"
            onClick={handleLogout}
            variant="secondary"
            size="md"
          >
            Log Out
          </Button>
        </div>
      </div>

      {/* Volunteer Invite Links Generator Section */}
      <Card className="p-6 sm:p-7 bg-paper-card border-border-soft space-y-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎟️</span>
            <h2 className="font-serif text-2xl font-bold text-ink">
              Create Volunteer Invite Link
            </h2>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            Generate a secure, signed 7-day access token for on-ground field volunteers.
            Volunteers open their link directly without needing a password to upload field proofs and cash memos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-2">
          <div className="flex-1 space-y-1">
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Select Field Volunteer
            </label>
            <select
              value={selectedVolunteerId}
              onChange={(e) => setSelectedVolunteerId(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-border-soft bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
            >
              {volunteers.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.email}) — {v.assignedCount} milestones assigned
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            onClick={handleGenerateInvite}
            disabled={isGeneratingInvite || !selectedVolunteerId}
            variant="primary"
            size="md"
            className="min-h-[44px]"
          >
            {isGeneratingInvite ? "Generating..." : "Generate Signed Link"}
          </Button>
        </div>

        {/* Display Generated Invite Link */}
        {generatedInvite && (
          <div className="rounded-xl border border-forest/30 bg-forest-soft p-4 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-semibold text-forest">
              <span>Signed Volunteer Access Link for {generatedInvite.volunteerName} (Valid for 7 days)</span>
              <span>Single-click Access</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedInvite.url}
                className="flex-1 font-mono text-xs px-3 py-2 bg-white rounded-lg border border-forest/30 text-ink select-all"
              />
              <Button
                type="button"
                onClick={handleCopyLink}
                variant="secondary"
                size="sm"
                className="min-h-[38px] px-4 font-semibold"
              >
                {copied ? "Copied! ✓" : "Copy"}
              </Button>
            </div>
            <p className="text-[11px] text-ink-muted">
              Share this link with {generatedInvite.volunteerName} via WhatsApp, SMS, or Email.
              When they tap it, they see only their assigned milestones and camera upload buttons.
            </p>
          </div>
        )}
      </Card>

      {/* Create Campaign Modal / Collapsible Form */}
      {showCreateCampaign && (
        <Card className="p-6 sm:p-8 bg-paper-card border-terracotta/30 space-y-6 shadow-md animate-in fade-in">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-widest text-terracotta font-semibold">
              New Initiative
            </span>
            <h2 className="font-serif text-2xl font-bold text-ink">
              Create Campaign with Milestone Proof Checklists
            </h2>
          </div>

          {campaignError && (
            <div className="p-3 bg-terracotta-soft text-terracotta text-sm rounded-lg border border-terracotta/30">
              {campaignError}
            </div>
          )}

          <form onSubmit={handleCreateCampaignSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="e.g. Flood relief, Sunamganj"
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-border-soft bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Location / Char / Union
                </label>
                <input
                  type="text"
                  required
                  value={campaignLocation}
                  onChange={(e) => setCampaignLocation(e.target.value)}
                  placeholder="e.g. Tahirpur & Bishwambharpur, Sunamganj"
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-border-soft bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                Campaign Description &amp; Local Context
              </label>
              <textarea
                required
                rows={3}
                value={campaignDescription}
                onChange={(e) => setCampaignDescription(e.target.value)}
                placeholder="Explain the local emergency, how many families will be reached, and why evidence transparency is essential..."
                className="w-full px-3 py-2 rounded-lg border border-border-soft bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
              />
            </div>

            {/* Milestones Section */}
            <div className="space-y-4 pt-2 border-t border-border-soft">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-ink">
                  Milestones ({milestones.length})
                </h3>
                <Button
                  type="button"
                  onClick={handleAddMilestone}
                  variant="secondary"
                  size="sm"
                >
                  + Add Milestone
                </Button>
              </div>

              <div className="space-y-4">
                {milestones.map((milestone, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-border-soft bg-paper space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-terracotta">
                        Milestone #{idx + 1}
                      </span>
                      {milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMilestone(idx)}
                          className="text-xs text-ink-faint hover:text-terracotta"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-ink-muted uppercase">
                          Title
                        </label>
                        <input
                          type="text"
                          required
                          value={milestone.title}
                          onChange={(e) => {
                            const updated = [...milestones];
                            updated[idx].title = e.target.value;
                            setMilestones(updated);
                          }}
                          placeholder="e.g. Clean Water Jerrycans"
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-border-soft bg-paper-card text-sm text-ink"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-ink-muted uppercase">
                          Target Budget (BDT)
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={milestone.targetAmountBdt}
                          onChange={(e) => {
                            const updated = [...milestones];
                            updated[idx].targetAmountBdt = Number(e.target.value);
                            setMilestones(updated);
                          }}
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-border-soft bg-paper-card text-sm text-ink font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-ink-muted uppercase">
                          Assign Volunteer
                        </label>
                        <select
                          value={milestone.assignedVolunteerId}
                          onChange={(e) => {
                            const updated = [...milestones];
                            updated[idx].assignedVolunteerId = e.target.value;
                            setMilestones(updated);
                          }}
                          className="w-full min-h-[40px] px-2 py-1.5 rounded-lg border border-border-soft bg-paper-card text-sm text-ink"
                        >
                          <option value="">Unassigned</option>
                          {volunteers.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-ink-muted uppercase">
                          Description
                        </label>
                        <input
                          type="text"
                          required
                          value={milestone.description}
                          onChange={(e) => {
                            const updated = [...milestones];
                            updated[idx].description = e.target.value;
                            setMilestones(updated);
                          }}
                          placeholder="Short description of items to procure"
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-border-soft bg-paper-card text-sm text-ink"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-ink-muted uppercase">
                        Proof Checklist (One required item per line)
                      </label>
                      <textarea
                        rows={2}
                        value={milestone.checklistText}
                        onChange={(e) => {
                          const updated = [...milestones];
                          updated[idx].checklistText = e.target.value;
                          setMilestones(updated);
                        }}
                        placeholder="A photo of the receipt&#10;A GPS photo of delivery"
                        className="w-full px-3 py-1.5 rounded-lg border border-border-soft bg-paper-card text-xs text-ink font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                onClick={() => setShowCreateCampaign(false)}
                variant="secondary"
                size="md"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingCampaign}
                variant="primary"
                size="md"
              >
                {isCreatingCampaign ? "Creating..." : "Save Campaign & Milestones"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Pending Verifications / Human Review Queue */}
      {pendingVerifications.length > 0 && (
        <Card className="p-6 sm:p-7 bg-paper-card border-amber-300/60 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-soft pb-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-amber-700 font-bold">
                Auditor Escalations &amp; Human Review Queue
              </span>
              <h2 className="font-serif text-2xl font-bold text-ink">
                Milestones Needing Coordinator Review ({pendingVerifications.filter((v) => v.needsHumanReview && !v.overriddenBy).length})
              </h2>
            </div>
            <Badge variant="amber">Requires Coordinator Action</Badge>
          </div>

          {overrideMessage && (
            <div className="p-3 bg-forest-soft border border-forest/30 text-xs font-semibold text-forest rounded-lg">
              ✓ {overrideMessage}
            </div>
          )}

          <div className="space-y-4">
            {pendingVerifications.map((v) => {
              const isOverridden = !!v.overriddenBy;
              let redFlags: string[] = [];
              try {
                redFlags = JSON.parse(v.redFlags);
              } catch {
                redFlags = [];
              }

              return (
                <div
                  key={v.id}
                  className="p-5 rounded-xl border border-border-soft bg-paper space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            v.verdict === "approved"
                              ? "forest"
                              : v.verdict === "rejected"
                              ? "terracotta"
                              : "amber"
                          }
                        >
                          {v.verdict.toUpperCase()}
                        </Badge>
                        {v.isDemoMode && (
                          <span className="text-[10px] font-mono bg-paper-dark px-1.5 py-0.5 rounded border border-border-soft text-ink-muted">
                            Demo Mode
                          </span>
                        )}
                        <span className="text-xs font-mono text-ink-muted">
                          Confidence: {(v.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <h4 className="font-serif text-lg font-bold text-ink mt-1">
                        {v.milestone.title}
                      </h4>
                      <p className="text-xs text-ink-muted">
                        Campaign: {v.milestone.campaign.title} • Volunteer:{" "}
                        {v.milestone.assignedVolunteer?.name || "Unassigned"}
                      </p>
                    </div>

                    <div className="text-right text-xs font-mono text-ink-muted">
                      Target: ৳{poishaToBdt(v.milestone.targetAmount).toLocaleString()} BDT
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-sm text-ink leading-relaxed bg-paper-card p-3 rounded-lg border border-border-soft">
                    &ldquo;{v.humanSummary}&rdquo;
                  </p>

                  {/* Red flags */}
                  {redFlags.length > 0 && (
                    <div className="text-xs text-terracotta bg-terracotta-soft/50 p-2.5 rounded-lg border border-terracotta/20 space-y-0.5">
                      <strong className="block font-semibold">Flags Raised:</strong>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {redFlags.map((flag, idx) => (
                          <li key={idx}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Override controls */}
                  {isOverridden ? (
                    <div className="text-xs text-forest bg-forest-soft p-3 rounded-lg border border-forest/30 flex items-center justify-between">
                      <span>
                        Overridden as <strong>{v.overrideVerdict?.toUpperCase()}</strong> by {v.overriddenBy}: &ldquo;{v.overrideReason}&rdquo;
                      </span>
                      <Badge variant="forest">Resolved</Badge>
                    </div>
                  ) : activeOverrideId === v.id ? (
                    <div className="space-y-3 pt-2 border-t border-border-soft">
                      <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        Coordinator Decision Rationale (Recorded in Public AuditLog)
                      </label>
                      <textarea
                        rows={2}
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="e.g. Inspected physical paper receipt via video call. Authorized milestone release."
                        className="w-full px-3 py-2 rounded-lg border border-border-soft bg-paper text-xs text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setActiveOverrideId(null);
                            setOverrideReason("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="text-terracotta border-terracotta/50"
                          disabled={isOverriding}
                          onClick={() => handleOverride(v.id, "reject")}
                        >
                          {isOverriding ? "Processing..." : "Reject Evidence"}
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={isOverriding}
                          onClick={() => handleOverride(v.id, "approve")}
                        >
                          {isOverriding ? "Processing..." : "Approve & Release"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setActiveOverrideId(v.id);
                          setOverrideReason("");
                        }}
                      >
                        Override / Decide Manually →
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Campaigns Overview List */}
      <div className="space-y-6">
        <h2 className="font-serif text-2xl font-bold text-ink">
          Existing Campaigns ({campaigns.length})
        </h2>

        <div className="space-y-6">
          {campaigns.map((c) => (
            <Card
              key={c.id}
              className="p-6 sm:p-7 bg-paper-card border-border-soft space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border-soft pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="terracotta">{c.status}</Badge>
                    <span className="text-xs font-mono text-ink-muted">📍 {c.location}</span>
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-ink mt-1">
                    <Link
                      href={`/campaigns/${c.slug || c.id}`}
                      className="hover:text-terracotta transition-colors"
                    >
                      {c.title}
                    </Link>
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Coordinator: {c.coordinator?.name || "Central Relief Desk"}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs font-mono uppercase tracking-wider text-ink-muted block">
                    Target Budget
                  </span>
                  <span className="font-serif text-xl font-bold text-terracotta">
                    ৳{poishaToBdt(c.targetAmount).toLocaleString()} BDT
                  </span>
                </div>
              </div>

              {/* Milestones status pill strip */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block font-mono">
                  Milestones
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {c.milestones.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border border-border-soft bg-paper space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-ink">#{m.order}</span>
                        {m.status === "RELEASED" ? (
                          <VerifiedBadge label="Paid" />
                        ) : m.status === "VERIFIED" ? (
                          <Badge variant="forest">Verified</Badge>
                        ) : m.status === "proof_submitted" ? (
                          <Badge variant="amber">Proof Sent</Badge>
                        ) : (
                          <Badge variant="default">{m.status}</Badge>
                        )}
                      </div>
                      <p className="font-semibold text-ink truncate">{m.title}</p>
                      <p className="text-ink-muted">৳{poishaToBdt(m.targetAmount).toLocaleString()} BDT</p>
                      {m.assignedVolunteer && (
                        <p className="text-[11px] text-forest font-medium">
                          👤 {m.assignedVolunteer.name}
                        </p>
                      )}
                      {m.status === "VERIFIED" && (
                        <div className="pt-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            className="w-full text-[11px] py-1 h-7"
                            onClick={() => handleDirectPayout(m.id)}
                          >
                            Release Payout →
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

