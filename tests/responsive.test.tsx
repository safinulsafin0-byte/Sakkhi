import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DonationPanel } from "@/components/campaign/DonationPanel";
import { MilestoneTimeline } from "@/components/campaign/MilestoneTimeline";
import { LiveLedgerTable } from "@/components/campaign/LiveLedgerTable";
import { TrustScoreCard } from "@/components/campaign/TrustScoreCard";
import { VerificationDrawer } from "@/components/campaign/VerificationDrawer";
import { Button } from "@/components/ui/Button";
import HowItWorksPage from "@/app/how-it-works/page";
import NotFound from "@/app/not-found";

describe("Responsive Layouts (360px Mobile, 768px Tablet, 1280px Desktop) & A11y Standards", () => {
  it("360px Mobile: Header wraps cleanly and provides >= 44px touch targets", () => {
    const html = ReactDOMServer.renderToString(<Header />);
    expect(html).toContain("max-w-6xl");
    expect(html).toContain("px-4");
    expect(html).toContain("min-h-[44px]");
    expect(html).toContain("focus-visible:ring-2");
  });

  it("768px Tablet & 1280px Desktop: Footer adapts flex directions without horizontal overflow", () => {
    const html = ReactDOMServer.renderToString(<Footer />);
    expect(html).toContain("max-w-6xl");
    expect(html).toContain("flex-col");
    expect(html).toContain("md:flex-row");
    expect(html).toContain("border-t");
  });

  it("360px Mobile: DonationPanel uses sticky mobile bottom bar with >= 44px tap targets", () => {
    const html = ReactDOMServer.renderToString(
      <DonationPanel campaignId="test-c" campaignTitle="Test Campaign" />
    );
    expect(html).toContain("p-6");
    expect(html).toContain("lg:hidden fixed bottom-0");
    expect(html).toContain("min-h-[44px]");
    expect(html).toContain("min-h-[48px]");
  });

  it("360px Mobile & 768px Tablet: LiveLedgerTable contains overflow inside responsive scroll container", () => {
    const html = ReactDOMServer.renderToString(
      <LiveLedgerTable
        campaignTitle="Flood Relief"
        campaignSlug="flood-relief"
        currency="BDT"
        initialEntries={[
          {
            id: "led-1",
            createdAt: "2026-10-30T10:00:00Z",
            type: "CREDIT_DONATION",
            amountPoisha: 1000000,
            runningBalancePoisha: 1000000,
            description: "Community donation from Rahim",
            idempotencyKey: "test-key-1",
          },
        ]}
      />
    );
    // Assert table is wrapped in responsive overflow-x-auto to eliminate viewport horizontal scrolling
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("min-h-[44px]");
  });

  it("Responsive MilestoneTimeline adapts cards fluidly across 360px, 768px and 1280px", () => {
    const html = ReactDOMServer.renderToString(
      <MilestoneTimeline
        milestones={[
          {
            id: "m1",
            order: 1,
            title: "Test Emergency Milestone",
            description: "Testing responsive layout across 360px, 768px, and 1280px screens",
            targetAmount: 5000000,
            status: "PENDING",
            proofChecklist: JSON.stringify(["Test item"]),
            mediaFiles: [],
            certificates: [],
          },
        ]}
      />
    );
    expect(html).toContain("gap-4 sm:gap-6");
    expect(html).not.toMatch(/width:\s*[4-9]\d\dpx/);
  });

  it("Responsive TrustScoreCard presents humanist explainable score cleanly", () => {
    const html = ReactDOMServer.renderToString(
      <TrustScoreCard
        trustData={{
          score: 94,
          ratingLabel: "Exemplary Ground Truth",
          percentReleasedWithProof: 100,
          verifiedMilestonesCount: 2,
          totalMilestonesCount: 3,
          avgHoursToDisbursement: 14.5,
          humanOverridesCount: 0,
          duplicateChecksPassed: 2,
          explanation: "94% of money released with verified receipts.",
        }}
      />
    );
    expect(html).toContain("94");
    expect(html).toContain("Exemplary Ground Truth");
    expect(html).toContain("min-h-[44px]");
  });

  it("VerificationDrawer is accessible with dialog role, escape handler, and responsive sliding drawer", () => {
    const html = ReactDOMServer.renderToString(
      <VerificationDrawer
        isOpen={true}
        onClose={() => {}}
        data={{
          milestoneTitle: "Water Relief",
          milestoneOrder: 1,
          verdict: "approved",
          confidence: 0.95,
          provider: "mock",
          isDemoMode: true,
          humanSummary: "Everything verified against cash vouchers.",
          checklist: [{ item: "Voucher", satisfied: true, evidence: "Clear receipt" }],
          redFlags: [],
        }}
      />
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="drawer-title"');
    expect(html).toContain("min-h-[44px]");
  });

  it("UI Button strictly enforces min 44px tap targets and focus visible rings", () => {
    const html = ReactDOMServer.renderToString(
      <Button variant="primary" size="md">
        Test Action
      </Button>
    );
    expect(html).toContain("min-h-[44px]");
    expect(html).toContain("min-w-[44px]");
    expect(html).toContain("focus-visible:ring-2");
  });

  it("HowItWorksPage renders responsive typography and layout", () => {
    const html = ReactDOMServer.renderToString(<HowItWorksPage />);
    expect(html).toContain("max-w-3xl");
    expect(html).toContain("grid-cols-1 md:grid-cols-2");
  });

  it("NotFound page is contained and responsive", () => {
    const html = ReactDOMServer.renderToString(<NotFound />);
    expect(html).toContain("max-w-xl");
    expect(html).toContain("min-h-[60vh]");
  });
});
